import firestore from '@react-native-firebase/firestore';
import {
  setMessages,
  addNewMessage,
  addOlderMessages,
  updateChatStatus,
  updateUnreadCount,
} from '../store/chatSlice';

const PAGE_SIZE = 20;
import auth from "@react-native-firebase/auth";
import axios from 'axios';
export const getChatId = (userId1, userId2) => [userId1, userId2].sort().join('_');
const mapMessages = (snapshot) => snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

// ----------------------------------------------------------------------
// 🔹 Initial load — fetch latest 20 messages (newest → oldest)
// ----------------------------------------------------------------------
export const fetchInitialMessages = async (chatId, dispatch, cache = {}) => {
  // 🛑 If already cached, skip network
  if (cache[chatId]?.messages?.length) return cache[chatId].lastVisible;

  const snap = await firestore()
    .collection('chats')
    .doc(chatId)
    .collection('messages')
    .orderBy('sentOn', 'desc')
    .limit(PAGE_SIZE)
    .get();

  const messages = mapMessages(snap);
  const lastVisible = snap.docs[snap.docs.length - 1] || null;

  dispatch(
    setMessages({
      chatId,
      messages,
      lastVisible,
      hasMore: snap.size === PAGE_SIZE,
    })
  );

  return lastVisible;
};

// ----------------------------------------------------------------------
// 🔹 Pagination — fetch older messages
// ----------------------------------------------------------------------
export const fetchMoreMessages = async (chatId, lastVisible, dispatch) => {
  if (!lastVisible) return;

  const snap = await firestore()
    .collection('chats')
    .doc(chatId)
    .collection('messages')
    .orderBy('sentOn', 'desc')
    .startAfter(lastVisible)
    .limit(PAGE_SIZE)
    .get();

  const messages = mapMessages(snap);
  const newLastVisible = snap.docs[snap.docs.length - 1] || null;

  dispatch(
    addOlderMessages({
      chatId,
      messages,
      lastVisible: newLastVisible,
      hasMore: snap.size === PAGE_SIZE,
    })
  );

  return newLastVisible;
};

// ----------------------------------------------------------------------
// 🔹 Real-time listener — only new messages after initial load
// ----------------------------------------------------------------------
export const listenToMessages = (chatId, dispatch, latestSentOn = null) => {
  let firstSnapshot = true;

  let query = firestore()
    .collection('chats')
    .doc(chatId)
    .collection('messages')
    .orderBy('sentOn', 'desc');

  if (latestSentOn) query = query.startAfter(latestSentOn);

  const unsubscribe = query.onSnapshot((snapshot) => {
    // 🛡️ Ignore the initial snapshot to avoid duplicates
    if (firstSnapshot) {
      firstSnapshot = false;
      return;
    }

    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const msg = { id: change.doc.id, ...change.doc.data() };
        dispatch(addNewMessage({ chatId, message: msg }));
      }
    });
  });

  return unsubscribe;
};

// ----------------------------------------------------------------------
// 🔹 Chat creation / sending
// ----------------------------------------------------------------------

export const startChat = async (fromId, toId, text, senderUsername) => {
  const chatId = getChatId(fromId, toId);
  const ref = firestore().collection('chats').doc(chatId);

  // 1️⃣ Create or update chat document
  await ref.set(
    {
      participants: [fromId, toId],
      status: 'REQUESTED',
      requestedBy: fromId,
      acceptedBy: null,
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
      lastMessage: {
        text,
        from: fromId,
        sentOn: firestore.FieldValue.serverTimestamp(),
        status: 'UNREAD',
      },
    },
    { merge: true }
  );

  // 2️⃣ Add message to subcollection
  await ref.collection('messages').add({
    from: fromId,
    to: toId,
    text,
    type: 'MESSAGE',
    sentOn: firestore.FieldValue.serverTimestamp(),
  });

  // 3️⃣ Notify Cloud Function
   // 3️⃣ Send Cloud Function request
  try {
    console.log('Sending notification to Cloud Function...');
    const response = await axios.post(
      'https://us-central1-ahead-9fb4c.cloudfunctions.net/notifyMessageApi/send-message-notification',
      {
        receiverId: toId,
        senderId: fromId,
        senderUsername,
        message: text,
        chatId,
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000, // 10 seconds
      }
    );

    console.log('Cloud Function response:', response.data);
  } catch (error) {
    console.error(
      '❌ Failed to notify Cloud Function:',
      error.response?.data || error.message
    );
  }

  return chatId;
};

export const sendMessage = async (chatId, fromId, toId, text,senderUsername) => {
  const ref = firestore().collection('chats').doc(chatId);

  await ref.collection('messages').add({
    from: fromId,
    to: toId,
    text,
    type: 'MESSAGE',
    sentOn: firestore.FieldValue.serverTimestamp(),
  });

  await ref.update({
    lastMessage: {
      text,
      from: fromId,
      sentOn: firestore.FieldValue.serverTimestamp(),
      status:'UNREAD'
    },
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });
   // 3️⃣ Send Cloud Function request
  try {
    console.log('Sending notification to Cloud Function...');
    const response = await axios.post(
      'https://us-central1-ahead-9fb4c.cloudfunctions.net/notifyMessageApi/send-message-notification',
      {
        receiverId: toId,
        senderId: fromId,
        senderUsername,
        message: text,
        chatId,
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000, // 10 seconds
      }
    );

    console.log('Cloud Function response:', response.data);
  } catch (error) {
    console.error(
      '❌ Failed to notify Cloud Function:',
      error.response?.data || error.message
    );
  }
};

export const acceptChatRequest = async (chatId, userId) => {
  await firestore().collection('chats').doc(chatId).update({
    status: 'ACTIVE',
    acceptedBy: userId,
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });
};

export const rejectChatRequest = async (chatId) => {
  await firestore().collection('chats').doc(chatId).update({
    status: 'CLOSED',
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });
};

// ----------------------------------------------------------------------
// 🔹 Listen to chat status
// ----------------------------------------------------------------------
export const listenToChatStatus = (chatId, dispatch) => {
  return firestore()
    .collection('chats')
    .doc(chatId)
    .onSnapshot((doc) => {
      if (!doc.exists) {
        dispatch(updateChatStatus({ chatId, status: 'NEW' }));
        return;
      }

      const data = doc.data();
      dispatch(
        updateChatStatus({
          chatId,
          status: data?.status,
          requestedBy: data?.requestedBy,
          acceptedBy: data?.acceptedBy,
        })
      );
    });
};


export const listenToUnreadCount = (currentUserId, dispatch) => {
  console.log("[chat] Listening to unread messages for:", currentUserId);
  try {
    return firestore()
    .collection("chats")
    .where("participants", "array-contains", currentUserId)
    .onSnapshot((snapshot) => {
      let unreadCount = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        const lastMessage = data?.lastMessage;

        if (
          lastMessage?.status === "UNREAD" &&
          lastMessage?.from !== currentUserId
        ) {
          unreadCount += 1;
        }
      });
      console.log(unreadCount)
      dispatch(updateUnreadCount(unreadCount));
    });
  } catch (error) {
    console.warn(error)
  }
  // Listen to all chats where user is a participant (both accepted or requested)
  
};


export const markChatAsRead = async (chatId) => {
  const currentUserId = auth().currentUser?.uid;
  if (!currentUserId) return;

  const ref = firestore().collection("chats").doc(chatId);

  // Get the latest chat snapshot
  const chatDoc = await ref.get();
  if (!chatDoc.exists) return;

  const chatData = chatDoc.data();
  const lastMessage = chatData?.lastMessage;

  // ✅ Only mark as read if last message is from someone else
  if (lastMessage?.from && lastMessage.from !== currentUserId) {
    await ref.update({
      "lastMessage.status": "READ",
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
  }
};