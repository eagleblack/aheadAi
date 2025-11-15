import { createSlice } from "@reduxjs/toolkit";
import firestore from "@react-native-firebase/firestore";

const initialState = {
  jobOptions: [],
  studentOptions: [],
  filters: [],
  experts:[],
  loading: true,
  error: null,
  unsubscribe: null, // to cleanup listener when needed
};

const selectionSlice = createSlice({
  name: "selectionOptions",
  initialState,   
  reducers: {
    setSelectionData: (state, action) => {
      const { jobOptions, studentOptions, filters,experts } = action.payload;
      state.jobOptions = jobOptions || [];
      state.studentOptions = studentOptions || [];
      state.filters = filters || [];
      state.experts=experts  || [];
      state.loading = false;
      state.error = null;
    },
    setSelectionError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    setSelectionLoading: (state, action) => {
      state.loading = action.payload;
    },
    setUnsubscribe: (state, action) => {
      state.unsubscribe = action.payload;
    },
    clearSelectionListener: (state) => {
      if (state.unsubscribe) {
        state.unsubscribe();
      }
      state.unsubscribe = null;
      state.loading = true;
      state.error = null;
    },
  },
});

export const {
  setSelectionData,
  setSelectionError,
  setSelectionLoading,
  setUnsubscribe,
  clearSelectionListener,
} = selectionSlice.actions;

export default selectionSlice.reducer;

/**
 * 🔥 Firestore Realtime Listener Thunk
 * Subscribes to selection_options/default and updates state in real-time.
 */
export const listenToSelectionOptions = () => (dispatch, getState) => {
  dispatch(setSelectionLoading(true));

  const unsubscribe = firestore()
    .collection("selection_options")
    .doc("default")
    .onSnapshot(
      (doc) => {
        if (doc.exists) {
          const data = doc.data();
          dispatch(
            setSelectionData({
              jobOptions: data?.jobOptions || [],
              studentOptions: data?.studentOptions || [],
              filters: data?.filters || [],
               experts: data?.experts ||[]
            })
          );
        } else {
          console.warn("⚠️ No selection_options/default document found.");
          dispatch(
            setSelectionData({
              jobOptions: [],
              studentOptions: [],
              filters: [],
              experts:[]
            })
          );
        }
      },
      (error) => {
        console.error("❌ Error fetching selection options:", error);
        dispatch(setSelectionError(error.message));
      }
    );

  dispatch(setUnsubscribe(unsubscribe));
};
