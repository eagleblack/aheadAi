import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/material-icons";

const dummyRequest = {
  id: "3",
  name: "Globex Inc",
  profilePic: "https://randomuser.me/api/portraits/men/32.jpg",
  requestMessage: "Can we schedule an interview tomorrow?",
  isCompany: true,
};

const AcceptRequestScreen = ({ navigation, route }) => {
  const { colors } = useTheme();

  // fallback to dummy data (in real app you’d use route.params)
  const request = route?.params?.request || dummyRequest;

  const handleAccept = () => {
    // Navigate to Message screen with matchId
    navigation.replace("Message", { matchId: request.id });
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["top", "bottom"]}
    >
      {/* Header */}
      <View style={[styles.headerBar, { borderBottomColor: colors.surface }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ flexDirection: "row", alignItems: "center" }}
        >
          <Icon name="arrow-back" size={24} color={colors.text} />
          <Text style={[styles.headerTitle, { color: colors.text, marginLeft: 10 }]}>
            Request
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        <Image source={{ uri: request.profilePic }} style={styles.avatarLarge} />
        <Text style={[styles.name, { color: colors.text }]}>{request.name}</Text>
        <Text style={[styles.requestMessage, { color: colors.textSecondary }]}>
          {request.requestMessage}
        </Text>
      </View>

      {/* Accept Button */}
      <View style={[styles.footer, { borderTopColor: colors.surface }]}>
        <TouchableOpacity
          style={[styles.acceptButton, { backgroundColor: "#4B7BE5" }]}
          onPress={handleAccept}
        >
          <Text style={styles.acceptText}>Accept Request</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default AcceptRequestScreen;

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  contentContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  name: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  requestMessage: {
    fontSize: 16,
    textAlign: "center",
  },
  footer: {
    borderTopWidth: 1,
    padding: 16,
  },
  acceptButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  acceptText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
