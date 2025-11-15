// BecomeExpertScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  PermissionsAndroid,
  Modal,
  FlatList,
} from "react-native";
import { Card } from "react-native-paper";
import Icon from "@react-native-vector-icons/material-icons";
import { useTheme } from "../context/ThemeContext";
import { pick, types, isCancel } from "@react-native-documents/picker";
import storage from "@react-native-firebase/storage";
import firestore from "@react-native-firebase/firestore";
import { useSelector } from "react-redux";
import RNFS from "react-native-fs";

const BecomeExpertScreen = ({ onVerified }) => {
  const { colors } = useTheme();
  const { user: userData } = useSelector((state) => state.user);
  const { experts } = useSelector((state) => state.selection);

  const [form, setForm] = useState({
    name: "",
    profession: "",
    bio: "",
    expertise: "",
    expertCategory: "",
  });
  const [certificates, setCertificates] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  // --- Request Android storage permission
  async function requestStoragePermission() {
    if (Platform.OS !== "android") return true;
    try {
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
        ]);
        return (
          granted["android.permission.READ_MEDIA_IMAGES"] === PermissionsAndroid.RESULTS.GRANTED ||
          granted["android.permission.READ_MEDIA_VIDEO"] === PermissionsAndroid.RESULTS.GRANTED ||
          granted["android.permission.READ_MEDIA_AUDIO"] === PermissionsAndroid.RESULTS.GRANTED
        );
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch (err) {
      console.warn("Permission error:", err);
      return false;
    }
  }

  // --- Pick multiple files (up to 3)
  const handlePickCertificates = async () => {
    console.log("Picker button pressed ✅");
    try {
      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        Alert.alert("Permission Denied", "Cannot pick files without permission");
        return;
      }

      console.log("Opening picker now...");
      const results = await pick({
        allowMultiSelection: true,
        type: [types.pdf, types.images],
      });

      if (!results || results.length === 0) {
        console.log("No files selected or cancelled");
        return;
      }

      console.log("Picked files:", results);
      setCertificates(results.slice(0, 3));
    } catch (err) {
      if (isCancel(err)) console.log("Picker cancelled");
      else console.error("Picker error:", err);
    }
  };

  // --- Upload files to Firebase Storage and get URLs
  const uploadCertificates = async (uid) => {
    const urls = [];
    for (const file of certificates) {
      try {
        const destPath = `${RNFS.TemporaryDirectoryPath}/${file.name}`;
        await RNFS.copyFile(file.uri, destPath);

        const ref = storage().ref(`experts/${uid}/certificates/${Date.now()}_${file.name}`);
        await ref.putFile(destPath);
        const url = await ref.getDownloadURL();
        urls.push(url);
        await RNFS.unlink(destPath);
      } catch (err) {
        console.error("Upload error for file:", file.name, err);
        throw err;
      }
    }
    return urls;
  };

  // --- Handle submit
  const handleSubmitVerification = async () => {
    if (!form.name || !form.profession || !form.bio || !form.expertCategory) {
      Alert.alert("Validation Error", "Please fill in all required fields");
      return;
    }

    setUploading(true);

    try {
      const uid = userData?.uid;
      if (!uid) throw new Error("User not logged in");

      let certUrls = [];
      if (certificates.length > 0) {
        certUrls = await uploadCertificates(uid);
      }

      const expertData = {
        name: form.name.trim(),
        expertProfession: form.profession.trim(),
        expertBio: form.bio.trim(),
        expertCategory: form.expertCategory,
        expertise:
          form.expertise
            ?.split(",")
            ?.map((x) => x.trim())
            ?.filter((x) => x) || [],
        certificates: certUrls,
        expertVerification: "pending",
        submittedAt: firestore.FieldValue.serverTimestamp(),
      };

      await firestore().collection("users").doc(uid).update(expertData);

      firestore()
        .collection("notifications")
        .add({
          notificationFrom: "ADMIN",
          notificationTo: uid,
          notificationType: "EXPERT_VERIFICATION_ACTION",
          notificationText:
            "Your expert verification request has been received!",
          comment: "Expert verification form submitted successfully.",
          createdOn: firestore.FieldValue.serverTimestamp(),
          status:'UNREAD',
        })
        .catch((err) => console.error("Notification add failed:", err));

      setUploading(false);
      onVerified?.(expertData);
      Alert.alert("Success", "Your expert verification request has been submitted!");
    } catch (error) {
      console.error("Error submitting verification:", error);
      setUploading(false);
      Alert.alert("Error", "Something went wrong. Try again.");
    }
  };

  // --- Show pending verification if applicable
  if (userData?.expertVerification === "pending") {
    return (
      <View style={[styles.pendingContainer, { backgroundColor: colors.background }]}>
        <Icon name="hourglass-empty" size={64} color={colors.primary} />
        <Text style={[styles.pendingTitle, { color: colors.text, marginTop: 16 }]}>
          Verification in Progress
        </Text>
        <Text
          style={[
            styles.pendingDesc,
            { color: colors.textSecondary, textAlign: "center", marginTop: 8 },
          ]}
        >
          Your verification request has been received. You’ll get a notification once our team
          reviews your profile and approves your expert account.
        </Text>
      </View>
    );
  }

  // --- Default form view
  return (
    <ScrollView
      contentContainerStyle={{ padding: 16 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.heading, { color: colors.text }]}>
        Become an Expert on Ahead
      </Text>
      <Text style={[styles.subHeading, { color: colors.textSecondary }]}>
        Get your verified badge today and connect with people seeking your expertise.
      </Text>

      <Card style={[styles.formCard, { backgroundColor: colors.surface }]}>
        <Card.Content>
          <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
          <TextInput
            placeholder="Enter your full name"
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, { borderColor: colors.textSecondary, color: colors.text }]}
            value={form.name}
            onChangeText={(t) => setForm({ ...form, name: t })}
          />

          <Text style={[styles.label, { color: colors.text }]}>Profession</Text>
          <TextInput
            placeholder="Eg: Psychologist, Career Coach"
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, { borderColor: colors.textSecondary, color: colors.text }]}
            value={form.profession}
            onChangeText={(t) => setForm({ ...form, profession: t })}
          />

          <Text style={[styles.label, { color: colors.text }]}>Short Bio</Text>
          <TextInput
            placeholder="Introduce yourself in 2–3 lines"
            placeholderTextColor={colors.textSecondary}
            style={[
              styles.input,
              { borderColor: colors.textSecondary, height: 80, textAlignVertical: "top", color: colors.text },
            ]}
            value={form.bio}
            multiline
            onChangeText={(t) => setForm({ ...form, bio: t })}
          />

          {/* --- NEW Expert Category Dropdown --- */}
          <Text style={[styles.label, { color: colors.text }]}>Expert Category</Text>
          <TouchableOpacity
            style={[styles.dropdown, { borderColor: colors.textSecondary }]}
            onPress={() => setCategoryModalVisible(true)}
          >
            <Text
              style={{
                color: form.expertCategory ? colors.text : colors.textSecondary,
                fontSize: 14,
              }}
            >
              {form.expertCategory || "Select a category"}
            </Text>
            <Icon name="arrow-drop-down" size={22} color={colors.textSecondary} />
          </TouchableOpacity>

          <Modal
            visible={categoryModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setCategoryModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalBox, { backgroundColor: colors.surface }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Select Category
                </Text>
                <FlatList
                  data={experts || []}
                  keyExtractor={(item, idx) => idx.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.modalItem}
                      onPress={() => {
                        setForm({ ...form, expertCategory: item });
                        setCategoryModalVisible(false);
                      }}
                    >
                      <Text style={{ color: colors.text }}>{item}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>
          </Modal>

          <Text style={[styles.label, { color: colors.text }]}>Expertise</Text>
          <TextInput
            placeholder="e.g. Career Guidance, Resume Building, Mindset Coaching"
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, { borderColor: colors.textSecondary, color: colors.text }]}
            value={form.expertise}
            onChangeText={(t) => setForm({ ...form, expertise: t })}
          />
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 12,
              marginTop: 4,
              fontStyle: "italic",
            }}
          >
            Separate multiple areas with commas (max 3 recommended)
          </Text>

          <TouchableOpacity
            style={[styles.uploadButton, { borderColor: colors.primary }]}
            onPress={handlePickCertificates}
          >
            <Icon name="upload-file" size={20} color={colors.primary} />
            <Text style={[styles.uploadText, { color: colors.primary }]}>
              {certificates.length > 0
                ? `${certificates.length} file(s) selected`
                : "Upload Certificates"}
            </Text>
          </TouchableOpacity>

          {certificates.length > 0 && (
            <View style={{ marginTop: 8 }}>
              {certificates.map((file, idx) => (
                <Text key={idx} style={{ color: colors.textSecondary, fontSize: 12 }}>
                  {file.name}
                </Text>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.primary }]}
            onPress={handleSubmitVerification}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Submit for Verification</Text>
            )}
          </TouchableOpacity>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  heading: { fontSize: 22, fontWeight: "bold", marginBottom: 6 },
  subHeading: { fontSize: 14, marginBottom: 16, lineHeight: 20 },
  formCard: { borderRadius: 12, padding: 10, elevation: 3 },
  label: { fontSize: 14, fontWeight: "600", marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, marginTop: 6, fontSize: 14 },
  dropdown: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalBox: {
    width: "80%",
    borderRadius: 12,
    padding: 16,
    maxHeight: "70%",
  },
  modalTitle: { fontWeight: "bold", fontSize: 16, marginBottom: 12 },
  modalItem: {
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
  },
  uploadButton: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadText: { marginLeft: 8, fontWeight: "600" },
  submitButton: { marginTop: 20, borderRadius: 8, padding: 14, alignItems: "center" },
  submitText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  pendingContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  pendingTitle: { fontSize: 20, fontWeight: "700" },
  pendingDesc: { fontSize: 14, lineHeight: 20 },
});

export default BecomeExpertScreen;
