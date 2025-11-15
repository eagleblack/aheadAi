import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import firestore from "@react-native-firebase/firestore";

// --- Initial State ---
const initialState = {
  news: [],
  lastVisible: null,
  loadingInitial: false,
  loadingMore: false,
  hasMore: true,
  error: null,
  unsubscribe: null, // Firestore listener reference
};

// 🟢 Fetch initial 50 news with real-time updates
export const fetchInitialNews = createAsyncThunk(
  "news/fetchInitialNews",
  async (_, { rejectWithValue }) => {
    try {
      const q = firestore()
        .collection("news")
        .orderBy("addedOn", "desc")
        .limit(50);

      return new Promise((resolve, reject) => {
        const unsubscribe = q.onSnapshot(
          (snapshot) => {
            const newsData = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));

            const lastVisible =
              snapshot.docs.length > 0
                ? snapshot.docs[snapshot.docs.length - 1]
                : null;

            resolve({ newsData, lastVisible, unsubscribe });
          },
          (error) => reject(error)
        );
      });
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// 🟡 Pagination — fetch next 50 without listener
export const fetchMoreNews = createAsyncThunk(
  "news/fetchMoreNews",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { lastVisible, hasMore } = getState().news;
      if (!hasMore || !lastVisible) return { newsData: [], lastVisible: null };

      const nextQuery = firestore()
        .collection("news")
        .orderBy("addedOn", "desc")
        .startAfter(lastVisible)
        .limit(50);

      const snapshot = await nextQuery.get();
      const newsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const newLast =
        snapshot.docs.length > 0
          ? snapshot.docs[snapshot.docs.length - 1]
          : null;

      return { newsData, lastVisible: newLast };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// 🔄 Refresh — reload latest 50 manually (no listener change)
export const refreshNews = createAsyncThunk(
  "news/refreshNews",
  async (_, { rejectWithValue }) => {
    try {
      const q = firestore()
        .collection("news")
        .orderBy("addedOn", "desc")
        .limit(50);

      const snapshot = await q.get();
      const newsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const lastVisible =
        snapshot.docs.length > 0
          ? snapshot.docs[snapshot.docs.length - 1]
          : null;

      return { newsData, lastVisible };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const newsSlice = createSlice({
  name: "news",
  initialState,
  reducers: {
    clearNews: (state) => {
      if (state.unsubscribe) {
        state.unsubscribe(); // Stop real-time listener
      }
      Object.assign(state, initialState);
    },
  },
  extraReducers: (builder) => {
    builder
      // --- Initial Fetch ---
      .addCase(fetchInitialNews.pending, (state) => {
        state.loadingInitial = true;
        state.error = null;
      })
      .addCase(fetchInitialNews.fulfilled, (state, action) => {
        // Cancel previous listener if any
        if (state.unsubscribe) {
          state.unsubscribe();
        }

        const { newsData, lastVisible, unsubscribe } = action.payload;
        state.news = newsData;
        state.lastVisible = lastVisible;
        state.unsubscribe = unsubscribe;
        state.loadingInitial = false;
        state.hasMore = newsData.length === 50;
      })
      .addCase(fetchInitialNews.rejected, (state, action) => {
        state.loadingInitial = false;
        state.error = action.payload;
      })

      // --- Pagination ---
      .addCase(fetchMoreNews.pending, (state) => {
        state.loadingMore = true;
      })
      .addCase(fetchMoreNews.fulfilled, (state, action) => {
        const { newsData, lastVisible } = action.payload;
        // Deduplicate entries (important for hybrid mode)
        const merged = [...state.news, ...newsData];
        const unique = [
          ...new Map(merged.map((item) => [item.id, item])).values(),
        ];
        state.news = unique;
        state.lastVisible = lastVisible;
        state.loadingMore = false;
        state.hasMore = newsData.length === 50;
      })
      .addCase(fetchMoreNews.rejected, (state, action) => {
        state.loadingMore = false;
        state.error = action.payload;
      })

      // --- Refresh ---
      .addCase(refreshNews.pending, (state) => {
        state.loadingInitial = true;
      })
      .addCase(refreshNews.fulfilled, (state, action) => {
        const { newsData, lastVisible } = action.payload;
        state.news = newsData;
        state.lastVisible = lastVisible;
        state.loadingInitial = false;
        state.hasMore = newsData.length === 50;
      })
      .addCase(refreshNews.rejected, (state, action) => {
        state.loadingInitial = false;
        state.error = action.payload;
      });
  },
});

export const { clearNews } = newsSlice.actions;
export default newsSlice.reducer;
