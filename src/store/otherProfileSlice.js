// otherProfileSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import firestore from "@react-native-firebase/firestore";

// ✅ Thunk to fetch another user's profile
export const fetchOtherProfile = createAsyncThunk(
  "otherProfile/fetchOtherProfile",
  async (uid, { rejectWithValue }) => {
    try {
      if (!uid) return rejectWithValue("No UID provided");

      const doc = await firestore().collection("users").doc(uid).get();
      if (doc.exists) {
        return doc.data();
      } else {
        return rejectWithValue("User not found");
      }
    } catch (err) {
      return rejectWithValue(err.message || "Failed to fetch user profile");
    }
  }
);

const otherProfileSlice = createSlice({
  name: "otherProfile",
  initialState: {
    profile: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearOtherProfile: (state) => {
      state.profile = null;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOtherProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOtherProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(fetchOtherProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearOtherProfile } = otherProfileSlice.actions;
export default otherProfileSlice.reducer;
