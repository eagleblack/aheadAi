import React, { useState, useEffect } from "react";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  PermissionsAndroid,
  TouchableOpacity,
} from "react-native";
import {
  Button,
  TextInput,
  Card,
  IconButton,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";

import { pick, types, isCancel } from "@react-native-documents/picker";
import RNFS from "react-native-fs";
import firestore, { FieldValue } from "@react-native-firebase/firestore";
import auth from "@react-native-firebase/auth";
import storage from "@react-native-firebase/storage";
import * as ImagePicker from "react-native-image-picker";

import {Image} from "react-native";
// 🔹 Ask for storage permission (Android 13+ safe)
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
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        {
          title: "Storage Permission",
          message: "We need access to your storage to select a resume PDF.",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK",
        }
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

const UserDetailsPage = ({ navigation,route }) => {
  const { colors } = useTheme();
const label = route?.params?.label || null;
const value = route?.params?.value || null;

  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [bio, setBio] = useState(""); // 🔹 New Bio field
  const [experiences, setExperiences] = useState([]);
  const [education, setEducation] = useState([]);
  const [loading, setLoading] = useState(false);
const [certificateImage, setCertificateImage] = useState(null);
const [uploadingCert, setUploadingCert] = useState(false);
const pickCertificate = async () => {
 try {
      const result = await ImagePicker.launchImageLibrary({
        mediaType: "photo",
        quality: 0.8,
      });
      if (result.didCancel) return;
      if (result.assets?.length > 0) {
     setCertificateImage({
    uri: result.assets[0].uri,
    name: result.assets[0].fileName || `cert_${Date.now()}.jpg`,
    type: result.assets[0].type || "image/jpeg",
  });
      }
    } catch (err) {
      console.error("Profile pic error:", err);
      Alert.alert("Error", "Could not pick profile picture.");
    }
  
};


const uploadCertificate = async (userId) => {
  if (!certificateImage) return null;

  setUploadingCert(true);

  try {
    const ref = storage().ref(`certificates/${userId}/mainCertificate.jpg`);

    await ref.putFile(certificateImage.uri);

    const url = await ref.getDownloadURL();
    return url;
  } catch (err) {
    console.error("Certificate upload error:", err);
    Alert.alert("Upload Failed", "Could not upload certificate.");
    return null;
  } finally {
    setUploadingCert(false);
  }
};
  useEffect(() => {
  const fetchProfile = async () => {
    try {
      const user = auth().currentUser; 
      if (!user) return;

      const doc = await firestore()
        .collection("users")
        .doc(user.uid)
        .get();

      if (doc.exists) {
        const data = doc.data();

        if (data.name) setName(data.name);
        if (data.dob) setDob(data.dob);
        if (data.bio) setBio(data.bio);
        if (Array.isArray(data.education)) setEducation(data.education);
        if (Array.isArray(data.experiences)) setExperiences(data.experiences);
      }
    } catch (err) {
      console.log("Profile load error:", err);
    }
  };

  fetchProfile();
}, []);
  // ---------------- Experience ----------------
  const addExperience = () => {
    setExperiences([
      ...experiences,
      { title: "", org: "", from: "", to: "", desc: "" },
    ]);
  };

  const updateExperience = (index, field, value) => {
    const updated = [...experiences];
    updated[index][field] = value;
    setExperiences(updated);
  };

  const removeExperience = (index) => {
    setExperiences(experiences.filter((_, i) => i !== index));
  };

  // ---------------- Education ----------------
  const addEducation = () => {
    setEducation([
      ...education,
      { degree: "", institution: "", from: "", to: "" },
    ]);
  };

  const updateEducation = (index, field, value) => {
    const updated = [...education];
    updated[index][field] = value;
    setEducation(updated);
  };

  const removeEducation = (index) => {
    setEducation(education.filter((_, i) => i !== index));
  };

  // ---------------- Upload Resume ----------------
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
            file: {
              data: base64Pdf,
              name: file.name,
              mimeType: "application/pdf",
            },
          }),
        }
      );

      const json = await response.json();
      if (!json.ok) throw new Error(json.error || "Resume parsing failed");

      const parsed = json.data;

      // Autofill data
      setName(parsed.name || "");
      setDob(parsed.dob || "");
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

  // ---------------- Save to Firestore ----------------
 const saveDetails = async () => {
  try {
    // ✅ HARD VALIDATION
    if (!name.trim()) {
      Alert.alert("Validation Error", "Full name is required.");
      return;
    }

    if (!education.length || !education[0].degree || !education[0].institution) {
      Alert.alert(
        "Education Required",
        "Please add at least one education record with Degree and Institution."
      );
      return;
    }

    const user = auth().currentUser;
    if (!user) {
      Alert.alert("Error", "No user logged in.");
      return;
    }
  const certificateUrl = await uploadCertificate(user.uid);
    const userDoc = await firestore().collection("users").doc(user.uid).get();

    const username =
      userDoc.exists && userDoc.data().username
        ? userDoc.data().username
        : name.trim().replace(/\s+/g, "-").toLowerCase() + "-" + Math.floor(Math.random() * 10000);

    const userData = {
  name,
  dob,
  bio,
  education,
  experiences,
  username,
  hasChecked: true,
  verificationRequested: true,
  verificationRequestedAt: FieldValue.serverTimestamp(),
};
if (certificateUrl) {
  userData.mainCertificate = certificateUrl;
}

    // ✅ Only write label/value if provided
    if (label !== null) userData.label = label;
    if (value !== null) userData.value = value;

    await firestore()
      .collection("users")
      .doc(user.uid)
      .set(userData, { merge: true });

    Alert.alert("✅ Request Sent", "Verification request submitted successfully.");
    navigation.navigate("PendingVerification");
  } catch (err) {
    console.error("Firestore save error:", err);
    Alert.alert("Error", "Could not submit verification request.");
  }
};
  // ---------------- Skip Button ----------------
  const skip = async () => {
    try {
      const user = auth().currentUser;
      if (!user) {
        Alert.alert("Error", "No user logged in.");
        return;
      }

      await firestore().collection("users").doc(user.uid).set(
        { hasChecked: true,label,value },
        { merge: true }
      );

      navigation.navigate("MainApp");
    } catch (err) {
      console.error("Skip error:", err);
      Alert.alert("Error", "Could not update user data.");
    }
  };

  return (
    <SafeAreaView
      edges={["top",'bottom']}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      {/* Top-right Skip button */}
      

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContainer,
            { backgroundColor: colors.background, paddingBottom: 50 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Page Title */}
          <Text style={[styles.title, { color: colors.text }]}>
            Request Verification
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Fill in your personal details and upload your resume for auto-fill
          </Text>
  

     <Button
            mode="outlined"
            onPress={uploadResume}
            loading={loading}
            disabled={loading}
            style={[styles.uploadBtn, { borderColor: colors.secondary }]}
            labelStyle={{
              color: colors.secondary,
              fontWeight: "600",
            }}
          >
            📄 Upload Resume
          </Button>
          {/* Personal Info */}
          <Card style={[styles.card, { backgroundColor: colors.surface }]}>
            <Card.Content>
              <ThemedTextInput
                label="Full Name"
                value={name}
                onChangeText={setName}
              />
              <ThemedTextInput
                label="Date of Birth"
                placeholder="DD/MM/YYYY"
                value={dob}
                onChangeText={setDob}
              />
              <ThemedTextInput
                label="Bio"
                placeholder="Write about yourself (max 200 characters)"
                value={bio}
                onChangeText={(text) =>
                  text.length <= 200 ? setBio(text) : null
                }
                style={styles.textArea}
                multiline
                numberOfLines={4}
              />
            </Card.Content>
          </Card>

          {/* Education Section */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Education
          </Text>
          {education.map((edu, index) => (
         <Card
  key={index}
  style={[
    styles.card,
    { backgroundColor: colors.surface, },
  ]}
>
  <Card.Title
    title={edu.degree || "New Education"}
    titleStyle={{ color: colors.primary, fontWeight: "600" }} // Title color
    subtitle={
      edu.institution
        ? `${edu.institution} | ${edu.from} - ${edu.to}`
        : "Add details"
    }
    subtitleStyle={{ color: colors.text }} // Subtitle color
    right={() => (
      <IconButton
        icon="delete"
        iconColor={colors.error} // Icon color
        onPress={() => removeEducation(index)}
      />
    )}
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
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Experience
          </Text>
          {experiences.map((exp, index) => (
            <Card key={index} style={[styles.card, { backgroundColor: colors.surface }]}>
              <Card.Title
                title={exp.title || "New Experience"}
                subtitle={
                  exp.org ? `${exp.org} | ${exp.from} - ${exp.to}` : "Add details"
                }
                right={() => (
                  <IconButton icon="delete" onPress={() => removeExperience(index)} />
                )}
              />

              <Card.Content>
                <ThemedTextInput
                  label="Title (e.g. Software Engineer)"
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
{certificateImage && (
  <Card style={[styles.card, { backgroundColor: colors.surface }]}>
    <Card.Content>
      <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>
        Selected Certificate
      </Text>
      <Image
        source={{ uri: certificateImage.uri }}
        style={{ height: 180, borderRadius: 12 }}
        resizeMode="cover"
      />
    </Card.Content>
  </Card>
)}
          {/* Upload Resume */}
       <Button
  mode="outlined"
  onPress={()=>{pickCertificate()}}
  style={[styles.uploadBtn, { borderColor: colors.secondary }]}
  labelStyle={{ color: colors.secondary, fontWeight: "600" }}
>
  🏆 Upload Certificate
</Button>

          {/* Save Button */}
          <Button
  mode="contained"
  onPress={saveDetails}
  disabled={uploadingCert}
  loading={uploadingCert}
  style={[styles.saveButton, { backgroundColor: colors.primary }]}
>
  Request Verification
</Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, padding: 20, paddingBottom: 40 },
  topRightButton: {
    position: "absolute",
    top: 10,
    right: 20,
    zIndex: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 28,
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    marginBottom: 20,
    elevation: 3,
  },
  input: { marginBottom: 16 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  halfInput: { flex: 1, marginRight: 8 },
  textArea: { minHeight: 100, textAlignVertical: "top" },
  addBtn: { marginBottom: 20, borderRadius: 12, paddingVertical: 6 },
  uploadBtn: { marginBottom: 32, borderRadius: 12, paddingVertical: 6 },
  saveButton: {
    borderRadius: 16,
    elevation: 4,
    paddingVertical: 10,
  },
});

export default UserDetailsPage;
