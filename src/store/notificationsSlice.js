import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import firestore from "@react-native-firebase/firestore";

console.log("[notificationsSlice] module loaded");

// ----------------------------------------------------------------------
// 🔹 Helper: Get sender user info (except ADMIN)
// ----------------------------------------------------------------------
const getUserData = async (userId) => {
  if (userId === "ADMIN") return { name: "Admin", profilePic: null };

  try {
    const userDoc = await firestore().collection("users").doc(userId).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      return {
        name: userData?.name?.trim() || userData?.username?.trim() || "Unknown User",
        profilePic: userData?.profilePic || null,
      };
    }
  } catch (e) {
    console.warn("[notificationsSlice] Error fetching user:", e);
  }

  return { name: "Unknown User", profilePic: null };
};

// ----------------------------------------------------------------------
// 🔹 Async Thunk: Fetch paginated notifications (initial load / pagination)
// ----------------------------------------------------------------------
export const fetchNotifications = createAsyncThunk(
  "notifications/fetchNotifications",
  async ({ userId, lastVisible = null, limit = 20 }, { rejectWithValue }) => {
    try {
      let query = firestore()
        .collection("notifications")
        .where("notificationTo", "==", userId)
        .orderBy("createdOn", "desc")
        .limit(limit);

      if (lastVisible) query = query.startAfter(lastVisible);

      const snapshot = await query.get();

      const notifications = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const data = doc.data();
          const senderInfo = await getUserData(data.notificationFrom);
          return {
            id: doc.id,
            ...data,
            senderName: senderInfo.name,
            senderProfilePic: senderInfo.profilePic,
          };
        })
      );

      const newLastVisible = snapshot.docs.length
        ? snapshot.docs[snapshot.docs.length - 1]
        : null;

      return { notifications, lastVisible: newLastVisible };
    } catch (err) {
      console.error("[notificationsSlice] Fetch error:", err);
      return rejectWithValue(err.message);
    }
  }
);

// ----------------------------------------------------------------------
// 🔹 Live listener (real-time notifications + unread count)
// ----------------------------------------------------------------------
export const listenToNotifications = (userId) => (dispatch) => {
  if (!userId) return;

  console.log("[notificationsSlice] Listening to notifications...");

  const unsubscribe = firestore()
    .collection("notifications")
    .where("notificationTo", "==", userId)
    .orderBy("createdOn", "desc")
    .limit(50) // adjust as needed
    .onSnapshot(async (snapshot) => {
      const notifications = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const data = doc.data();
          const senderInfo = await getUserData(data.notificationFrom);
          return {
            id: doc.id,
            ...data,
            senderName: senderInfo.name,
            senderProfilePic: senderInfo.profilePic,
          };
        })
      );

      // 🔹 Calculate unread count
      const unreadCount = notifications.filter(
        (n) => !n.status || n.status.toLowerCase() === "unread"
      ).length;

      dispatch(setLiveNotifications(notifications));
      dispatch(setUnreadCount(unreadCount));
    });

  return unsubscribe;
};

// ----------------------------------------------------------------------
// 🔹 Mark all notifications as read
// ----------------------------------------------------------------------
export const markAllNotificationsRead = createAsyncThunk(
  "notifications/markAllNotificationsRead",
  async (userId, { rejectWithValue }) => {
    try {
      const snapshot = await firestore()
        .collection("notifications")
        .where("notificationTo", "==", userId)
        .where("status", "in", ["UNREAD", "unread"])
        .get();

      if (!snapshot.empty) {
        const batch = firestore().batch();
        snapshot.forEach((doc) => batch.update(doc.ref, { status: "READ" }));
        await batch.commit();
      }

      return true;
    } catch (err) {
      console.error("[notificationsSlice] Mark read error:", err);
      return rejectWithValue(err.message);
    }
  }
);

// ----------------------------------------------------------------------
// 🔹 Slice
// ----------------------------------------------------------------------
const notificationsSlice = createSlice({
  name: "notifications",
  initialState: {
    items: [], // fetched notifications
    liveItems: [], // live updated notifications
    lastVisible: null,
    loading: false,
    error: null,
    hasMore: true,
    unreadCount: 0, // 🔹 live unread count
  },
  reducers: {
    setLiveNotifications: (state, action) => {
      state.liveItems = action.payload;
    },
    setUnreadCount: (state, action) => {
      state.unreadCount = action.payload;
    },
    clearNotifications: (state) => {
      state.items = [];
      state.liveItems = [];
      state.lastVisible = null;
      state.hasMore = true;
      state.unreadCount = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        if (action.meta.arg.lastVisible) {
          state.items = [...state.items, ...action.payload.notifications];
        } else {
          state.items = action.payload.notifications;
        }
        state.lastVisible = action.payload.lastVisible;
        state.hasMore = action.payload.notifications.length > 0;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch notifications";
      })
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.items = state.items.map((n) => ({ ...n, status: "READ" }));
        state.liveItems = state.liveItems.map((n) => ({ ...n, status: "READ" }));
        state.unreadCount = 0;
      });
  },
});

export const { setLiveNotifications, setUnreadCount, clearNotifications } =
  notificationsSlice.actions;

export default notificationsSlice.reducer;
