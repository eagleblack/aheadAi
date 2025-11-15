// appliedJobsSlice.js
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import firestore from "@react-native-firebase/firestore";
import auth from "@react-native-firebase/auth";

const PAGE_SIZE = 10;

// 🔹 Fetch Applied (Right-Swiped) Jobs with Pagination
export const fetchAppliedJobs = createAsyncThunk(
  "appliedJobs/fetchAppliedJobs",
  async ({ startAfterDoc = null }, { rejectWithValue }) => {
    try {
      const user = auth().currentUser;
      if (!user) throw new Error("User not authenticated");

      let query = firestore()
        .collection("users")
        .doc(user.uid)
        .collection("swipedJobs")
        .where("direction", "==", "right")
        .orderBy("createdAt", "desc")
        .limit(PAGE_SIZE);

      // Apply pagination cursor
      if (startAfterDoc) query = query.startAfter(startAfterDoc);

      const snap = await query.get();
      if (snap.empty)
        return { appliedJobs: [], hasMore: false, lastVisible: null };

      const lastVisible = snap.docs[snap.docs.length - 1];

      // Fetch actual job details
      const appliedJobs = await Promise.all(
        snap.docs.map(async (doc) => {
          const swipeData = doc.data();
          const jobId = doc.id;

          try {
            const jobDoc = await firestore().collection("jobs").doc(jobId).get();
            const jobData = jobDoc.exists ? jobDoc.data() : null;
            return { id: jobId, swipeInfo: swipeData, jobInfo: jobData };
          } catch (err) {
            console.log(`⚠️ Failed to fetch job ${jobId}:`, err);
            return { id: jobId, swipeInfo: swipeData, jobInfo: null };
          }
        })
      );

      return { appliedJobs, hasMore: snap.size === PAGE_SIZE, lastVisible };
    } catch (error) {
      console.log("🔥 fetchAppliedJobs error:", error);
      return rejectWithValue(error.message);
    }
  }
);

// 🔹 Slice
const appliedJobsSlice = createSlice({
  name: "appliedJobs",
  initialState: {
    appliedJobs: [],
    loading: false,
    error: null,
    lastFetchedDoc: null,
    hasMore: true,
    retryCount: 0, // ✅ to prevent infinite retries
  },
  reducers: {
    resetAppliedJobs: (state) => {
      state.appliedJobs = [];
      state.error = null;
      state.lastFetchedDoc = null;
      state.hasMore = true;
      state.retryCount = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAppliedJobs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAppliedJobs.fulfilled, (state, action) => {
        state.loading = false;
        state.retryCount = 0;
        if (action.payload) {
          state.appliedJobs = [
            ...state.appliedJobs,
            ...action.payload.appliedJobs,
          ];
          state.lastFetchedDoc = action.payload.lastVisible;
          state.hasMore = action.payload.hasMore;
        }
      })
      .addCase(fetchAppliedJobs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch applied jobs";
        state.retryCount += 1;

        // ❌ stop pagination if repeated errors or fatal failure
        if (state.retryCount > 2) {
          console.log("🛑 Too many retries — stopping further fetches.");
          state.hasMore = false;
        }
      });
  },
});

export const { resetAppliedJobs } = appliedJobsSlice.actions;
export default appliedJobsSlice.reducer;
