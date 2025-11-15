import { createSlice } from "@reduxjs/toolkit";

const defaultChat = {
  messages: [],         // newest → oldest
  status: null,
  requestedBy: null,
  acceptedBy: null,
  lastVisible: null,
  hasMore: true,
};

const chatSlice = createSlice({
  name: "chat",
  initialState: { chats: {
  unreadCount: 0, // ✅ NEW
  } },

  reducers: {
    setMessages: (state, action) => {
      const {
        chatId,
        messages = [],
        lastVisible,
        hasMore = true,
        status,
        requestedBy,
        acceptedBy,
      } = action.payload;

      if (!state.chats[chatId]) state.chats[chatId] = { ...defaultChat };

      // 🧭 Always sort newest → oldest
      state.chats[chatId].messages = [...messages].sort(
        (a, b) => b.sentOn?.toMillis?.() - a.sentOn?.toMillis?.()
      );

      state.chats[chatId].lastVisible = lastVisible;
      state.chats[chatId].hasMore = hasMore;
      if (status !== undefined) state.chats[chatId].status = status;
      if (requestedBy !== undefined) state.chats[chatId].requestedBy = requestedBy;
      if (acceptedBy !== undefined) state.chats[chatId].acceptedBy = acceptedBy;
    },

    addNewMessage: (state, action) => {
      const { chatId, message } = action.payload;
      if (!state.chats[chatId]) state.chats[chatId] = { ...defaultChat };

      const msgs = state.chats[chatId].messages;
      const exists = msgs.some((m) => m.id === message.id);
      if (!exists) {
        msgs.unshift(message);
        // optional: keep it sorted to handle timestamp drift
        msgs.sort((a, b) => b.sentOn?.toMillis?.() - a.sentOn?.toMillis?.());
      }
    },

    addOlderMessages: (state, action) => {
      const { chatId, messages = [], lastVisible, hasMore } = action.payload;
      if (!state.chats[chatId]) state.chats[chatId] = { ...defaultChat };

      const existingIds = new Set(state.chats[chatId].messages.map((m) => m.id));
      const newMessages = messages.filter((m) => !existingIds.has(m.id));

      state.chats[chatId].messages.push(...newMessages);
      // re-sort just to be safe
      state.chats[chatId].messages.sort(
        (a, b) => b.sentOn?.toMillis?.() - a.sentOn?.toMillis?.()
      );

      if (lastVisible !== undefined) state.chats[chatId].lastVisible = lastVisible;
      if (hasMore !== undefined) state.chats[chatId].hasMore = hasMore;
    },

    updateChatStatus: (state, action) => {
      const { chatId, status, requestedBy, acceptedBy } = action.payload;
      if (!state.chats[chatId]) state.chats[chatId] = { ...defaultChat };
      if (status !== undefined) state.chats[chatId].status = status;
      if (requestedBy !== undefined) state.chats[chatId].requestedBy = requestedBy;
      if (acceptedBy !== undefined) state.chats[chatId].acceptedBy = acceptedBy;
    },

    clearChat: (state, action) => {
      const { chatId } = action.payload;
      delete state.chats[chatId];
    },

    clearAllChats: (state) => {
      state.chats = {};
    },
      updateUnreadCount: (state, action) => {
      state.unreadCount = action.payload;
    },
  },
});

export const {
  setMessages,
  addNewMessage,
  addOlderMessages,
  updateChatStatus,
  clearChat,
  clearAllChats,
  updateUnreadCount
} = chatSlice.actions;

export default chatSlice.reducer;
