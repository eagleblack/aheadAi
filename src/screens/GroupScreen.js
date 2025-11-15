// GroupScreen.js
import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from "react-native";
import { Card, Divider } from "react-native-paper";
import Icon from "@react-native-vector-icons/material-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { useDispatch, useSelector } from "react-redux";
import { subscribeToGroups } from "../store/groupChatSlice";

const GroupScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const dispatch = useDispatch();

  const { joinedGroups } = useSelector((state) => state.groupChat);

  // 🔹 Subscribe to joined groups in real-time
  useEffect(() => {
    const subscribe = async () => {
      const { unsubscribeJoined } = await dispatch(subscribeToGroups()).unwrap();
      return () => unsubscribeJoined?.();
    };
    subscribe();
  }, [dispatch]);

  // 🔹 Render each joined group
  const renderGroup = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      style={styles.groupItem}
      onPress={() => navigation.navigate("GroupChats", { groupId: item.id })}
    >
      <Card style={[styles.groupCard, { backgroundColor: colors.surface }]}>
        <Card.Content style={styles.groupContent}>
          <View style={styles.row}>
            {/* Logo */}
            <Image
              source={{ uri: item.logo }}
              style={[styles.groupLogo, { borderColor: colors.background }]}
            />

            {/* Info */}
            <View style={styles.textContainer}>
              <Text style={[styles.groupName, { color: colors.text }]}>
                {item.name}
              </Text>
              <Text
                style={[styles.lastMessage, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {item.lastMessage?.text || "No messages yet"}
              </Text>

              <View style={styles.memberRow}>
                <Icon
                  name="groups"
                  size={14}
                  color={colors.textSecondary}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[styles.memberCount, { color: colors.textSecondary }]}
                >
                  {item.memberCount || 0} members
                </Text>
              </View>
            </View>

            {/* Time */}
            <View style={styles.rightSection}>
              {item.lastMessage?.createdAt ? (
                <Text style={[styles.timeAgo, { color: colors.textSecondary }]}>
                  {formatTimeAgo(item.lastMessage.createdAt?.toDate?.())}
                </Text>
              ) : null}
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Groups</Text>

        {/* + Icon (Discover / Add Groups) */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate("AllGroupScreen")}
        >
          <Icon name="add" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* List of Joined Groups */}
      <FlatList
        data={joinedGroups}
        renderItem={renderGroup}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ItemSeparatorComponent={() => (
          <Divider
            style={{
              marginVertical: 8,
              backgroundColor: colors.secondary,
              opacity: 0.4,
            }}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="group" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No Groups
            </Text>
            <Text
              style={[styles.emptyMessage, { color: colors.textSecondary }]}
            >
              You have no group messages yet.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

// 🔹 Helper: Format time ago
function formatTimeAgo(date) {
  if (!date) return "";
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString();
}

// 🔹 Styles
const styles = StyleSheet.create({
  listContainer: { padding: 12 },
  groupItem: {},
  groupCard: { borderRadius: 12, elevation: 2 },
  groupContent: { paddingVertical: 10 },
  row: { flexDirection: "row", alignItems: "center" },
  groupLogo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    marginRight: 12,
  },
  textContainer: { flex: 1 },
  groupName: { fontSize: 16, fontWeight: "600" },
  lastMessage: { fontSize: 14, marginTop: 2 },
  memberRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  memberCount: { fontSize: 13 },
  rightSection: { alignItems: "flex-end" },
  timeAgo: { fontSize: 12 },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: { fontSize: 16, textAlign: "center", lineHeight: 24 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: "bold" },
  addButton: {
    padding: 6,
    borderRadius: 20,
  },
});

export default GroupScreen;
