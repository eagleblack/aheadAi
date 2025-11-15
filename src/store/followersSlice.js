import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import firestore from "@react-native-firebase/firestore";
import auth from "@react-native-firebase/auth";

const PAGE_SIZE = 10;

// ----------------------------------------------------------------------
// 🔹 Fetch users I follow (from follows collection, paginated)
// Structure: follows/{followId} = { followerId, followingId, followedAt }
// ----------------------------------------------------------------------
export const fetchFollowing = createAsyncThunk(
  "followers/fetchFollowing",
  async ({ startAfterDoc = null }, { rejectWithValue }) => {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) throw new Error("User not logged in");

      let query = firestore()
        .collection("follows")
        .where("followerId", "==", currentUser.uid)
        .orderBy("followedAt", "desc")
        .limit(PAGE_SIZE);

      if (startAfterDoc) query = query.startAfter(startAfterDoc);

      const snapshot = await query.get();
      const followDocs = snapshot.docs;
      const lastDoc = followDocs.length
        ? followDocs[followDocs.length - 1]
        : null;

      // If no follow docs found, stop here
      if (followDocs.length === 0) {
        return { users: [], lastDoc: null, hasMore: false };
      }

      // Fetch corresponding user profiles (in parallel)
      const followingList = await Promise.all(
        followDocs.map(async (doc) => {
          const { followingId } = doc.data();
          const userDoc = await firestore()
            .collection("users")
            .doc(followingId)
            .get();
          if (userDoc.exists) {
            return {
              id: followingId,
              ...userDoc.data(),
              isFollowing: true,
            };
          }
          return null;
        })
      );

      const validUsers = followingList.filter(Boolean);
      return {
        users: validUsers,
        lastDoc,
        hasMore: validUsers.length === PAGE_SIZE,
      };
    } catch (error) {
      console.log("🔥 fetchFollowing error:", error);
      return rejectWithValue(error.message);
    }
  }
);

// ----------------------------------------------------------------------
// 🔹 Slice
// ----------------------------------------------------------------------
const followersSlice = createSlice({
  name: "followers",
  initialState: {
    following: [],
    loading: false,
    error: null,
    lastFetchedDoc: null,
    hasMore: true,
  },
  reducers: {
    resetFollowing(state) {
      state.following = [];
      state.lastFetchedDoc = null;
      state.hasMore = true;
      state.error = null;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // ---------------- Fetch Following ----------------
      .addCase(fetchFollowing.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFollowing.fulfilled, (state, action) => {
        state.loading = false;
        const { users, lastDoc, hasMore } = action.payload;

        if (!users || users.length === 0) {
          // Stop further fetching if empty
          state.hasMore = false;
          return;
        }

        const existingIds = new Set(state.following.map((u) => u.id));
        const newUsers = users.filter((u) => !existingIds.has(u.id));

        state.following.push(...newUsers);
        state.lastFetchedDoc = lastDoc;
        state.hasMore = hasMore;
      })
      .addCase(fetchFollowing.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch following";
        // Stop further pagination if there’s an error
        state.hasMore = false;
      });
  },
});

export const { resetFollowing } = followersSlice.actions;
export default followersSlice.reducer;
