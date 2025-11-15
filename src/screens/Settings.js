// SettingsScreen.js
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useTheme } from "../context/ThemeContext";

import { useNavigation } from "@react-navigation/native";
import { logoutUser } from "../store/store";

const settingsItems = [
  { label: "My Account", icon: "account-circle-outline", type: "navigate", route: "Profile" },
  { label: "Feedback & Support", icon: "message-question-outline", type: "navigate", route: "Support" },
  { label: "FAQs", icon: "help-circle-outline", type: "navigate", route: "FAQ" },
  {
    label: "Privacy Policy",
    icon: "lock-outline",
    type: "link",
    url: "https://ahead-9fb4c.web.app/#privacy-policy",
  },
  {
    label: "Terms of Service",
    icon: "file-document-outline",
    type: "link",
    url: "https://ahead-9fb4c.web.app/#terms-of-service",
  },
  { label: "About Ahead", icon: "information-outline", type: "navigate", route: "About" },
  {
    label: "Share App",
    icon: "share-variant-outline",
    type: "link",
    url: "https://play.google.com/store/apps/details?id=com.ahead",
  },
  { label: "Logout", icon: "logout", type: "action" },
];

const SettingsScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();

  const handlePress = async (item) => {
    switch (item.type) {
      case "navigate":
        navigation.navigate(item.route);
        break;
      case "link":
       
          await Linking.openURL(item.url);
      
        break;
      case "action":
        Alert.alert(
          "Logout",
          "Are you sure you want to log out?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Logout",
              style: "destructive",
              onPress: async () => {
                await logoutUser();
               
              },
            },
          ],
          { cancelable: true }
        );
        break;
      default:
        console.log(item.label);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.surface }]}>
        <TouchableOpacity
          style={styles.headerLeft}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color={colors.text} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>

      {/* Settings Items */}
      <ScrollView contentContainerStyle={styles.content}>
        {settingsItems.map((item, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.item}
            activeOpacity={0.7}
            onPress={() => handlePress(item)}
          >
            <Icon name={item.icon} size={22} color={colors.text} />
            <Text style={[styles.itemLabel, { color: colors.text }]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    paddingHorizontal: 12,
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "600", marginLeft: 10 },
  content: { paddingVertical: 12 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  itemLabel: { marginLeft: 16, fontSize: 16, fontWeight: "500" },
});

export default SettingsScreen;
