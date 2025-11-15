// bookMarkSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import firestore from "@react-native-firebase/firestore";
import auth from "@react-native-firebase/auth";

const togglingPosts = new Set();

// Helper to check if doc exists
const docExists = (doc) =>
  typeof doc.exists === "function" ? doc.exists() : !!doc.exists;

// Enrich posts with user info, likes, and bookmarks
const enrichPosts = async (posts, currentUserId) => {
  if (!posts.length) return [];

  const userIds = [...new Set(posts.map((p) => p.userId).filter(Boolean))];
  const userMap = {};

  if (userIds.length) {
    const userDocs = await firestore()
      .collection("users")
      .where("uid", "in", userIds)
      .get();
    userDocs.forEach((doc) => (userMap[doc.id] = doc.data()));
  }

  // Fetch likes
  const likesSnapshot = await firestore()
    .collectionGroup("likes")
    .where("userId", "==", currentUserId)
    .orderBy("createdAt", "desc")

    .get();
  const likedPostIds = likesSnapshot.docs.map((d) => d.ref.parent.parent.id);

  // Fetch bookmarks
  const bookmarksSnapshot = await firestore()
    .collectionGroup("bookmarks")
    .where("userId", "==", currentUserId)
    .orderBy("createdAt", "desc")

    .get();
  const bookmarkedPostIds = bookmarksSnapshot.docs.map((d) => d.ref.parent.parent.id);

  return posts.map((post) => {
    const userData = userMap[post.userId] || {};
    return {
      ...post,
      likedByCurrentUser: likedPostIds.includes(post.id),
      bookmarkedByCurrentUser: bookmarkedPostIds.includes(post.id),
      totalLikes: post.totalLikes || 0,
      user: {
        uid: userData.uid || post.userId,
        name: userData.name || "Anonymous",
        avatar: userData.profilePic || "https://i.pravatar.cc/150",
        tagline: userData.profileTitle || "A new user",
      },
    };
  });
};

// ----------------------------
// 🔹 Fetch Bookmarked Posts (Paginated)
// ----------------------------
export const fetchBookmarkedPosts = createAsyncThunk(
  "bookmarks/fetchBookmarkedPosts",
  async ({ loadMore = false } = {}, { getState, rejectWithValue }) => {
    try {
      const user = auth().currentUser;
      if (!user) throw new Error("User not authenticated");

      const { bookmarks } = getState().bookmarks;

      let query = firestore()
        .collection("userBookmarks")
        .where("userId", "==", user.uid)
        .orderBy("bookmarkedOn", "desc")
        .limit(10);

      if (loadMore && bookmarks.lastBookmarkFetched) {
        query = query.startAfter(bookmarks.lastBookmarkFetched);
      }

      const snapshot = await query.get();
      if (snapshot.empty) return { posts: [], lastCursor: null, isLastPage: true };

      const bookmarkDocs = snapshot.docs;
      const postIds = bookmarkDocs.map((doc) => doc.data().postId);

      if (!postIds.length) return { posts: [], lastCursor: null, isLastPage: true };

      // Fetch corresponding posts
      const postSnapshots = await firestore()
        .collection("posts")
        .where(firestore.FieldPath.documentId(), "in", postIds)
        .get();

      const postsData = postSnapshots.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        postIndex: doc.data().postIndex || 0,
      }));

      const posts = await enrichPosts(postsData, user.uid);
      const lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];
      const isLastPage = bookmarkDocs.length < 10;

      return { posts, lastCursor: lastVisibleDoc, isLastPage };
    } catch (err) {
      console.error("fetchBookmarkedPosts error:", err);
      return rejectWithValue(err.message || "Failed to fetch bookmarks");
    }
  }
);

// ----------------------------
// 🔹 Bookmark Slice
// ----------------------------
const bookMarkSlice = createSlice({
  name: "bookmarks",
  initialState: {
    bookmarks: [],
    loading: false,
    error: null,
    lastBookmarkFetched: null,
    isLastBookmarkPage: false,
  },
  reducers: {
    toggleLikeOptimistic: (state, action) => {
      const post = state.bookmarks.find((p) => p.id === action.payload.postId);
      if (post) {
        post.likedByCurrentUser = !post.likedByCurrentUser;
        post.totalLikes += post.likedByCurrentUser ? 1 : -1;
        post.postIndex += post.likedByCurrentUser ? 1 : -1;
      }
    },
    toggleBookmarkOptimistic: (state, action) => {
      const post = state.bookmarks.find((p) => p.id === action.payload.postId);
      if (post) post.bookmarkedByCurrentUser = !post.bookmarkedByCurrentUser;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBookmarkedPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBookmarkedPosts.fulfilled, (state, action) => {
        const { posts, lastCursor, isLastPage } = action.payload;

        const combinedPosts = state.lastBookmarkFetched
          ? [...state.bookmarks, ...posts]
          : posts;

        const seen = new Set();
        state.bookmarks = combinedPosts.filter((p) => {
          if (seen.has(p.id)) return false;
          seen.add(p.id);
          return true;
        });

        state.loading = false;
        state.lastBookmarkFetched = lastCursor;
        state.isLastBookmarkPage = isLastPage;
      })
      .addCase(fetchBookmarkedPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { toggleLikeOptimistic, toggleBookmarkOptimistic } = bookMarkSlice.actions;
export default bookMarkSlice.reducer;
