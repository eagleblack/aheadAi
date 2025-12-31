// navigation/TabNavigator.js
import React from "react";
import { View, Text, Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";

import { useTheme } from "../context/ThemeContext";
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Screens
import HomeScreen from "../screens/HomeScreen";
import ExpertScreen from "../screens/ExpertScreen";
import JobScreen from "../screens/JobScreen";
import HireScreen from "../screens/HireScreen";
import ChatScreen from "../screens/ChatScreen";
import GroupScreen from "../screens/GroupScreen";
import PostJobScreen from "../screens/PostJobScreen";

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  const { colors } = useTheme();
  const { user: userData } = useSelector((state) => state.user);
  const unreadCount = useSelector((state) => state.chat.unreadCount || 0);
  const insets = useSafeAreaInsets();

  // 🔵 ICON MAP
  const icons = {
    Dashboard: "th-list",
    Mentor: "user-tie",
    Career: "anchor",
    Message: "envelope",
    Circle: "users",
  };

  const screenOptions = ({ route }) => ({
    headerShown: false,

    tabBarIcon: ({ focused }) => {
      const color = focused ? colors.primary : colors.textSecondary;

      return (
        <View style={{ alignItems: "center", justifyContent: "center" }}>
          <FontAwesome5
            name={icons[route.name]}
            size={22}
            color={color}
            solid
          />

          {/* 🔴 Message badge */}
          {route.name === "Message" && unreadCount > 0 && (
            <View
              style={{
                position: "absolute",
                top: -4,
                right: -10,
                backgroundColor: "red",
                borderRadius: 10,
                minWidth: 18,
                height: 18,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 3,
              }}
            >
              <Text allowFontScaling={false} 
                style={{
                  color: "#fff",
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
      <Text allowFontScaling={false} 
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
      left: 16,
      right: 16,
      bottom: 0,
      height: 65 + insets.bottom,
      paddingBottom: Platform.OS === "ios" ? insets.bottom : 0,
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderTopWidth: 0,
      elevation: 6,
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
    },
  });

  // 🔵 COMPANY USER
  if (userData?.userType === "company") {
    return (
      <Tab.Navigator screenOptions={screenOptions}>
        <Tab.Screen name="Dashboard" component={HomeScreen} />
        <Tab.Screen name="Career" component={PostJobScreen} />
        <Tab.Screen name="Message" component={ChatScreen} />
      </Tab.Navigator>
    );
  }

  // 🔵 NORMAL USER
  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen name="Dashboard" component={HomeScreen} />
      <Tab.Screen name="Mentor" component={ExpertScreen} />

      <Tab.Screen
        name="Career"
        component={userData?.userType === "company" ? HireScreen : JobScreen}
      />

      <Tab.Screen name="Message" component={ChatScreen} />
      <Tab.Screen name="Circle" component={GroupScreen} />
    </Tab.Navigator>
  );
};

export default TabNavigator;
