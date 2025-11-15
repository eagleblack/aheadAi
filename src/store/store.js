import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { combineReducers } from "redux";

import userReducer from "./userSlice";
import feedReducer from "./feedSlice"; // 👈 import feed slice
import userPostsSlice from "./userPostsSlice"; // 👈 import feed slice
import commentsReducer from "./commentsSlice"; // 👈 import feed slice
import otherProfileReducer from "./otherProfileSlice"; // 👈 import feed slice
import chatReducer from "./chatSlice"; // 👈 import feed slice
import chatListReducer from "./chatListSlice"; // 👈 import feed slice
import otherProfilePostReducer from "./otherProfilePostSlice"; // 👈 import feed slice
import bookmarkReducer from "./bookMarkSlice"; // 👈 import feed slice
import groupChatReducer from "./groupChatSlice"; // 👈 import feed slice
import newsReducer from "./newsSlice"; // 👈 import feed slice
import auth from "@react-native-firebase/auth"; // assuming Firebase Auth is used
import notificationReducer from "./notificationsSlice"; // 👈 import feed slice
import jobsReducer from "./JobSlice"; // 👈 import feed slice
import companyReducer from "./companySlice"; // 👈 import feed slice
import followerReducer from "./followersSlice"; // 👈 import feed slice
import appliedJobsReducer from "./appliedJobSlice"; // 👈 import feed slice
import selectionReducer from "./selectionSlice"; // 👈 import feed slice












export const logoutUser = async () => {
  try {
    console.log("🚪 Logging out...");

    // 1️⃣ Sign out from Firebase Auth
    await auth().signOut();

    // 2️⃣ Clear Redux persisted storage
    await persistor.purge();
    await AsyncStorage.clear();

    // 3️⃣ Reset all reducers in Redux store
  //  store.dispatch(userLogout()); // optional, if your slice resets manually

    console.log("✅ Logged out successfully.");
  } catch (err) {
    console.error("❌ Logout failed:", err);
  }
};


const persistConfig = {
  key: "root",
  storage: AsyncStorage,
   whitelist: ["user"], // only persist user slice
};

const rootReducer = combineReducers({
  user: userReducer,
  feed: feedReducer, // 👈 add feed slice here
  userPosts:userPostsSlice,
   comments: commentsReducer,
       otherProfile: otherProfileReducer,
       chat:chatReducer,
       chatList:chatListReducer,
       otherProfilePost:otherProfilePostReducer,
       bookmarks:bookmarkReducer,
       groupChat:groupChatReducer,
       news:newsReducer,
       notifications:notificationReducer,
       jobs:jobsReducer,
       company:companyReducer,
       followers:followerReducer,
       appliedJobs:appliedJobsReducer,
       selection:selectionReducer

});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // required for redux-persist
    }),
});

export const persistor = persistStore(store);
