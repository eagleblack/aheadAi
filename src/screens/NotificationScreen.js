import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
} from "react-native";
import { Card } from "react-native-paper";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchNotifications,
  listenToNotifications,
  clearNotifications,
  markAllNotificationsRead,
} from "../store/notificationsSlice";
import { useTheme } from "../context/ThemeContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { useIsFocused } from "@react-navigation/native";
import Icon from "@react-native-vector-icons/material-icons";

const NotificationsScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const { items, liveItems, loading } = useSelector(
    (state) => state.notifications
  );
  const { user: userData } = useSelector((state) => state.user);

  const notifications = liveItems.length ? liveItems : items;

  // ----------------------------------------------------------------
  // 🔹 Fetch & Listen for Notifications
  // ----------------------------------------------------------------
  const isFocused = useIsFocused();

  useEffect(() => {
    if (!userData?.uid) return;

    const setupNotifications = async () => {
      try {
        // 1️⃣ Start listener
        const unsubscribe = dispatch(listenToNotifications(userData.uid));

        // 2️⃣ Initial fetch
        await dispatch(fetchNotifications({ userId: userData.uid })).unwrap();

        // 3️⃣ Mark all read when first opened
        await dispatch(markAllNotificationsRead(userData.uid));

        // Cleanup
        return () => {
          unsubscribe && unsubscribe();
          dispatch(clearNotifications());
        };
      } catch (error) {
        console.error("[NotificationsScreen] Error setting up notifications:", error);
      }
    };

    const cleanup = setupNotifications();

    return () => {
      cleanup.then((fn) => fn && fn());
    };
  }, [dispatch, userData?.uid]);

  // ✅ NEW EFFECT → whenever tab becomes active
  useEffect(() => {
    if (isFocused && userData?.uid) {
      dispatch(markAllNotificationsRead(userData.uid));
    }
  }, [isFocused, userData?.uid]);

  // ----------------------------------------------------------------
  // 🔹 Refresh Handler
  // ----------------------------------------------------------------
  const onRefresh = async () => {
    if (!userData?.uid) return;
    await dispatch(fetchNotifications({ userId: userData.uid }));
  };

  // ----------------------------------------------------------------
  // 🔹 Handle Notification Click
  // ----------------------------------------------------------------
  const handleNotificationPress = (n) => {
    switch (n.notificationType) {
      case "NEW_SERVICE_REQUEST":
        navigation.navigate("Bookings");
        break;
      case "EXPERT_VERIFICATION_ACTION":
        navigation.navigate("ExpertonScreen");
        break;
      case "COMPANY_VERIFICATION_APPROVED":
        navigation.navigate("JobPost");
        break;
      case "FOLLOW":
        // Navigate to the follower’s profile
        navigation.navigate("OtherProfile", {
          uid: n.notificationFrom,
        });
        break;
      default:
        // Other notification types (LIKE, COMMENT, etc.)
        break;
    }
  };

  // ----------------------------------------------------------------
  // 🔹 Generate Notification Message
  // ----------------------------------------------------------------
  const getNotificationMessage = (n) => {
    const name = n.senderName === "Admin" ? "AHEAD" : n.senderName || "AHEAD";

    switch (n.notificationType) {
      case "LIKE":
        return `${name} and ${n.totalUsers || 0} others liked your post`;
      case "COMMENT":
        return `${name} commented on your post`;
      case "FOLLOW":
        return `${name} started following you.`;
      case "EXPERT_VERIFICATION_ACTION":
        return `${n.notificationText || ""} We will notify you soon.`;
      case "WELCOME":
        return `Welcome to Ahead! Grab Opportunity and stay connected like never before.`;
      case "NEW_SERVICE_REQUEST":
        return `${name} requested a new service.`;
      case "EXPERT_VERIFICATION_APPROVED":
        return `Your expert verification was approved.`;
      case "COMPANY_VERIFICATION_ACTION":
        return `Your company verification is under review.`;
      case "COMPANY_VERIFICATION_APPROVED":
        return `Your company verification was approved.`;
      case "SERVICE_REQUEST_ACCEPTED":
        return `Your requested service was accepted by ${name}.`;
      case "SERVICE_REQUEST_REJECTED":
        return `Your requested service was rejected by ${name}.`;
      default:
        return n.notificationText || "You have a new notification.";
    }
  };

  // ----------------------------------------------------------------
  // 🔹 Render Each Notification
  // ----------------------------------------------------------------
  const renderNotification = ({ item }) => {
    const isAdminOrMissingPic =
      item.notificationFrom === "ADMIN" || !item.senderProfilePic;

    const profileSource = isAdminOrMissingPic
      ? require("../assets/logo_svg.png")
      : { uri: item.senderProfilePic };

    const name =
      item.notificationFrom === "ADMIN" ? "AHEAD" : item.senderName || "AHEAD";

    return (
      <TouchableOpacity onPress={() => handleNotificationPress(item)}>
        <Card
          style={[styles.notificationCard, { backgroundColor: colors.surface }]}
        >
          <Card.Content style={styles.notificationContent}>
            <Image source={profileSource} style={styles.avatar} />
            <View style={styles.textContainer}>
              <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
              <Text
                style={[styles.message, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {getNotificationMessage(item)}
              </Text>
              {item.createdOn && (
                <Text style={[styles.time, { color: colors.textSecondary }]}>
                  {item.createdOn.toDate
                    ? item.createdOn.toDate().toLocaleString()
                    : ""}
                </Text>
              )}
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  // ----------------------------------------------------------------
  // 🔹 Main Render
  // ----------------------------------------------------------------
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
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
                Notification
              </Text>
            </TouchableOpacity>
          </View>
      {/* Notification List */}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} />
        }
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 60,
        }}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyState}>
              <Image
                source={require("../assets/logo_svg.png")}
                style={{ width: 100, height: 100, marginBottom: 16 }}
              />
              <Text
                style={[styles.emptyText, { color: colors.textSecondary }]}
              >
                No notifications yet.
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
};

export default NotificationsScreen;

// ----------------------------------------------------------------
// 🔹 Styles
// ----------------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 20, fontWeight: "bold" },
  notificationCard: {
    marginBottom: 10,
    borderRadius: 12,
    elevation: 2,
  },
  notificationContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  textContainer: { flex: 1 },
  name: { fontSize: 16, fontWeight: "600", marginBottom: 2 },
  message: { fontSize: 14, lineHeight: 20 },
  time: { fontSize: 12, marginTop: 4 },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
  },
  emptyText: { fontSize: 16 },
   headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
});
