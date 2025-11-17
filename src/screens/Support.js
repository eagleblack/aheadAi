// SupportScreen.js
import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Text as RNText,
} from "react-native";
import { TextInput, Button, Text, Snackbar, ActivityIndicator } from "react-native-paper";
import firestore,{FieldValue} from "@react-native-firebase/firestore";
import auth from "@react-native-firebase/auth";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useTheme } from "../context/ThemeContext";
import { useNavigation } from "@react-navigation/native";

const SupportScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: "" });

  const handleSubmit = async () => {
    if (!title || !description) {
      setSnackbar({ visible: true, message: "Please fill all fields" });
      return;
    }

    setLoading(true);

    try {
      const currentUser = auth().currentUser;

      await firestore().collection("supportTickets").add({
        userId: currentUser ? currentUser.uid : null,
        userName: currentUser ? currentUser.displayName || "Anonymous" : "Anonymous",
        title,
        description,
        status: "open",
        createdAt: FieldValue.serverTimestamp(),
      });

      setSnackbar({ visible: true, message: "Support request submitted successfully!" });
      setTitle("");
      setDescription("");
    } catch (error) {
      console.error("Error submitting support request:", error);
      setSnackbar({ visible: true, message: "Failed to submit. Try again!" });
    } finally {
      setLoading(false);
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
          <RNText style={[styles.headerTitle, { color: colors.text }]}>Support</RNText>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <TextInput
            label="Issue Title"
            value={title}
            onChangeText={setTitle}
            mode="outlined"
            style={styles.input}
            outlineColor={colors.surface}
            activeOutlineColor={colors.primary}
            textColor={colors.text}
            placeholderTextColor={colors.placeholder}
          />

          <TextInput
            label="Describe your issue"
            value={description}
            onChangeText={setDescription}
            mode="outlined"
            multiline
            numberOfLines={5}
            style={[styles.input, { height: 150 }]}
            outlineColor={colors.surface}
            activeOutlineColor={colors.primary}
            textColor={colors.text}
            placeholderTextColor={colors.placeholder}
          />

          <Button
            mode="contained"
            onPress={handleSubmit}
            disabled={loading}
            style={[styles.button, { backgroundColor: colors.primary }]}
          >
            {loading ? <ActivityIndicator color="#fff" /> : "Submit"}
          </Button>

          <Snackbar
            visible={snackbar.visible}
            onDismiss={() => setSnackbar({ visible: false, message: "" })}
            duration={3000}
          >
            {snackbar.message}
          </Snackbar>
        </ScrollView>
      </KeyboardAvoidingView>
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
  content: { padding: 16, flexGrow: 1 },
  input: { marginBottom: 16 },
  button: { marginTop: 16 },
});

export default SupportScreen;
