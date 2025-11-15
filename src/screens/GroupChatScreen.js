import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
} from "react-native";
import Icon from "@react-native-vector-icons/material-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import { useTheme } from "../context/ThemeContext";
import auth from "@react-native-firebase/auth";
import {
  fetchGroupIfNeeded,
  subscribeToGroupMessages,
  sendGroupMessage,
  joinGroup,
  leaveGroup,
  clearGroupMessages,
  attachUnsubscribe,
  fetchOlderMessages,
} from "../store/groupChatSlice";

const GroupChatScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { groupId } = route.params || {};

  const dispatch = useDispatch();
  const flatListRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [groupData, setGroupData] = useState(null);
  const [lastVisible, setLastVisible] = useState(null);

  const groupChat = useSelector((state) => state.groupChat.groups[groupId]);
  const joinedGroups = useSelector((state) => state.groupChat.joinedGroups);
  const messages = groupChat?.messages || [];
  const isJoined = joinedGroups.some((g) => g.id === groupId);
  const user = auth().currentUser;

  // ------------------------- Initialization -------------------------
  useEffect(() => {
    let unsubscribeFn;

    const initialize = async () => {
      try {
        // Fetch group info & initial messages
        const result = await dispatch(fetchGroupIfNeeded({ groupId })).unwrap();
        setGroupData(result.group);
        setLastVisible(result.lastVisible || null);

        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }).start();

        // Start listening to new incoming messages
        if (result.isJoined) {
          const { unsubscribe } = await dispatch(
            subscribeToGroupMessages({ groupId })
          ).unwrap();
          dispatch(attachUnsubscribe({ groupId, unsubscribe }));
          unsubscribeFn = unsubscribe;
        }
      } catch (err) {
        console.error("[GroupChatScreen] Initialization failed:", err);
      } finally {
        setLoading(false);
      }
    };

    initialize();

    return () => {
      unsubscribeFn?.();
      dispatch(clearGroupMessages({ groupId }));
    };
  }, [groupId]);

  // ------------------------- Send Message -------------------------
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      await dispatch(sendGroupMessage({ groupId, text: newMessage })).unwrap();
      setNewMessage("");
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      });
    } catch (err) {
      console.error("[GroupChatScreen] Send message failed:", err);
    }
  };

  // ------------------------- Pagination (Load Older) -------------------------
  const loadMoreMessages = useCallback(async () => {
    console.log("hey",lastVisible,loadingMore)
    if (!lastVisible || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await dispatch(
        fetchOlderMessages({ groupId, lastVisible })
      ).unwrap();
      setLastVisible(result.lastVisible || null);
    } catch (err) {
      console.error("[GroupChatScreen] Load more failed:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [lastVisible, loadingMore]);

  // ------------------------- Join / Leave -------------------------
  const handleJoinGroup = async () => {
    try {
      await dispatch(joinGroup({ groupId })).unwrap();
      const { unsubscribe } = await dispatch(
        subscribeToGroupMessages({ groupId })
      ).unwrap();
      dispatch(attachUnsubscribe({ groupId, unsubscribe }));

      setGroupData((prev) => ({
        ...prev,
        participants: [...(prev?.participants || []), user.uid],
      }));
    } catch (err) {
      console.error("[GroupChatScreen] Join group failed:", err);
    }
  };

  const handleLeaveGroup = () => {
    Alert.alert(
      "Leave Group?",
      "Are you sure you want to leave this group?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              await dispatch(leaveGroup({ groupId })).unwrap();
              navigation.goBack();
            } catch (err) {
              console.error("[GroupChatScreen] Leave group failed:", err);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  // ------------------------- Render Message -------------------------
  const renderMessage = ({ item }) => {
    const isMe = item.user?.uid === user?.uid;
    return (
      <View
        style={[
          styles.messageRow,
          isMe ? styles.messageRight : styles.messageLeft,
        ]}
      >
        {!isMe && (
          <Image
            source={{ uri: item.user?.profilePic || "https://i.pravatar.cc/100" }}
            style={styles.avatar}
          />
        )}
        <View
          style={[
            styles.messageBubble,
            { backgroundColor: isMe ? "#4B7BE5" : colors.surface },
          ]}
        >
          <Text style={[styles.messageText, { color: isMe ? "white" : colors.text }]}>
            {item.text}
          </Text>
        </View>
        {isMe && (
          <Image
            source={{ uri: item.user?.profilePic || "https://i.pravatar.cc/100" }}
            style={styles.avatar}
          />
        )}
      </View>
    );
  };

  // ------------------------- Loading / Fallback -------------------------
  if (loading) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.surface }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textSecondary, marginTop: 10 }}>
          Loading group...
        </Text>
      </SafeAreaView>
    );
  }

  if (!groupData) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Group not found.</Text>
      </SafeAreaView>
    );
  }

  if (!isJoined) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.headerBar, { borderBottomColor: colors.surface }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ flexDirection: "row", alignItems: "center" }}
          >
            <Icon name="arrow-back" size={24} color={colors.text} />
            <Text style={[styles.headerTitle, { color: colors.text, marginLeft: 10 }]}>
              {groupData.name}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.centered}>
          <Image source={{ uri: groupData.logo }} style={styles.groupLogoLarge} />
          <Text style={[styles.groupDesc, { color: colors.textSecondary }]}>
            {groupData.description || "No description available."}
          </Text>

          <TouchableOpacity onPress={handleJoinGroup} style={styles.joinButton}>
            <Text style={{ color: "white", fontWeight: "600" }}>Join Group</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ------------------------- Joined — Chat -------------------------
  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "padding"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
          style={{ flex: 1 }}
        >
          <View style={{ flex: 1 }}>
            {/* Header */}
            <View style={[styles.headerBar, { borderBottomColor: colors.surface }]}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={{ flexDirection: "row", alignItems: "center" }}
              >
                <Icon name="arrow-back" size={24} color={colors.text} />
                <Text style={[styles.headerTitle, { color: colors.text, marginLeft: 10 }]}>
                  {groupData.name}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleLeaveGroup}>
                <Icon name="exit-to-app" size={24} color={colors.danger || "red"} />
              </TouchableOpacity>
            </View>

            {/* Messages */}
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessage}
              inverted
              contentContainerStyle={{
                padding: 16,
                flexGrow: messages.length === 0 ? 1 : 0,
              }}
              keyboardShouldPersistTaps="handled"
              removeClippedSubviews
              onEndReached={loadMoreMessages}
              onEndReachedThreshold={0.2}
              ListFooterComponent={
                loadingMore ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : null
              }
            />

            {/* Input */}
            <View style={[styles.inputContainer, { backgroundColor: colors.surface }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Type a message..."
                placeholderTextColor={colors.textSecondary}
                value={newMessage}
                onChangeText={setNewMessage}
                onSubmitEditing={handleSendMessage}
                returnKeyType="send"
              />
              <TouchableOpacity
                onPress={handleSendMessage}
                style={styles.sendBtn}
                activeOpacity={0.7}
              >
                <Icon name="send" size={22} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Animated.View>
  );
};

export default GroupChatScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  messageRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 12 },
  messageLeft: { justifyContent: "flex-start" },
  messageRight: { justifyContent: "flex-end", alignSelf: "flex-end" },
  avatar: { width: 36, height: 36, borderRadius: 18, marginHorizontal: 8 },
  messageBubble: {
    maxWidth: "75%",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  messageText: { fontSize: 14, lineHeight: 20 },
  inputContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 2,
    borderTopColor: "#4B7BE5",
    alignItems: "center",
  },
  input: {
    flex: 1,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.05)",
    marginRight: 8,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#4B7BE5",
    alignItems: "center",
    justifyContent: "center",
  },
  joinButton: {
    backgroundColor: "#4B7BE5",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 20,
  },
  groupLogoLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  groupDesc: {
    fontSize: 16,
    textAlign: "center",
    marginHorizontal: 32,
    lineHeight: 22,
  },
});
