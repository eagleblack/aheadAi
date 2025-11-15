import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  TouchableOpacity,
  PermissionsAndroid,
} from "react-native";
import { Button, TextInput, Card } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { useSelector } from "react-redux";
import firestore from "@react-native-firebase/firestore";
import auth from "@react-native-firebase/auth";
import storage from "@react-native-firebase/storage";
import * as ImagePicker from "react-native-image-picker";

// ---------------- Storage Permission ----------------
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

const ThemedTextInput = ({ style, ...props }) => {
  const { colors } = useTheme();
  return (
    <TextInput
      mode="outlined"
      style={[styles.input, style]}
      theme={{
        colors: {
          background: colors.surface,
          text: colors.text,
          placeholder: colors.textSecondary,
          primary: colors.primary,
        },
      }}
      {...props}
      placeholderTextColor={colors.textSecondary}
      textColor={colors.text}
    />
  );
};

const EditCompProfileScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { user: userData } = useSelector((state) => state.user);

  // ---------------- State ----------------
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(userData?.name || "");
  const [dob, setDob] = useState(userData?.dob || ""); // Year of incorporation
  const [bio, setBio] = useState(userData?.bio || ""); // Company Description
  const [profileTitle, setProfileTitle] = useState(userData?.profileTitle || "");
  const [website, setWebsite] = useState(userData?.linkedin || ""); // Company Website (same db field)
  const [profilePic, setProfilePic] = useState(userData?.profilePic || null);

  // ---------------- Profile Picture ----------------
  const pickProfilePicture = async () => {
    try {
      const result = await ImagePicker.launchImageLibrary({
        mediaType: "photo",
        quality: 0.8,
      });
      if (result.didCancel) return;
      if (result.assets?.length > 0) {
        setProfilePic(result.assets[0].uri);
      }
    } catch (err) {
      console.error("Profile pic error:", err);
      Alert.alert("Error", "Could not pick profile picture.");
    }
  };

  // ---------------- Save Profile ----------------
  const saveProfile = async () => {
    try {
      setLoading(true);
      const user = auth().currentUser;
      if (!user) {
        Alert.alert("Error", "No user logged in.");
        return;
      }

      let profilePicUrl = profilePic;
      if (profilePic && !profilePic.startsWith("https")) {
        // 🔹 Upload to Firebase Storage
        const ref = storage().ref(`profilePics/${user.uid}.jpg`);
        await ref.putFile(profilePic);
        profilePicUrl = await ref.getDownloadURL();
      }

      const username =
        name.trim().replace(/\s+/g, "-").toLowerCase() +
        "-" +
        Math.floor(Math.random() * 10000);

      const userDataToSave = {
        name,
        dob, // Year of incorporation
        bio, // Company Description
        profileTitle,
        linkedin: website, // Company Website
        profilePic: profilePicUrl,
        username,
      };

      await firestore().collection("users").doc(user.uid).set(userDataToSave, { merge: true });

      Alert.alert("Success", "Company profile updated successfully");
      navigation.goBack();
    } catch (err) {
      console.error("Save error:", err);
      Alert.alert("Error", "Could not save company profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContainer, { backgroundColor: colors.background }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.title, { color: colors.text }]}>Edit Company Profile</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Update your company information and profile details
          </Text>

          {/* Profile Picture */}
          <View style={styles.profilePicContainer}>
            <TouchableOpacity onPress={pickProfilePicture}>
              {profilePic ? (
                <Image source={{ uri: profilePic }} style={styles.profilePic} />
              ) : (
                <View
                  style={[
                    styles.profilePic,
                    { backgroundColor: colors.surface, justifyContent: "center", alignItems: "center" },
                  ]}
                >
                  <Text style={{ color: colors.textSecondary, fontSize: 40 }}>+</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Company Info */}
          <Card style={[styles.card, { backgroundColor: colors.surface }]}>
            <Card.Content>
              <ThemedTextInput label="Company Name" value={name} onChangeText={setName} />
              <ThemedTextInput
                label="Profile Title"
                placeholder="e.g. Software Solutions Provider"
                value={profileTitle}
                onChangeText={setProfileTitle}
              />
              <ThemedTextInput
                label="Year of Incorporation"
                placeholder="YYYY"
                value={dob}
                onChangeText={setDob}
              />
              <ThemedTextInput
                label="Company Website"
                placeholder="https://www.yourcompany.com"
                value={website}
                onChangeText={setWebsite}
              />
              <ThemedTextInput
                label="Company Description"
                placeholder="Write about your company (max 200 characters)"
                value={bio}
                onChangeText={(text) => (text.length <= 200 ? setBio(text) : null)}
                style={styles.textArea}
                multiline
                numberOfLines={4}
              />
            </Card.Content>
          </Card>

          {/* Save Button */}
          <Button
            mode="contained"
            onPress={saveProfile}
            loading={loading}
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            labelStyle={{ fontSize: 16, fontWeight: "700", color: colors.surface }}
          >
            Save Changes
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, padding: 20, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: "800", marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 16, marginBottom: 24, textAlign: "center", lineHeight: 22 },
  card: { borderRadius: 16, marginBottom: 20, elevation: 3 },
  input: { marginBottom: 16 },
  textArea: { minHeight: 100, textAlignVertical: "top" },
  saveButton: { borderRadius: 16, elevation: 4, paddingVertical: 10, marginBottom: 30 },
  profilePicContainer: { alignItems: "center", marginVertical: 20 },
  profilePic: { width: 120, height: 120, borderRadius: 60, overflow: "hidden" },
});

export default EditCompProfileScreen;
