// otherProfileSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import firestore,{FieldValue,FieldPath} from "@react-native-firebase/firestore";
import auth from "@react-native-firebase/auth";

console.log("[otherProfileSlice] module loaded");

// ----------------------------
// 🔹 Helpers
// ----------------------------
const docExists = (doc) =>
  typeof doc.exists === "function" ? doc.exists() : !!doc.exists;

// ----------------------------
// 🔹 Prevent race conditions
// ----------------------------
const togglingPosts = new Set();

// ----------------------------
// 🔹 Build posts with enriched user + like/bookmark status
// ----------------------------
const enrichPosts = async (posts, currentUserId) => {
  if (!posts.length) return [];

  const userIds = [...new Set(posts.map((p) => p.userId).filter(Boolean))];

  const userMap = {};
  if (userIds.length) {
    const userDocs = await firestore()
      .collection("users")
      .where("uid", "in", userIds)
      .get();
    userDocs.forEach((doc) => {
      userMap[doc.id] = doc.data();
    });
  }

  const likesSnapshot = await firestore()
    .collectionGroup("likes")
    .where("userId", "==", currentUserId)
    .orderBy("createdAt", "desc")
    .get();
  const likedPostIds = likesSnapshot.docs.map((d) => d.ref.parent.parent.id);

  const bookmarksSnapshot = await firestore()
    .collectionGroup("bookmarks")
    .where("userId", "==", currentUserId)
    .orderBy("createdAt", "desc")
    .get();
  const bookmarkedPostIds = bookmarksSnapshot.docs.map(
    (d) => d.ref.parent.parent.id
  );

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
        profilePic: userData.profilePic || "https://i.pravatar.cc/150",
        tagline: userData.profileTitle || "A new user",
      },
    };
  });
};

// ----------------------------
// 🔹 Fetch other user posts (paginated)
// ----------------------------
export const fetchOtherProfilePosts = createAsyncThunk(
  "otherProfile/fetchPosts",
  async ({ profileUserId, loadMore = false }, { getState, rejectWithValue }) => {
    try {
      const { otherProfile } = getState();
      const user = auth().currentUser;
      if (!user) throw new Error("User not authenticated");

      let query = firestore()
        .collection("posts")
        .where("userId", "==", profileUserId)
        .orderBy("createdAt", "desc")
        .limit(10);

      if (loadMore && otherProfile.lastPostFetched) query = query.startAfter(otherProfile.lastPostFetched);

      const snapshot = await query.get();
      if (snapshot.empty) return { posts: [], lastCursor: null, isLastPage: true };

      const postsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        postIndex: doc.data().postIndex || 0,
      }));

      const posts = await enrichPosts(postsData, user.uid);

      const lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];
      const isLastPage = snapshot.docs.length < 10;

      return { posts, lastCursor: lastVisibleDoc, isLastPage };
    } catch (err) {
      console.error("fetchOtherProfilePosts error:", err);
      return rejectWithValue(err.message || "Failed to fetch posts");
    }
  },
  {
    condition: (_, { getState }) => {
      const { otherProfile } = getState();
      return !otherProfile.isFetching;
    },
  }
);

// ----------------------------
// 🔹 Refresh other user posts
// ----------------------------
export const refreshOtherProfilePosts = createAsyncThunk(
  "otherProfile/refreshPosts",
  async ({ profileUserId }, { getState, rejectWithValue }) => {
    try {
      const { otherProfile } = getState();
      const user = auth().currentUser;
      if (!user) throw new Error("User not authenticated");

      let query = firestore()
        .collection("posts")
        .where("userId", "==", profileUserId)
        .orderBy("postIndex", "desc")
        .limit(10);

      if (otherProfile.posts.length)
        query = query.where("postIndex", ">", otherProfile.posts[0].postIndex);

      const snapshot = await query.get();
      if (snapshot.empty) return { posts: [] };

      const postsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        postIndex: doc.data().postIndex || 0,
      }));

      const posts = await enrichPosts(postsData, user.uid);

      return { posts };
    } catch (err) {
      console.error("refreshOtherProfilePosts error:", err);
      return rejectWithValue(err.message || "Failed to refresh posts");
    }
  }
);

// ----------------------------
// 🔹 Toggle bookmark (otherProfile)
// ----------------------------
export const toggleBookmark = createAsyncThunk(
  "otherProfile/toggleBookmark",
  async (post, { rejectWithValue }) => {
    try {
      const user = auth().currentUser;
      if (!user) throw new Error("User not authenticated");

      if (togglingPosts.has(post.id)) return { postId: post.id };
      togglingPosts.add(post.id);

      const postRef = firestore().collection("posts").doc(post.id);
      const bookmarkRef = postRef.collection("bookmarks").doc(user.uid);
      const globalBookmarkRef = firestore()
        .collection("userBookmarks")
        .doc(`${user.uid}_${post.id}`);

      let bookmarked = false;

      await firestore().runTransaction(async (transaction) => {
        const bookmarkDoc = await transaction.get(bookmarkRef);
        if (!docExists(bookmarkDoc)) {
          transaction.set(bookmarkRef, { userId: user.uid, createdAt: FieldValue.serverTimestamp() });
          transaction.set(globalBookmarkRef, { userId: user.uid, postId: post.id, bookmarkedOn: FieldValue.serverTimestamp() });
          transaction.update(postRef, { postIndex: FieldValue.increment(5) });
          bookmarked = true;
        } else {
          transaction.delete(bookmarkRef);
          transaction.delete(globalBookmarkRef);
          transaction.update(postRef, { postIndex: FieldValue.increment(-5) });
          bookmarked = false;
        }
      });

      togglingPosts.delete(post.id);
      return { postId: post.id, bookmarked };
    } catch (err) {
      togglingPosts.delete(post.id);
      console.error("toggleBookmark error:", err);
      return rejectWithValue(err.message || "Failed to toggle bookmark");
    }
  }
);

// ----------------------------
// 🔹 Toggle like (otherProfile)
  //"otherProfile/toggleLike",
// ----------------------------
export const toggleLike = createAsyncThunk(
  "otherProfile/toggleLike",
  async (post, { rejectWithValue }) => {
    try {
      const user = auth().currentUser;
      if (!user) throw new Error("User not authenticated");

      if (togglingPosts.has(post.id)) return { postId: post.id };
      togglingPosts.add(post.id);

      const postRef = firestore().collection("posts").doc(post.id);
      const likeRef = postRef.collection("likes").doc(user.uid);
      const notificationsRef = firestore().collection("notifications");

      await firestore().runTransaction(async (transaction) => {
        const postDoc = await transaction.get(postRef);
        if (!docExists(postDoc)) throw new Error("Post does not exist");

        const likeDoc = await transaction.get(likeRef);
        const postData = postDoc.data();

        // --------------------------------------------
        // 🔹 Add Like + Create/Update LIKE Notification
        // --------------------------------------------
        if (!docExists(likeDoc)) {
          transaction.set(likeRef, {
            userId: user.uid,
            createdAt: FieldValue.serverTimestamp(),
          });

          transaction.update(postRef, {
            totalLikes: FieldValue.increment(1),
            postIndex: FieldValue.increment(1),
          });

          // Don't notify yourself
          if (postData.userId !== user.uid) {
            const notifQuery = await notificationsRef
              .where("postId", "==", post.id)
              .where("notificationTo", "==", postData.userId)
              .where("notificationType", "==", "LIKE")
              .limit(1)
              .get();

            const username = user.displayName || "Someone";

            if (!notifQuery.empty) {
              // --------------------------------------------
              // 🔹 Update existing LIKE notification
              // --------------------------------------------
              const notifDoc = notifQuery.docs[0];
              const notifRef = notificationsRef.doc(notifDoc.id);

              const existingData = notifDoc.data();
              const totalUser = (existingData.totalUser || 1) + 1;

              transaction.update(notifRef, {
                notificationFrom: user.uid,
                totalUser,
                notificationText:
                  totalUser > 1
                    ? `${username} and ${totalUser - 1} others liked your post`
                    : `${username} liked your post`,
                updatedAt: FieldValue.serverTimestamp(),
              });
            } else {
              // --------------------------------------------
              // 🔹 Create new LIKE notification
              // --------------------------------------------
              const newNotifRef = notificationsRef.doc();
              transaction.set(newNotifRef, {
                notificationFrom: user.uid,
                notificationTo: postData.userId,
                notificationType: "LIKE",
                notificationText: `${username} liked your post`,
                postId: post.id,
                totalUser: 1,
                createdAt: FieldValue.serverTimestamp(),
                read: false,
                status:'UNREAD'
              });
            }
          }
        }
        // --------------------------------------------
        // 🔹 Remove Like & Decrement Count
        // --------------------------------------------
        else {
          transaction.delete(likeRef);
          transaction.update(postRef, {
            totalLikes: FieldValue.increment(-1),
            postIndex: FieldValue.increment(-1),
          });

          // Optional cleanup: update or delete LIKE notification
          const notifQuery = await notificationsRef
            .where("postId", "==", post.id)
            .where("notificationTo", "==", postData.userId)
            .where("notificationType", "==", "LIKE")
            .limit(1)
            .get();

          if (!notifQuery.empty) {
            const notifDoc = notifQuery.docs[0];
            const notifRef = notificationsRef.doc(notifDoc.id);
            const existingData = notifDoc.data();
            const newTotal = (existingData.totalUser || 1) - 1;

            if (newTotal <= 0) {
              transaction.delete(notifRef);
            } else {
              transaction.update(notifRef, {
                totalUser: newTotal,
                notificationText:
                  newTotal === 1
                    ? "1 person liked your post"
                    : `${newTotal} users liked your post`,
                updatedAt: FieldValue.serverTimestamp(),
                status:'UNREAD'
              });
            }
          }
        }
      });

      togglingPosts.delete(post.id);
      return { postId: post.id };
    } catch (err) {
      togglingPosts.delete(post.id);
      console.error("toggleLike error:", err);
      return rejectWithValue(err.message || "Failed to toggle like");
    }
  }
);

// ----------------------------
// 🔹 otherProfile Slice
// ----------------------------
const otherProfilePostSlice = createSlice({
  name: "otherProfile",
  initialState: {
    posts: [],
    loading: false,
    isFetching: false,
    error: null,
    lastPostFetched: null,
    isLastPage: false,
  },
  reducers: {
    toggleLikeOptimisticotherprofile: (state, action) => {
      const post = state.posts.find((p) => p.id === action.payload.postId);
      if (post) {
        post.likedByCurrentUser = !post.likedByCurrentUser;
        post.totalLikes += post.likedByCurrentUser ? 1 : -1;
        post.postIndex += post.likedByCurrentUser ? 1 : -1;
      }
    },
    toggleBookmarkOptimistic: (state, action) => {
      const post = state.posts.find((p) => p.id === action.payload.postId);
      if (post) {
        post.bookmarkedByCurrentUser = !post.bookmarkedByCurrentUser;
        post.postIndex += post.bookmarkedByCurrentUser ? 5 : -5;
      }
    },
    clearPosts: (state) => {
    state.posts = [];
    state.lastPostFetched = null;
    state.isLastPage = false;
    state.isFetching = false;
    state.error = null;
  },
  },
  extraReducers: (builder) => {
    builder
      // fetchOtherProfilePosts
      .addCase(fetchOtherProfilePosts.pending, (state) => {
        state.isFetching = true;
        state.error = null;
      })
      .addCase(fetchOtherProfilePosts.fulfilled, (state, action) => {
        const { posts, lastCursor, isLastPage } = action.payload;

        const combinedPosts = state.lastPostFetched
          ? [...state.posts, ...posts]
          : posts;

        const seen = new Set();
        state.posts = combinedPosts.filter((p) => {
          if (seen.has(p.id)) return false;
          seen.add(p.id);
          return true;
        });

        state.isFetching = false;
        state.lastPostFetched = lastCursor;
        state.isLastPage = isLastPage;
      })
      .addCase(fetchOtherProfilePosts.rejected, (state, action) => {
        state.isFetching = false;
        state.error = action.payload;
      })
      // refreshOtherProfilePosts
      .addCase(refreshOtherProfilePosts.fulfilled, (state, action) => {
        if (action.payload.posts.length > 0) {
          const combinedPosts = [...action.payload.posts, ...state.posts];
          const seen = new Set();
          state.posts = combinedPosts.filter((p) => {
            if (seen.has(p.id)) return false;
            seen.add(p.id);
            return true;
          });
        }
      })
      // toggleLike
      .addCase(toggleLike.fulfilled, () => {})
      // toggleBookmark
      .addCase(toggleBookmark.fulfilled, (state, action) => {
        const { postId, bookmarked } = action.payload;
        const post = state.posts.find((p) => p.id === postId);
        if (post) post.bookmarkedByCurrentUser = bookmarked;
      });
  },
});

export const { toggleLikeOptimisticotherprofile, toggleBookmarkOptimistic,  clearPosts, } = otherProfilePostSlice.actions;
export default otherProfilePostSlice.reducer;
