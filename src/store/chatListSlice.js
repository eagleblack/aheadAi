import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import firestore from "@react-native-firebase/firestore";

// ----------------------------------------------------------------------
// 🔹 Fallback user object
// ----------------------------------------------------------------------
const defaultUser = {
  uid: null,
  name: "Anonymous",
  avatar: "https://i.pravatar.cc/150",
  tagline: "A new user",
};

// 🔹 Cache user lookups to avoid re-fetching
const userCache = {};

const getUserData = async (uid) => {
  if (!uid) return defaultUser;
  if (userCache[uid]) return userCache[uid];

  const doc = await firestore().collection("users").doc(uid).get();
  const data = doc.exists ? doc.data() : { uid };

  const user = {
    uid: data.uid,
    name: data.name || "Anonymous",
    avatar: data.profilePic || "https://i.pravatar.cc/150",
    tagline: data.profileTitle || "A new user",
  };

  userCache[uid] = user;
  return user;
};

// ----------------------------------------------------------------------
// 🔹 Async thunk: Fetch first page (non-realtime fallback)
// ----------------------------------------------------------------------
export const fetchRequestedChats = createAsyncThunk(
  "chatList/fetchRequestedChats",
  async ({ currentUserId, limitCount = 10 }, { rejectWithValue }) => {
    try {
      const query = firestore()
        .collection("chats")
        .where("participants", "array-contains", currentUserId)
        .orderBy("lastMessage.sentOn", "desc")
        .limit(limitCount);

      const snapshot = await query.get();

      const chats = [];
      for (const doc of snapshot.docs) {
        const data = doc.data();
        const chatId = doc.id;
        const otherUserId = data.participants.find((id) => id !== currentUserId);
        const user = await getUserData(otherUserId);

        chats.push({
          chatId,
          status: data.status,
          requestedBy: data.requestedBy,
          acceptedBy: data.acceptedBy,
          lastMessage: data.lastMessage || null,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          user,
        });
      }

      const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;
      const hasMore = snapshot.size === limitCount;

      return { chats, lastVisible, hasMore };
    } catch (err) {
      console.error("fetchRequestedChats error:", err);
      return rejectWithValue(err.message);
    }
  }
);

// ----------------------------------------------------------------------
// 🔹 Async thunk: Fetch more (pagination)
// ----------------------------------------------------------------------
export const fetchMoreRequestedChats = createAsyncThunk(
  "chatList/fetchMoreRequestedChats",
  async ({ currentUserId, lastVisible, limitCount = 10 }, { rejectWithValue }) => {
    try {
      if (!lastVisible) return { chats: [], hasMore: false };

      const query = firestore()
        .collection("chats")
        .where("participants", "array-contains", currentUserId)
        .orderBy("lastMessage.sentOn", "desc")
        .startAfter(lastVisible)
        .limit(limitCount);

      const snapshot = await query.get();

      const chats = [];
      for (const doc of snapshot.docs) {
        const data = doc.data();
        const chatId = doc.id;
        const otherUserId = data.participants.find((id) => id !== currentUserId);
        const user = await getUserData(otherUserId);

        chats.push({
          chatId,
          status: data.status,
          requestedBy: data.requestedBy,
          acceptedBy: data.acceptedBy,
          lastMessage: data.lastMessage || null,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          user,
        });
      }

      const newLastVisible = snapshot.docs[snapshot.docs.length - 1] || null;
      const hasMore = snapshot.size === limitCount;

      return { chats, lastVisible: newLastVisible, hasMore };
    } catch (err) {
      console.error("fetchMoreRequestedChats error:", err);
      return rejectWithValue(err.message);
    }
  }
);

// ----------------------------------------------------------------------
// 🔹 Slice definition
// ----------------------------------------------------------------------
const chatListSlice = createSlice({
  name: "chatList",
  initialState: {
    chats: [],
    loading: false,
    error: null,
    lastVisible: null,
    hasMore: true,
  },
  reducers: {
    clearChatList: (state) => {
      state.chats = [];
      state.loading = false;
      state.error = null;
      state.lastVisible = null;
      state.hasMore = true;
    },
    // ✅ For real-time updates
    setUserChats: (state, action) => {
      state.chats = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRequestedChats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRequestedChats.fulfilled, (state, action) => {
        state.loading = false;
        state.chats = action.payload.chats;
        state.lastVisible = action.payload.lastVisible;
        state.hasMore = action.payload.hasMore;
      })
      .addCase(fetchRequestedChats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchMoreRequestedChats.fulfilled, (state, action) => {
        state.chats = [...state.chats, ...action.payload.chats];
        state.lastVisible = action.payload.lastVisible;
        state.hasMore = action.payload.hasMore;
      });
  },
});

export const { clearChatList, setUserChats } = chatListSlice.actions;
export default chatListSlice.reducer;

// ----------------------------------------------------------------------
// 🔹 Real-time listener (live updates)
// ----------------------------------------------------------------------
export const listenToRequestedChats = (currentUserId, dispatch, limitCount = 10) => {
  const query = firestore()
    .collection("chats")
    .where("participants", "array-contains", currentUserId)
    .orderBy("lastMessage.sentOn", "desc")
    .limit(limitCount);

  // ✅ Real-time Firestore subscription
  return query.onSnapshot(async (snapshot) => {
    const chats = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const chatId = doc.id;
      const otherUserId = data.participants.find((id) => id !== currentUserId);
      const user = await getUserData(otherUserId);

      chats.push({
        chatId,
        status: data.status,
        requestedBy: data.requestedBy,
        acceptedBy: data.acceptedBy,
        lastMessage: data.lastMessage || null,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        user,
      });
    }

    dispatch(setUserChats(chats));
  });
};
