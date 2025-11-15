import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import firestore from "@react-native-firebase/firestore";
import { getChatId } from "../services/chatService";

const USERS_PER_PAGE = 30;
const SWIPED_USERS_CACHE_LIMIT = 500;

// 🔹 Send initial chat messages on match
const sendMatchMessages = async (chatId, companyId, userId, user) => {
  const ref = firestore().collection("chats").doc(chatId);

  const chatDoc = await ref.get();
  if (!chatDoc.exists) {
    await ref.set(
      {
        participants: [companyId, userId],
        status: "ACCEPTED",
        requestedBy: companyId,
        acceptedBy: companyId,
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
        lastMessage: {
          text: `Company showed interest in ${user.name}`,
          from: companyId,
          sentOn: firestore.FieldValue.serverTimestamp(),
        },
      },
      { merge: true }
    );
  }

  // Add first 2 messages
  await ref.collection("messages").add({
    from: companyId,
    to: userId,
    text: `Company swiped for your profile: ${user.name}`,
    type: "MESSAGE",
    sentOn: firestore.FieldValue.serverTimestamp(),
  });

  await ref.collection("messages").add({
    from: userId,
    to: companyId,
    text: `Hey, I'm interested!`,
    type: "MESSAGE",
    sentOn: firestore.FieldValue.serverTimestamp(),
  });

  await ref.update({
    lastMessage: {
      text: `Hey, I'm interested!`,
      from: userId,
      sentOn: firestore.FieldValue.serverTimestamp(),
    },
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });
};

// 🔹 Fetch users for company with pagination
export const fetchUsersForCompany = createAsyncThunk(
  "company/fetchUsers",
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const company = state.company.company;
      if (!company?.uid) throw new Error("Company not logged in");

      const now = firestore.Timestamp.now();
      const swipedUserCache = company.swipedUsers || [];
      let usersToReturn = [];
      let lastDoc = null;
      let keepFetching = true;

      while (keepFetching && usersToReturn.length < USERS_PER_PAGE) {
        let query = firestore()
          .collection("users")
          .where("userType", "!=", "company")
          .orderBy("userType") // Firestore requires orderBy when using !=
          .limit(USERS_PER_PAGE);

        if (lastDoc) query = query.startAfter(lastDoc);

        const snapshot = await query.get();
        if (snapshot.empty) break;

        lastDoc = snapshot.docs[snapshot.docs.length - 1];

        for (const doc of snapshot.docs) {
          const userData = doc.data();

          if (swipedUserCache.includes(doc.id)) continue;

          // Check if user has swiped this company recently
          const recentSwipeDoc = await firestore()
            .collection("users")
            .doc(doc.id)
            .collection("swipedCompanies")
            .doc(company.uid)
            .get();

          const hasUserSwipedCompanyRecently =
            recentSwipeDoc.exists &&
            recentSwipeDoc.data().validUntil.toDate() > new Date();

          usersToReturn.push({
            id: doc.id,
            ...userData,
            hasUserSwipedCompanyRecently,
          });

          if (usersToReturn.length >= USERS_PER_PAGE) break;
        }

        if (usersToReturn.length === 0 && snapshot.size < USERS_PER_PAGE) {
          keepFetching = false;
        }
      }

      return usersToReturn;
    } catch (error) {
      console.log("🔥 fetchUsersForCompany error:", error);
      return rejectWithValue(error.message);
    }
  }
);

// 🔹 Company swipe user
export const swipeUser = createAsyncThunk(
  "company/swipeUser",
  async ({ user, direction }, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const company = state.company.company;
      const now = firestore.Timestamp.now();

      const companyRef = firestore().collection("users").doc(company.uid);
      const swipedUserRef = companyRef.collection("swipedUsers").doc(user.id);
      const swipeRef = firestore().collection("swipes").doc();
      const batch = firestore().batch();

      // Step 1: Check if company already swiped this user
      const existingSwipe = await swipedUserRef.get();
      if (existingSwipe.exists) {
        console.log(`⏭️ Swipe skipped — already swiped user: ${user.name}`);
        return { userId: user.id, direction: existingSwipe.data().direction };
      }

      // Step 2: Save new swipe info
      batch.set(swipeRef, {
        swiperId: company.uid,
        targetId: user.id,
        targetType: "user",
        direction,
        createdAt: now,
        validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
        userId: user.id,
      });

      batch.set(swipedUserRef, {
        direction,
        createdAt: now,
        validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      });

      await batch.commit();

      // Step 3: Check if user already swiped this company
      const userSwipeDoc = await firestore()
        .collection("users")
        .doc(user.id)
        .collection("swipedCompanies")
        .doc(company.uid)
        .get();

      if (userSwipeDoc.exists && userSwipeDoc.data().validUntil.toDate() > new Date()) {
        console.log("💫 MATCH! User already swiped this company.");
        const chatId = getChatId(company.uid, user.id);
        await sendMatchMessages(chatId, company.uid, user.id, user);
      }

      return { userId: user.id, direction };
    } catch (error) {
      console.log("⚠️ swipeUser error:", error);
      return rejectWithValue(error.message);
    }
  }
);

// 🔹 Redux slice
const companySlice = createSlice({
  name: "company",
  initialState: {
    users: [],
    loading: false,
    error: null,
  },
  reducers: {
    resetUsers: (state) => {
      state.users = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsersForCompany.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsersForCompany.fulfilled, (state, action) => {
        state.loading = false;
        state.users = [...state.users, ...action.payload];
      })
      .addCase(fetchUsersForCompany.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch users";
      })
      .addCase(swipeUser.rejected, (state, action) => {
        state.error = action.payload || "Failed to record swipe";
      });
  },
});

export const { resetUsers } = companySlice.actions;
export default companySlice.reducer;
