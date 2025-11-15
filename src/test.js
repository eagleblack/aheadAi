// testUserBatchQuery.js


import firestore, { documentId } from "@react-native-firebase/firestore";
import auth from "@react-native-firebase/auth";

export const testUserBatchQuery = async (userIds) => {
  try {
    const userDocs = await firestore()
      .collection("users")
      .where("uid", "in", userIds)
      .get();
    console.log("✅ user batch success:", userDocs.size);
  } catch (err) {
    console.error("❌ user batch error:", err);
  }
};

// testLikesQuery.js
export const testLikesQuery = async (currentUserId) => {
  try {
    const likesSnapshot = await firestore()
      .collectionGroup("likes")
      .where(documentId(), "==", currentUserId)
      .orderBy("createdAt", "desc") // keep it same as your real query
      .get();
    console.log("✅ likes success:", likesSnapshot.size);
  } catch (err) {
    console.error("❌ likes error:", err);
  }
};

// testBookmarksQuery.js
export const testBookmarksQuery = async (currentUserId) => {
  try {
    const bookmarksSnapshot = await firestore()
      .collection("users")
      .doc(currentUserId)
      .collection("bookmarks")
      .get();
    console.log("✅ bookmarks success:", bookmarksSnapshot.size);
  } catch (err) {
    console.error("❌ bookmarks error:", err);
  }
};
