// commentsSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import firestore from "@react-native-firebase/firestore";
import auth from "@react-native-firebase/auth";

const COMMENTS_LIMIT = 10;

// 🔹 Fetch comments (initial or load more)
export const fetchComments = createAsyncThunk(
  "comments/fetchComments",
  async ({ postId, loadMore = false }, { getState, rejectWithValue }) => {
    try {
      const { comments } = getState();
      const user = auth().currentUser;

      let query = firestore()
        .collection("posts")
        .doc(postId)
        .collection("comments")
        .orderBy("createdAt", "desc")
        .limit(COMMENTS_LIMIT);

      const postCommentsState = comments.commentsByPost[postId];

      if (loadMore && postCommentsState?.lastCursor) {
        query = query.startAfter(postCommentsState.lastCursor);
      }

      const snapshot = await query.get();
      if (snapshot.empty)
        return { postId, comments: [], lastCursor: null, isLastPage: true };

      const commentsData = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const data = doc.data();
          const userDoc = data.userId
            ? await firestore().collection("users").doc(data.userId).get()
            : null;
          const userData = userDoc?.exists ? userDoc.data() : {};
          return {
            id: doc.id,
            ...data,
            user: {
              name: userData.name || "Anonymous",
              avatar: userData.profilePic || "https://i.pravatar.cc/150",
            },
            likedByCurrentUser: user
              ? !!(
                  await firestore()
                    .collection("posts")
                    .doc(postId)
                    .collection("comments")
                    .doc(doc.id)
                    .collection("likes")
                    .doc(user.uid)
                    .get()
                ).exists
              : false,
          };
        })
      );

      const lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];
      const isLastPage = snapshot.docs.length < COMMENTS_LIMIT;

      return { postId, comments: commentsData, lastCursor: lastVisibleDoc, isLastPage };
    } catch (err) {
      return rejectWithValue(err.message || "Failed to fetch comments");
    }
  }
);

// 🔹 Add comment
export const addComment = createAsyncThunk(
  "comments/addComment",
  async ({ postId, text, creatorId }, { rejectWithValue }) => {
    try {
      const user = auth().currentUser;
      if (!user) throw new Error("User not authenticated");

      const postRef = firestore().collection("posts").doc(postId);
      const commentRef = postRef.collection("comments").doc();

      const newComment = {
        userId: user.uid,
        text,
        createdAt: firestore.FieldValue.serverTimestamp(),
      };

      // 🧩 Transaction: add comment + update post stats atomically
      await firestore().runTransaction(async (transaction) => {       
        transaction.set(commentRef, newComment);
        transaction.update(postRef, {
          postIndex: firestore.FieldValue.increment(5),
          totalComments: firestore.FieldValue.increment(1),
        });
      });

      // 🔔 Fire-and-forget notification
      if (creatorId !== user.uid) {
        const notificationRef = firestore().collection("notifications").doc();
        const notificationData = {
          notificationFrom: user.uid,
          notificationTo: creatorId,
          notificationType: "COMMENT",
          notificationText: `New comment added to your post`,
          comment: text,
          postId,
          createdOn: firestore.FieldValue.serverTimestamp(),
          read: false,
          status: "UNREAD",
        };
        notificationRef.set(notificationData).catch((err) => {
          console.log("Failed to send notification:", err.message);
        });
      }

      return {
        postId,
        comment: {
          id: commentRef.id,
          ...newComment,
          user: {
            name: user.displayName || "Anonymous",
            avatar: user.photoURL || "https://i.pravatar.cc/150",
          },
          likedByCurrentUser: false,
        },
      };
    } catch (err) {
      return rejectWithValue(err.message || "Failed to add comment");
    }
  }
);

// 🔹 Delete comment
export const deleteComment = createAsyncThunk(
  "comments/deleteComment",
  async ({ postId, commentId }, { rejectWithValue }) => {
    try {
      const user = auth().currentUser;
      if (!user) throw new Error("User not authenticated");

      const postRef = firestore().collection("posts").doc(postId);
      const commentRef = postRef.collection("comments").doc(commentId);

      const commentSnap = await commentRef.get();
      if (!commentSnap.exists) throw new Error("Comment not found");

      const commentData = commentSnap.data();
      if (commentData.userId !== user.uid) {
        throw new Error("You can only delete your own comments");
      }

      // 🧩 Transaction: delete comment + decrement total comments + lower engagement
      await firestore().runTransaction(async (transaction) => {
        transaction.delete(commentRef);
        transaction.update(postRef, {
          totalComments: firestore.FieldValue.increment(-1),
          postIndex: firestore.FieldValue.increment(-5),
        });
      });

      // 🧹 Clean up related comment notification
      const notifSnap = await firestore()
        .collection("notifications")
        .where("notificationType", "==", "COMMENT")
        .where("postId", "==", postId)
        .where("notificationFrom", "==", user.uid)
        .get();

      const batch = firestore().batch();
      notifSnap.forEach((doc) => batch.delete(doc.ref));
      if (!notifSnap.empty) await batch.commit();

      return { postId, commentId };
    } catch (err) {
      return rejectWithValue(err.message || "Failed to delete comment");
    }
  }
);
const commentsSlice = createSlice({
  name: "comments",
  initialState: {
    commentsByPost: {}, // { postId: { comments: [], lastCursor, isLastPage } }
    postsOrder: [],
    loading: false,
    addingComment: false,
    deletingComment: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // 🔸 Fetch comments
      .addCase(fetchComments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchComments.fulfilled, (state, action) => {
        state.loading = false;
        const { postId, comments, lastCursor, isLastPage } = action.payload;

        if (!state.postsOrder.includes(postId)) {
          state.postsOrder.push(postId);
          if (state.postsOrder.length > 10) {
            const removedPostId = state.postsOrder.shift();
            delete state.commentsByPost[removedPostId];
          }
        }

        const existing = state.commentsByPost[postId]?.comments || [];
        const existingIds = new Set(existing.map((c) => c.id));
        const newUniqueComments = comments.filter((c) => !existingIds.has(c.id));

        state.commentsByPost[postId] = {
          comments: existing.concat(newUniqueComments),
          lastCursor,
          isLastPage,
        };
      })
      .addCase(fetchComments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // 🔸 Add comment
      .addCase(addComment.pending, (state) => {
        state.addingComment = true;
      })
      .addCase(addComment.fulfilled, (state, action) => {
        state.addingComment = false;
        const { postId, comment } = action.payload;

        const postComments = state.commentsByPost[postId] || {
          comments: [],
          lastCursor: null,
          isLastPage: false,
        };

        postComments.comments = [comment, ...postComments.comments];
        state.commentsByPost[postId] = postComments;

        if (!state.postsOrder.includes(postId)) {
          state.postsOrder.push(postId);
          if (state.postsOrder.length > 10) {
            const removedPostId = state.postsOrder.shift();
            delete state.commentsByPost[removedPostId];
          }
        }
      })
      .addCase(addComment.rejected, (state) => {
        state.addingComment = false;
      })

      // 🔸 Delete comment
      .addCase(deleteComment.pending, (state) => {
        state.deletingComment = true;
      })
      .addCase(deleteComment.fulfilled, (state, action) => {
        state.deletingComment = false;
        const { postId, commentId } = action.payload;

        const postComments = state.commentsByPost[postId];
        if (postComments) {
          postComments.comments = postComments.comments.filter(
            (c) => c.id !== commentId
          );
        }
      })
      .addCase(deleteComment.rejected, (state, action) => {
        state.deletingComment = false;
        state.error = action.payload;
      });
  },
});

export default commentsSlice.reducer;
