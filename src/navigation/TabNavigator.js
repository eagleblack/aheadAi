// navigation/TabNavigator.js
import React from "react";
import { View, Text, Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Feather from "react-native-vector-icons/Feather";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import { useTheme } from "../context/ThemeContext";
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Screens
import HomeScreen from "../screens/HomeScreen";
import ExpertScreen from "../screens/ExpertScreen";
import JobScreen from "../screens/JobScreen";
import NotificationScreen from "../screens/NotificationScreen";
import GroupScreen from "../screens/GroupScreen";
import HireScreen from "../screens/HireScreen";
import ProfileScreen from "../screens/Profile";
import PostJobScreen from "../screens/PostJobScreen";
import MessageScreen from "../screens/MessageScreen";
import ChatScreen from "../screens/ChatScreen";

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  const { colors } = useTheme();
  const { user: userData } = useSelector((state) => state.user);
  const unreadCount = useSelector((state) => state.notifications.unreadCount || 0);
  const insets = useSafeAreaInsets();

  const getIconName = (routeName) => {
    switch (routeName) {
      case "Home":
        return "home";
      case "Expert":
        return "explicit"; // MaterialIcon
      case "Job":
      case "Hire":
      case "Post Job":
        return "briefcase";
      case "Chat":
        return "message-circle";
      case "Group":
        return "users";
      case "Profile":
        return "user";
      default:
        return "circle";
    }
  };

  const commonScreenOptions = ({ route }) => ({
    headerShown: false,
    tabBarShowLabel: true,
    tabBarLabelPosition: "below-icon",
    tabBarIcon: ({ color, focused }) => {
      const iconName = getIconName(route.name);
      const isExpert = route.name === "Expert";
      const isNotification = route.name === "Notification";

      return (
        <View
          style={{
            alignItems: "center",
            justifyContent: "center",
            marginTop: Platform.OS === "ios" ? 6 : 2,
          }}
        >
          {isExpert ? (
            <MaterialIcon
              name={iconName}
              size={26}
              color={focused ? colors.primary : colors.textSecondary}
              style={{ marginBottom: 2 }}
            />
          ) : (
            <Feather
              name={iconName}
              size={26}
              color={focused ? colors.primary : colors.textSecondary}
              style={{ marginBottom: 2 }}
            />
          )}

          {/* 🔴 Notification Badge */}
          {isNotification && unreadCount > 0 && (
            <View
              style={{
                position: "absolute",
                top: 0,
                right: -6,
                backgroundColor: "red",
                borderRadius: 10,
                minWidth: 18,
                height: 18,
                justifyContent: "center",
                alignItems: "center",
                paddingHorizontal: 3,
              }}
            >
              <Text
                style={{
                  color: "white",
                  fontSize: 10,
                  fontWeight: "700",
                }}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </Text>
            </View>
          )}
        </View>
      );
    },
    tabBarLabel: ({ focused }) => (
      <Text
        style={{
          fontSize: 11,
          marginTop: 2,
          fontWeight: focused ? "700" : "500",
          color: focused ? colors.primary : colors.textSecondary,
        }}
      >
        {route.name}
      </Text>
    ),
    tabBarStyle: {
      position: "absolute",
      bottom: 0,
      left: 16,
      right: 16,
      elevation: 6,
      backgroundColor: colors.surface,
      borderRadius: 18,
      height: 65 + insets.bottom, // ✅ Add bottom inset dynamically
      paddingBottom: Platform.OS === "ios" ? insets.bottom : 0, // ✅ Only add padding on iOS
      borderTopWidth: 0,
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
    },
  });

  // If userType is "company", show only three tabs
  if (userData?.userType === "company") {
    return (
      <Tab.Navigator screenOptions={commonScreenOptions}>
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Post Job" component={PostJobScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    );
  }

  // Default tab layout for normal users
  return (
    <Tab.Navigator screenOptions={commonScreenOptions}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Expert" component={ExpertScreen} />
      {userData?.userType === "company" ? (
        <Tab.Screen name="Hire" component={HireScreen} />
      ) : (
        <Tab.Screen name="Job" component={JobScreen} />
      )}
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Group" component={GroupScreen} />
    </Tab.Navigator>
  );
};

export default TabNavigator;
