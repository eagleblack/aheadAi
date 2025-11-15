import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  TextInput,
  TouchableOpacity,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import Icon from "@react-native-vector-icons/material-icons";
import { useTheme } from "../context/ThemeContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchInitialMessages,
  fetchMoreMessages,
  listenToMessages,
  listenToChatStatus,
  sendMessage,
  acceptChatRequest,
  startChat,
  getChatId,
  markChatAsRead,
} from "../services/chatService";
import auth from "@react-native-firebase/auth";
import { addNewMessage } from "../store/chatSlice";

const DUMMY_PROFILE_PIC = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

const MessageScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();

  const { otherUserId, otherUserName = "Ahead User", otherUserAvatar = DUMMY_PROFILE_PIC } = route.params || {};
  const currentUserId = auth().currentUser?.uid;
  const chatId = getChatId(currentUserId, otherUserId);

  const { user: userData } = useSelector((state) => state.user);
  const chat = useSelector((state) => state.chat.chats[chatId]);
  const messages = chat?.messages || [];
  const chatStatus = chat?.status;
  const requestedBy = chat?.requestedBy;
  const isRequester = requestedBy === String(currentUserId);

  const flatListRef = useRef();
  const hasScrolledInitially = useRef(false);

  const [newMessage, setNewMessage] = useState("");
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // 🔹 Initialize chat
useEffect(() => {
  let unsubMessages, unsubStatus;

  const init = async () => {
    await fetchInitialMessages(chatId, dispatch);
    unsubMessages = listenToMessages(chatId, dispatch);
    unsubStatus = listenToChatStatus(chatId, dispatch);

    // ✅ Mark chat as read once opened
    setTimeout(() => {
      markChatAsRead(chatId);
    }, 600);
  };

  init();

  return () => {
    unsubMessages && unsubMessages();
    unsubStatus && unsubStatus();
  };
}, [chatId, dispatch]);

  // 🔹 Scroll to bottom on first render or new incoming messages
  useEffect(() => {
    if (flatListRef.current && messages.length) {
      const lastMsg = messages[0]; // inverted
      const shouldScroll = !hasScrolledInitially.current || (lastMsg && lastMsg.from !== currentUserId);
      if (shouldScroll) {
        flatListRef.current.scrollToOffset({ offset: 0, animated: true });
        hasScrolledInitially.current = true;
      }
    }
  }, [messages.length]);

  // 🔹 Keyboard listeners
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // 🔹 Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    const senderUsername=userData?.name || "Ahead User"
    const text = newMessage.trim();
    const optimisticMessage = {
      id: Date.now().toString(),
      from: currentUserId,
      to: otherUserId,
      text,
      type: "MESSAGE",
      sentOn: { toMillis: () => Date.now() },
    };
    // dispatch(addNewMessage({ chatId, message: optimisticMessage }));

    if (!chatStatus) {
      await startChat(currentUserId, otherUserId, text,senderUsername);
    } else {
      await sendMessage(chatId, currentUserId, otherUserId, text,senderUsername);
    }
    setNewMessage("");
  };

  // 🔹 Accept chat request
  const handleAccept = async () => {
    await acceptChatRequest(chatId, currentUserId);
  };

  // 🔹 Load older messages
  const loadOlderMessages = async () => {
    if (!chat?.hasMore || loadingOlder) return;
    setLoadingOlder(true);
    const lastVisible = chat.lastVisible;
    await fetchMoreMessages(chatId, lastVisible, dispatch);
    setLoadingOlder(false);
  };

  // 🔹 Render message
  const renderMessage = ({ item }) => {
    const isMe = item.from === currentUserId;
    const avatarUri = isMe ? userData?.profilePic || DUMMY_PROFILE_PIC : otherUserAvatar;

    return (
      <View style={[styles.messageRow, isMe ? styles.messageRight : styles.messageLeft]}>
        {!isMe && <Image source={{ uri: avatarUri }} style={styles.avatar} />}
        <View
          style={[
            styles.messageBubble,
            {
              backgroundColor: isMe ? "#4B7BE5" : colors.surface,
              borderBottomRightRadius: isMe ? 0 : 16,
              borderBottomLeftRadius: isMe ? 16 : 0,
            },
          ]}
        >
          <Text style={[styles.messageText, { color: isMe ? "white" : colors.text }]}>{item.text}</Text>
        </View>
        {isMe && <Image source={{ uri: avatarUri }} style={styles.avatar} />}
      </View>
    );
  };

  // 🔹 Input bar
  const renderInputBar = () => (
    <View style={[styles.inputContainer, { backgroundColor: colors.surface }]}>
      <TouchableOpacity style={styles.iconBtn}>
        <Icon name="image" size={26} color={colors.textSecondary} />
      </TouchableOpacity>
      <TextInput
        style={[styles.input, { color: colors.text }]}
        placeholder="Type a message..."
        placeholderTextColor={colors.textSecondary}
        value={newMessage}
        onChangeText={setNewMessage}
        returnKeyType="send"
        onSubmitEditing={handleSendMessage}
      />
      <TouchableOpacity onPress={handleSendMessage} style={styles.sendBtn}>
        <Icon name="send" size={22} color="white" />
      </TouchableOpacity>
    </View>
  );

  // 🔹 Footer
  const renderFooter = () => {
    if (!chatStatus && messages.length === 0) {
      return (
        <View style={styles.noticeWrapper}>
          <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
            Please respect the community before starting a conversation.
          </Text>
          {renderInputBar()}
        </View>
      );
    }

    if (chatStatus === "REQUESTED") {
      if (isRequester) {
        return (
          <View style={styles.noticeCard}>
            <Icon name="hourglass-empty" size={20} color="#FF9800" />
            <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
              Waiting for {otherUserName} to accept your request...
            </Text>
          </View>
        );
      } else {
        return (
          <View style={styles.noticeCard}>
            <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
              You’ve received a message request.
            </Text>
            <TouchableOpacity onPress={handleAccept} style={styles.acceptBtn}>
              <Text style={{ color: "white", fontWeight: "600" }}>Accept Request</Text>
            </TouchableOpacity>
          </View>
        );
      }
    }

    if (chatStatus === "CLOSED") {
      return (
        <View style={styles.noticeCard}>
          <Icon name="lock" size={20} color={colors.textSecondary} />
          <Text style={[styles.noticeText, { color: colors.textSecondary }]}>This chat is closed.</Text>
        </View>
      );
    }

    return renderInputBar();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.headerBar, { borderBottomColor: colors.surface }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ flexDirection: "row", alignItems: "center" }}
        >
          <Icon name="arrow-back" size={24} color={colors.text} />
          <Text style={[styles.headerTitle, { color: colors.text, marginLeft: 10 }]}>
            {otherUserName || "Chat"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Chat Area */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          inverted
          contentContainerStyle={{ padding: 16, paddingTop: 16 }}
          showsVerticalScrollIndicator={false}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10,
          }}
          onEndReached={loadOlderMessages}
          onEndReachedThreshold={0.1}
          ListFooterComponent={
            loadingOlder ? (
              <View style={{ paddingVertical: 10 }}>
                <ActivityIndicator size="small" color="#4B7BE5" />
              </View>
            ) : null
          }
        />
        <View style={{ paddingBottom: keyboardHeight }}>{renderFooter()}</View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default MessageScreen;

const styles = StyleSheet.create({
  headerBar: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: "700" },

  messageRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 12 },
  messageLeft: { justifyContent: "flex-start" },
  messageRight: { justifyContent: "flex-end", alignSelf: "flex-end" },
  avatar: { width: 36, height: 36, borderRadius: 18, marginHorizontal: 6 },

  messageBubble: { maxWidth: "70%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, elevation: 2 },
  messageText: { fontSize: 14, lineHeight: 20 },

  inputContainer: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#E0E0E0" },
  input: { flex: 1, height: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.05)", marginHorizontal: 6 },
  sendBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#4B7BE5", alignItems: "center", justifyContent: "center", elevation: 3 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },

  noticeWrapper: { alignItems: "center", padding: 16 },
  noticeCard: { flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 12, margin: 10, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.05)" },
  noticeText: { fontSize: 14, textAlign: "center", marginVertical: 10 },
  acceptBtn: { marginTop: 10, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: "#4B7BE5", elevation: 2 },
});
