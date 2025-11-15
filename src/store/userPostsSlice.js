// userPostsSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import firestore from "@react-native-firebase/firestore";
import auth from "@react-native-firebase/auth";

let unsubscribeUserPosts = null;

/**
 * 🔄 Start listening to user's posts (with snapshot)
 */
export const listenToUserPosts = createAsyncThunk(
  "userPosts/listenToUserPosts",
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const user = auth().currentUser;
      if (!user) throw new Error("User not authenticated");

      // detach old listener
      if (unsubscribeUserPosts) unsubscribeUserPosts();

      unsubscribeUserPosts = firestore()
        .collection("posts")
        .where("userId", "==", user.uid)
        .orderBy("createdAt", "desc")
        .limit(20)
        .onSnapshot(
          async (snapshot) => {
            const posts = await Promise.all(
              snapshot.docs.map(async (doc) => {
                const data = doc.data();

                // check like status
                let likedByCurrentUser = false;
                try {
                  const likeDoc = await firestore()
                    .collection("posts")
                    .doc(doc.id)
                    .collection("likes")
                    .doc(user.uid)
                    .get();

                  likedByCurrentUser =
                    typeof likeDoc.exists === "function"
                      ? likeDoc.exists()
                      : likeDoc.exists;
                } catch (err) {
                  console.warn("Like check failed:", doc.id, err);
                }

                return {
                  id: doc.id,
                  ...data,
                  totalLikes: data.totalLikes || 0,
                  likedByCurrentUser,
                  userName: data.userName || "Anonymous",
                  userAvatar: data.userAvatar || "https://i.pravatar.cc/150",
                  userTagline: data.userTagline || "",
                };
              })
            );

            dispatch(setUserPosts(posts));
          },
          (err) => {
            console.error("Error in userPosts snapshot:", err);
            dispatch(setUserPostsError(err.message));
          }
        );

      return true;
    } catch (err) {
      return rejectWithValue(err.message || "Failed to listen to user posts");
    }
  }
);

/**
 * ❤️ Toggle like/unlike on user's posts
 */
export const toggleLikeUserPost = createAsyncThunk(
  "userPosts/toggleLikeUserPost",
  async (post, { rejectWithValue }) => {
    try {
      const user = auth().currentUser;
      if (!user) throw new Error("User not authenticated");

      const postRef = firestore().collection("posts").doc(post.id);
      const likeRef = postRef.collection("likes").doc(user.uid);
      const likeDoc = await likeRef.get();

      if (
        (typeof likeDoc.exists === "function" && likeDoc.exists()) ||
        (typeof likeDoc.exists === "boolean" && likeDoc.exists)
      ) {
        // unlike
        await likeRef.delete();
        await postRef.update({
          totalLikes: firestore.FieldValue.increment(-1),
        });
        return { postId: post.id, liked: false };
      } else {
        // like
        await likeRef.set({
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
        await postRef.update({
          totalLikes: firestore.FieldValue.increment(1),
        });
        return { postId: post.id, liked: true };
      }
    } catch (err) {
      console.error("Error toggling like:", err);
      return rejectWithValue(err.message || "Failed to toggle like");
    }
  }
);

const userPostsSlice = createSlice({
  name: "userPosts",
  initialState: {
    posts: [],
    loading: false,
    error: null,
  },
  reducers: {
    setUserPosts: (state, action) => {
      state.posts = action.payload;
      state.loading = false;
    },
    setUserPostsError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    toggleUserPostOptimistic: (state, action) => {
      const { postId } = action.payload;
      const post = state.posts.find((p) => p.id === postId);
      if (post) {
        if (post.likedByCurrentUser) {
          post.likedByCurrentUser = false;
          if (post.totalLikes > 0) post.totalLikes -= 1;
        } else {
          post.likedByCurrentUser = true;
          post.totalLikes += 1;
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(listenToUserPosts.pending, (state) => {
        state.loading = true;
      })
      .addCase(listenToUserPosts.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      })
      .addCase(toggleLikeUserPost.fulfilled, (state, action) => {
        const { postId, liked } = action.payload;
        const post = state.posts.find((p) => p.id === postId);
        if (post) {
          post.likedByCurrentUser = liked;
          if (post.totalLikes < 0) post.totalLikes = 0;
        }
      });
  },
});

export const {
  setUserPosts,
  setUserPostsError,
  toggleUserPostOptimistic,
} = userPostsSlice.actions;

export default userPostsSlice.reducer;
