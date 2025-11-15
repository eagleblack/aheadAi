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
import {
  Button,
  TextInput,
  Card,
  IconButton,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { useSelector } from "react-redux";
import firestore from "@react-native-firebase/firestore";
import auth from "@react-native-firebase/auth";
import storage from "@react-native-firebase/storage";
import { pick, types, isCancel } from "@react-native-documents/picker";
import RNFS from "react-native-fs";
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

const EditProfileScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { user: userData } = useSelector((state) => state.user);

  // ---------------- State ----------------
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(userData?.name || "");
  const [dob, setDob] = useState(userData?.dob || "");
  const [bio, setBio] = useState(userData?.bio || "");
  const [profileTitle, setProfileTitle] = useState(userData?.profileTitle || "");
  const [linkedin, setLinkedin] = useState(userData?.linkedin || "");
  const [experiences, setExperiences] = useState(userData?.experiences || []);
  const [education, setEducation] = useState(userData?.education || []);
  const [profilePic, setProfilePic] = useState(userData?.profilePic || null);

  // ---------------- Experience ----------------
  const addExperience = () => {
    setExperiences([...experiences, { title: "", org: "", from: "", to: "", desc: "" }]);
  };
  const updateExperience = (i, field, val) => {
    const updated = [...experiences];
    updated[i][field] = val;
    setExperiences(updated);
  };
  const removeExperience = (i) => setExperiences(experiences.filter((_, idx) => idx !== i));

  // ---------------- Education ----------------
  const addEducation = () => {
    setEducation([...education, { degree: "", institution: "", from: "", to: "" }]);
  };
  const updateEducation = (i, field, val) => {
    const updated = [...education];
    updated[i][field] = val;
    setEducation(updated);
  };
  const removeEducation = (i) => setEducation(education.filter((_, idx) => idx !== i));

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

  // ---------------- Upload Resume & Autofill ----------------
// ---------------- Upload Resume & Autofill ----------------
const uploadResume = async () => {
  try {
    const hasPermission = await requestStoragePermission();
    if (!hasPermission) {
      Alert.alert("Permission required", "Storage access is needed to pick files.");
      return;
    }
    setLoading(true);

    const results = await pick({ type: [types.pdf] });
    if (!results || results.length === 0) return;

    const file = results[0];
    const base64Pdf = await RNFS.readFile(file.uri, "base64");

    const response = await fetch(
      "https://us-central1-ahead-9fb4c.cloudfunctions.net/resumeApi/resume-analyze",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file: { data: base64Pdf, name: file.name, mimeType: "application/pdf" },
        }),
      }
    );

    const json = await response.json();
    if (!json.ok) throw new Error(json.error || "Resume parsing failed");

    const parsed = json.data;

    // 🔹 Autofill only safe fields
    setName(parsed.name || name); // update name if present
    // ⛔ do NOT touch dob, linkedin, bio
    setExperiences(parsed.experience || []);
    setEducation(parsed.education || []);
  } catch (err) {
    if (isCancel(err)) {
      console.log("User cancelled picker");
    } else {
      console.error("Resume upload error:", err);
      Alert.alert("Error", err.message);
    }
  } finally {
    setLoading(false);
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
        dob,
        bio,
        profileTitle,
        linkedin,
        experiences,
        education,
        profilePic: profilePicUrl,
        username,
      };

      await firestore().collection("users").doc(user.uid).set(userDataToSave, { merge: true });

      Alert.alert("Success", "Profile updated successfully");
      navigation.goBack();
    } catch (err) {
      console.error("Save error:", err);
      Alert.alert("Error", "Could not save profile.");
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
          <Text style={[styles.title, { color: colors.text }]}>Edit Profile</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Update your personal info, experiences and education
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

          {/* Personal Info */}
          <Card style={[styles.card, { backgroundColor: colors.surface }]}>
            <Card.Content>
              <ThemedTextInput label="Full Name" value={name} onChangeText={setName} />
              <ThemedTextInput
                label="Profile Title"
                placeholder="e.g. Frontend Developer"
                value={profileTitle}
                onChangeText={setProfileTitle}
              />
              <ThemedTextInput
                label="Date of Birth"
                placeholder="DD/MM/YYYY"
                value={dob}
                onChangeText={setDob}
              />
              <ThemedTextInput
                label="LinkedIn URL"
                placeholder="https://www.linkedin.com/in/username"
                value={linkedin}
                onChangeText={setLinkedin}
              />
              <ThemedTextInput
                label="Bio"
                placeholder="Write about yourself (max 200 characters)"
                value={bio}
                onChangeText={(text) => (text.length <= 200 ? setBio(text) : null)}
                style={styles.textArea}
                multiline
                numberOfLines={4}
              />
            </Card.Content>
          </Card>

          {/* Upload Resume */}
          <Button
            mode="outlined"
            onPress={uploadResume}
            loading={loading}
            disabled={loading}
            style={[styles.addBtn, { borderColor: colors.secondary }]}
            labelStyle={{ color: colors.secondary, fontWeight: "600" }}
          >
            📄 Upload Resume
          </Button>

          {/* Education Section */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Education</Text>
          {education.map((edu, index) => (
            <Card key={index} style={[styles.card, { backgroundColor: colors.surface }]}>
              <Card.Title
                title={edu.degree || "New Education"}
                subtitle={
                  edu.institution ? `${edu.institution} | ${edu.from} - ${edu.to}` : "Add details"
                }
                right={() => <IconButton icon="delete" onPress={() => removeEducation(index)} />}
              />
              <Card.Content>
                <ThemedTextInput
                  label="Degree"
                  value={edu.degree}
                  onChangeText={(text) => updateEducation(index, "degree", text)}
                />
                <ThemedTextInput
                  label="Institution"
                  value={edu.institution}
                  onChangeText={(text) => updateEducation(index, "institution", text)}
                />
                <View style={styles.row}>
                  <ThemedTextInput
                    label="From"
                    placeholder="MM/YYYY"
                    value={edu.from}
                    onChangeText={(text) => updateEducation(index, "from", text)}
                    style={styles.halfInput}
                  />
                  <ThemedTextInput
                    label="To"
                    placeholder="MM/YYYY / Present"
                    value={edu.to}
                    onChangeText={(text) => updateEducation(index, "to", text)}
                    style={styles.halfInput}
                  />
                </View>
              </Card.Content>
            </Card>
          ))}
          <Button
            mode="outlined"
            onPress={addEducation}
            style={[styles.addBtn, { borderColor: colors.primary }]}
            labelStyle={{ color: colors.primary, fontWeight: "600" }}
          >
            + Add Education
          </Button>

          {/* Experience Section */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Experience</Text>
          {experiences.map((exp, index) => (
            <Card key={index} style={[styles.card, { backgroundColor: colors.surface }]}>
              <Card.Title
                title={exp.title || "New Experience"}
                subtitle={exp.org ? `${exp.org} | ${exp.from} - ${exp.to}` : "Add details"}
                right={() => <IconButton icon="delete" onPress={() => removeExperience(index)} />}
              />
              <Card.Content>
                <ThemedTextInput
                  label="Title"
                  value={exp.title}
                  onChangeText={(text) => updateExperience(index, "title", text)}
                />
                <ThemedTextInput
                  label="Company / Organization"
                  value={exp.org}
                  onChangeText={(text) => updateExperience(index, "org", text)}
                />
                <View style={styles.row}>
                  <ThemedTextInput
                    label="From"
                    placeholder="MM/YYYY"
                    value={exp.from}
                    onChangeText={(text) => updateExperience(index, "from", text)}
                    style={styles.halfInput}
                  />
                  <ThemedTextInput
                    label="To"
                    placeholder="MM/YYYY / Present"
                    value={exp.to}
                    onChangeText={(text) => updateExperience(index, "to", text)}
                    style={styles.halfInput}
                  />
                </View>
                <ThemedTextInput
                  label="Description"
                  value={exp.desc}
                  onChangeText={(text) => updateExperience(index, "desc", text)}
                  style={styles.textArea}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </Card.Content>
            </Card>
          ))}
          <Button
            mode="outlined"
            onPress={addExperience}
            style={[styles.addBtn, { borderColor: colors.primary }]}
            labelStyle={{ color: colors.primary, fontWeight: "600" }}
          >
            + Add Experience
          </Button>

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
  sectionTitle: { fontSize: 20, fontWeight: "700", marginTop: 28, marginBottom: 12 },
  card: { borderRadius: 16, marginBottom: 20, elevation: 3 },
  input: { marginBottom: 16 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  halfInput: { flex: 1, marginRight: 8 },
  textArea: { minHeight: 100, textAlignVertical: "top" },
  addBtn: { marginBottom: 20, borderRadius: 12, paddingVertical: 6 },
  saveButton: { borderRadius: 16, elevation: 4, paddingVertical: 10, marginBottom: 30 },
  profilePicContainer: { alignItems: "center", marginVertical: 20 },
  profilePic: { width: 120, height: 120, borderRadius: 60, overflow: "hidden" },
});

export default EditProfileScreen;
