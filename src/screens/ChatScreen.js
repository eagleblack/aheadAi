import React, { useEffect, useState } from "react";
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/material-icons";
import { useDispatch, useSelector } from "react-redux";
import {
  clearChatList,
  listenToRequestedChats,
} from "../store/chatListSlice";
import auth from "@react-native-firebase/auth";

const ChatScreen = ({ navigation }) => {   
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const { chats, loading } = useSelector((state) => state.chatList);

  const [activeTab, setActiveTab] = useState("Inbox");
  const currentUserId = auth().currentUser?.uid;

  // ✅ Setup real-time listener
  useEffect(() => {
    if (!currentUserId) return;
    dispatch(clearChatList());
    const unsubscribe = listenToRequestedChats(currentUserId, dispatch);
    return () => unsubscribe();
  }, [dispatch, currentUserId]);

  // ✅ Split chats
  const inboxChats = chats.filter((chat) => chat.status !== "REQUESTED");
  const requestChats = chats.filter((chat) => chat.status === "REQUESTED");
  const data = activeTab === "Inbox" ? inboxChats : requestChats;

  const requestCount = requestChats.length;

  // ✅ Render each chat row
  const renderItem = ({ item }) => {
    const lastMsg =
      typeof item.lastMessage === "string"
        ? item.lastMessage
        : item.lastMessage?.text || "No messages yet";

    const user = item.user || {};

    // 🔹 Highlight logic for unread
    const isUnread =
      item.lastMessage?.from !== currentUserId &&
      item.lastMessage?.status === "UNREAD";

    return (
      <TouchableOpacity
        style={[
          styles.chatCard,
          {
            backgroundColor: isUnread
              ? colors.surface 
              : colors.surface,
          },
        ]}
        onPress={() =>
          navigation.navigate("Message", {
            otherUserId: user.uid,
            otherUserName: user.name,
            otherUserAvatar: user.avatar,
          })
        }
      >
        <Image
          source={
            user.avatar
              ? { uri: user.avatar }
              : require("../assets/logo_svg.png")
          }
          style={styles.avatar}
        />

        <View style={styles.chatContent}>
          <Text
            style={[
              styles.name,
              {
                color: colors.text,
                fontWeight: isUnread ? "700" : "500",
              },
            ]}
          >
            {user.name || "Unknown User"}
          </Text>
          <Text
            style={[
              styles.lastMessage,
              {
                color: isUnread ? colors.text : colors.textSecondary,
                fontWeight: isUnread ? "600" : "400",
              },
            ]}
            numberOfLines={1}
          >
            {lastMsg}
          </Text>
        </View>

        {/* Timestamp or unread indicator */}
        <View style={{ alignItems: "flex-end" }}>
          {item.updatedAt && (
            <Text
              style={[
                styles.timestamp,
                {
                  color: isUnread
                    ? "#4B7BE5"
                    : colors.textSecondary,
                  fontWeight: isUnread ? "600" : "400",
                },
              ]}
            >
              {new Date(item.updatedAt.toDate()).toLocaleDateString()}
            </Text>
          )}

          {/* 🔹 Unread dot */}
          {isUnread && <View style={styles.unreadDot} />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={[{ flex: 1, backgroundColor: colors.background }]}
      edges={["bottom", "top"]}
    >
      {/* Header */}
      <View style={[styles.headerBar, { borderBottomColor: colors.surface }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ flexDirection: "row", alignItems: "center" }}
        >
          <Icon name="arrow-back" size={24} color={colors.text} />
          <Text
            style={[styles.headerTitle, { color: colors.text, marginLeft: 10 }]}
          >
            Your Inbox
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View
        style={[styles.tabContainer, { borderBottomColor: colors.surface }]}
      >
        {["Inbox", "Requests"].map((tab) => {
          const isActive = activeTab === tab;
          const showBadge = tab === "Requests" && requestCount > 0;

          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tab,
                isActive && {
                  borderBottomColor: "#4B7BE5",
                  borderBottomWidth: 3,
                },
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text
                  style={{
                    color: isActive ? "#4B7BE5" : colors.textSecondary,
                    fontWeight: isActive ? "700" : "500",
                  }}
                >
                  {tab}
                </Text>
                {showBadge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{requestCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Chat List */}
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {loading ? (
          <Text
            style={{ color: colors.text, textAlign: "center", marginTop: 20 }}
          >
            Loading chats...
          </Text>
        ) : (
          <FlatList
            data={data}
            keyExtractor={(item) => item.chatId}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={
              <Text
                style={{
                  color: colors.textSecondary,
                  textAlign: "center",
                  marginTop: 20,
                }}
              >
                No {activeTab.toLowerCase()} chats found
              </Text>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 10,
    paddingHorizontal: 16,
  },
  chatCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  chatContent: {
    flex: 1,
    justifyContent: "center",
  },
  name: {
    fontSize: 16,
  },
  lastMessage: {
    fontSize: 14,
    marginTop: 4,
  },
  timestamp: {
    fontSize: 12,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
  },
  badge: {
    backgroundColor: "#4B7BE5",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    minWidth: 20,
    alignItems: "center",
  },
  badgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4B7BE5",
    marginTop: 4,
    alignSelf: "flex-end",
  },
});
