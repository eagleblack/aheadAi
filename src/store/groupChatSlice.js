// groupChatSliceRealtime.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import firestore from "@react-native-firebase/firestore";
import auth from "@react-native-firebase/auth";

console.log("[groupChatSliceRealtime] loaded");

// ------------------------------------------------------
// 🔹 Helper: Cached user fetch
// ------------------------------------------------------
const fetchUserCached = async (uid, cache, dispatch) => {
  if (cache[uid]) return cache[uid];

  const doc = await firestore().collection("users").doc(uid).get();
  const data = doc.exists ? { uid, ...doc.data() } : { uid, name: "Unknown" };

  dispatch(updateUserCache({ uid, data }));
  return data;
};

// ------------------------------------------------------
// 🔹 Remove user from group (admin only)
// ------------------------------------------------------
export const removeUserFromGroup = createAsyncThunk(
  "groupChat/removeUserFromGroup",
  async ({ groupId, targetUid }, { rejectWithValue }) => {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) throw new Error("Not authenticated");

      const groupRef = firestore().collection("groups").doc(groupId);
      const groupSnap = await groupRef.get();
      if (!groupSnap.exists) throw new Error("Group not found");

      const groupData = groupSnap.data();
      if (groupData.adminId && groupData.adminId !== currentUser.uid) {
        throw new Error("Only the admin can remove users");
      }

      await groupRef.update({
        participants: firestore.FieldValue.arrayRemove(targetUid),
        memberCount: firestore.FieldValue.increment(-1),
      });

      console.log(`[removeUserFromGroup] Removed user ${targetUid} from ${groupId}`);
      return { groupId, targetUid };
    } catch (err) {
      console.error("[removeUserFromGroup] Error:", err);
      return rejectWithValue(err.message);
    }
  }
);

// ------------------------------------------------------
// 🔹 Fetch group (and initial 20 messages)
// ------------------------------------------------------
export const fetchGroupIfNeeded = createAsyncThunk(
  "groupChat/fetchGroupIfNeeded",
  async ({ groupId }, { getState, dispatch }) => {
    const state = getState().groupChat;
    const user = auth().currentUser;
    if (!user) throw new Error("Not authenticated");

    // ✅ Already loaded?
    const existingGroup = state.groups[groupId];
    if (existingGroup && existingGroup.messages?.length > 0) {
      console.log(`[fetchGroupIfNeeded] Skipped fetch — already have ${existingGroup.messages.length} messages`);
      return {
        group: state.joinedGroups.find((g) => g.id === groupId) ||
               state.discoverGroups.find((g) => g.id === groupId),
        isJoined: true,
        lastVisible: existingGroup.lastVisible || null,
      };
    }

    // ✅ Step 1: Load group metadata
    const cached =
      state.joinedGroups.find((g) => g.id === groupId) ||
      state.discoverGroups.find((g) => g.id === groupId);

    let group;
    if (cached) {
      group = cached;
    } else {
      const doc = await firestore().collection("groups").doc(groupId).get();
      if (!doc.exists) throw new Error("Group not found");
      group = { id: doc.id, ...doc.data() };
    }

    const isJoined = group.participants?.includes(user.uid);

    // ✅ Step 2: Load latest 20 messages initially
    const snap = await firestore()
      .collection("groupMessages")
      .doc(groupId)
      .collection("messages")
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    const cacheCopy = { ...state.userCache };
    const messages = await Promise.all(
      snap.docs.map(async (doc) => {
        const data = doc.data();
        const userDetails = await fetchUserCached(data.senderId, cacheCopy, dispatch);
        return { id: doc.id, ...data, user: userDetails };
      })
    );

    const lastVisible = snap.docs[snap.docs.length - 1] || null;

    // ✅ Step 3: Store messages + lastVisible
    dispatch(setMessages({ groupId, messages }));

    // ✅ Step 4: Store group in correct list
    if (isJoined) {
      const exists = state.joinedGroups.some((g) => g.id === group.id);
      if (!exists) dispatch(setJoinedGroups([...state.joinedGroups, group]));
    } else {
      const exists = state.discoverGroups.some((g) => g.id === group.id);
      if (!exists) dispatch(setDiscoverGroups([...state.discoverGroups, group]));
    }

    console.log(`[fetchGroupIfNeeded] Loaded initial ${messages.length} messages for ${groupId}`);

    return { group, isJoined, lastVisible };
  }
);

// ------------------------------------------------------
// 🔹 Subscribe to realtime updates (new messages)
// ------------------------------------------------------
export const subscribeToGroupMessages = createAsyncThunk(
  "groupChat/subscribeToGroupMessages",
  async ({ groupId }, { dispatch, getState }) => {
    const user = auth().currentUser;
    if (!user) throw new Error("Not authenticated");

    const state = getState().groupChat;
    const existingGroup = state.groups[groupId];

    if (existingGroup?.unsubscribe) {
      console.log("[subscribeToGroupMessages] Already subscribed:", groupId);
      return { groupId, unsubscribe: existingGroup.unsubscribe };
    }

    const groupSnap = await firestore().collection("groups").doc(groupId).get();
    if (!groupSnap.exists) throw new Error("Group not found");

    const group = groupSnap.data();
    if (!group.participants?.includes(user.uid)) {
      throw new Error("User not a member of this group");
    }

    const latestKnown = existingGroup?.messages?.[0];
    let query = firestore()
      .collection("groupMessages")
      .doc(groupId)
      .collection("messages")
      .orderBy("createdAt", "desc")
      .limit(20);

    if (latestKnown?.createdAt) {
      query = query.where("createdAt", ">", latestKnown.createdAt);
      console.log(`[subscribeToGroupMessages] Listening after ${latestKnown.createdAt.toDate?.()}`);
    }

    const unsubscribe = query.onSnapshot(
      async (snap) => {
        if (snap.empty) return;

        const stateNow = getState().groupChat;
        const currentMessages = stateNow.groups[groupId]?.messages || [];
        const cacheCopy = { ...stateNow.userCache };

        const newMessages = await Promise.all(
          snap.docs.map(async (doc) => {
            const data = doc.data();
            const userDetails = await fetchUserCached(data.senderId, cacheCopy, dispatch);
            return { id: doc.id, ...data, user: userDetails };
          })
        );

        // ✅ Merge new + old and dedupe
        const all = [...newMessages, ...currentMessages];
        const deduped = Array.from(new Map(all.map((m) => [m.id, m])).values());
        dispatch(setMessages({ groupId, messages: deduped }));
      },
      (err) => {
        console.error("[subscribeToGroupMessages:onSnapshot] Firestore error:", err.message);
      }
    );

    dispatch(attachUnsubscribe({ groupId, unsubscribe }));
    return { groupId, unsubscribe };
  }
);

// ------------------------------------------------------
// 🔹 Pagination: fetch older messages
// ------------------------------------------------------
export const fetchOlderMessages = createAsyncThunk(
  "groupChat/fetchOlderMessages",
  async ({ groupId }, { dispatch, getState }) => {
    const state = getState().groupChat;
    const groupState = state.groups[groupId];
  if (!groupState) {
      console.warn(`[fetchOlderMessages] No group state for ${groupId}`);
      return; // ✅ skip safely
    }

    if (!groupState.lastVisible) {
      console.warn(`[fetchOlderMessages] No lastVisible for ${groupId}`);
      return; // ✅ no pagination yet
    }
    const lastVisible = groupState.lastVisible;
    const cacheCopy = { ...state.userCache };

    const snap = await firestore()
      .collection("groupMessages")
      .doc(groupId)
      .collection("messages")
      .orderBy("createdAt", "desc")
      .startAfter(lastVisible) // ✅ FIXED: use snapshot, not field
      .limit(20)
      .get();

    const messages = await Promise.all(
      snap.docs.map(async (doc) => {
        const data = doc.data();
        const userDetails = await fetchUserCached(data.senderId, cacheCopy, dispatch);
        return { id: doc.id, ...data, user: userDetails };
      })
    );

    const newLastVisible = snap.docs[snap.docs.length - 1] || null;
    dispatch(addOlderMessages({ groupId, messages, lastVisible: newLastVisible }));
  }
);

// ------------------------------------------------------
// 🔹 Subscribe to groups list (joined / discover)
// ------------------------------------------------------
export const subscribeToGroups = createAsyncThunk(
  "groupChat/subscribeToGroups",
  async (_, { dispatch }) => {
    const user = auth().currentUser;
    if (!user) throw new Error("Not authenticated");

  const unsubscribeJoined = firestore()
  .collection("groups")
  .where("participants", "array-contains", user.uid)
  .onSnapshot((snap) => {
    const groups = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // 🔹 Sort by last message timestamp (newest first)
    const sortedGroups = groups.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
      const bTime = b.lastMessage?.createdAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });

    dispatch(setJoinedGroups(sortedGroups));
  });

    const unsubscribeDiscover = firestore()
      .collection("groups")
      .onSnapshot((snap) => {
        const groups = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((g) => !g.participants?.includes(user.uid));
        dispatch(setDiscoverGroups(groups));
      });

    return { unsubscribeJoined, unsubscribeDiscover };
  }
);

// ------------------------------------------------------
// 🔹 Send message
// ------------------------------------------------------
export const sendGroupMessage = createAsyncThunk(
  "groupChat/sendGroupMessage",
  async ({ groupId, text }) => {
    const user = auth().currentUser;
    if (!user) throw new Error("Not authenticated");

    const msg = {
      senderId: user.uid,
      text,
      type: "text",
      createdAt: firestore.FieldValue.serverTimestamp(),
    };

    const msgRef = firestore()
      .collection("groupMessages")
      .doc(groupId)
      .collection("messages");

    await msgRef.add(msg);

    await firestore().collection("groups").doc(groupId).update({
      lastMessage: {
        text,
        senderId: user.uid,
        createdAt: firestore.FieldValue.serverTimestamp(),
      },
    });
  }
);

// ------------------------------------------------------
// 🔹 Join / Leave group
// ------------------------------------------------------
export const joinGroup = createAsyncThunk("groupChat/joinGroup", async ({ groupId }) => {
  const user = auth().currentUser;
  if (!user) throw new Error("Not authenticated");

  await firestore().collection("groups").doc(groupId).update({
    participants: firestore.FieldValue.arrayUnion(user.uid),
    memberCount: firestore.FieldValue.increment(1),
  });
});

export const leaveGroup = createAsyncThunk("groupChat/leaveGroup", async ({ groupId }) => {
  const user = auth().currentUser;
  if (!user) throw new Error("Not authenticated");

  await firestore().collection("groups").doc(groupId).update({
    participants: firestore.FieldValue.arrayRemove(user.uid),
    memberCount: firestore.FieldValue.increment(-1),
  });
});

// ------------------------------------------------------
// 🔹 Slice
// ------------------------------------------------------
const groupChatSlice = createSlice({
  name: "groupChat",
  initialState: {
    groups: {},
    userCache: {},
    joinedGroups: [],
    discoverGroups: [],
  },
  reducers: {
    setMessages: (state, { payload }) => {
      const { groupId, messages } = payload;
      const lastVisible = messages[messages.length - 1] || null;
      state.groups[groupId] = {
        ...(state.groups[groupId] || {}),
        messages,
        lastVisible,
      };
    },
    addOlderMessages: (state, { payload }) => {
      const { groupId, messages, lastVisible } = payload;
      if (!state.groups[groupId]) state.groups[groupId] = { messages: [] };

      const all = [...state.groups[groupId].messages, ...messages];
      const deduped = Array.from(new Map(all.map((m) => [m.id, m])).values());

      state.groups[groupId].messages = deduped;
      state.groups[groupId].lastVisible = lastVisible;
    },
    setJoinedGroups: (state, { payload }) => {
      state.joinedGroups = payload;
    },
    setDiscoverGroups: (state, { payload }) => {
      state.discoverGroups = payload;
    },
    clearGroupMessages: (state, { payload }) => {
      const { groupId } = payload;
      state.groups[groupId]?.unsubscribe?.();
      delete state.groups[groupId];
    },
    clearAllGroups: (state) => {
      Object.values(state.groups).forEach((g) => g.unsubscribe?.());
      state.groups = {};
      state.userCache = {};
      state.joinedGroups = [];
      state.discoverGroups = [];
    },
    attachUnsubscribe: (state, { payload }) => {
      const { groupId, unsubscribe } = payload;
      if (state.groups[groupId]) state.groups[groupId].unsubscribe = unsubscribe;
    },
    updateUserCache: (state, { payload }) => {
      const { uid, data } = payload;
      state.userCache[uid] = data;
    },
    
  },
});

export const {
  setMessages,
  addOlderMessages,
  setJoinedGroups,
  setDiscoverGroups,
  clearGroupMessages,
  clearAllGroups,
  attachUnsubscribe,
  updateUserCache,
} = groupChatSlice.actions;

export default groupChatSlice.reducer;
