import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from "react-native";
import {
  Button,
  TextInput,
  Card,
  IconButton,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";

import { pick, types } from "@react-native-documents/picker";
import firestore, { FieldValue } from "@react-native-firebase/firestore";
import auth from "@react-native-firebase/auth";
import storage from "@react-native-firebase/storage";
import * as ImagePicker from "react-native-image-picker";
import RNFS from "react-native-fs";

import LinearGradient from "react-native-linear-gradient";
import LoadingModal from "../components/LoadingModal";

const ThemedTextInput = ({ style, error, ...props }) => {
  const { colors } = useTheme();
  return (
    <TextInput
      mode="outlined"
      style={[styles.input, style]}
      error={error}
      theme={{
        colors: {
          background: colors.surface,
          text:'black',
          placeholder: 'black',
          primary: error ? "red" : colors.primary,
        },
      }}
      {...props}
      placeholderTextColor={colors.text}
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
  const [bio, setBio] = useState("");
  const [certificateFile, setCertificateFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});
  const [parsingResume,setparsingResume ]=useState(false) 
    const [experiences, setExperiences] = useState([]);
  const [education, setEducation] = useState([]); 
  const [certifications, setCertifications] = useState([]);
const [uploadingCert, setUploadingCert] = useState(false);

const uploadResume = async () => {
  try {
   
    const results = await pick({ type: [types.pdf] });
    if (!results?.length) return;
 setparsingResume(true);
      await new Promise(resolve => setTimeout(resolve, 0));
    const file = results[0];

    // Prefer fileCopyUri on iOS
    let uri = file.fileCopyUri || file.uri;
    if (!uri) throw new Error("No file URI");

    // Decode %20 etc.
    uri = decodeURI(uri);

    // Remove file:// for RNFS
    const path = uri.replace("file://", "");

    console.log("READING PATH:", path);

    const base64Pdf = await RNFS.readFile(path, "base64");
    if (!base64Pdf) throw new Error("Empty file");

    const response = await fetch(
      "https://us-central1-ahead-9fb4c.cloudfunctions.net/resumeApi/resume-analyze",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file: {
            data: base64Pdf,
            name: file.name || "resume.pdf",
            mimeType: "application/pdf",
          },
        }),
      }
    );

    const json = await response.json();
    if (!json.ok) throw new Error(json.error);

    const parsed = json.data || {};

    setName(parsed.name || "");
    setDob(parsed.dob || "");
    setExperiences(parsed.experience || []);
    setEducation(parsed.education || []);
    setCertifications(parsed.certifications || []);

  } catch (err) {
    console.error("Resume upload error:", err);
  } finally {
    setparsingResume(false);
  }
};

  // 📎 Pick Certificate (Image or PDF)
  const pickCertificate = async () => {
    Alert.alert("Upload Certificate", "Choose file type", [
      {
        text: "Image",
        onPress: async () => {
          const result = await ImagePicker.launchImageLibrary({ mediaType: "photo" });
          if (result.didCancel || !result.assets?.length) return;

          const file = result.assets[0];
          setCertificateFile({
            uri: file.uri,
            name: file.fileName || `cert_${Date.now()}.jpg`,
            type: file.type || "image/jpeg",
          });
          setErrors(prev => ({ ...prev, certificate: null }));
        },
      },
      {
  text: "PDF",
  onPress: async () => {
    try {
      const res = await pick({ type: [types.pdf] });
      if (!res?.length) return;

      const file = res[0];

      // iOS fix → use fileCopyUri if available
      let uri = file.fileCopyUri || file.uri;
      if (!uri) throw new Error("No file URI");

      uri = decodeURI(uri);

      // Remove file:// for RNFS
      const path = uri.replace("file://", "");

      const newPath = `${RNFS.DocumentDirectoryPath}/${Date.now()}_${file.name}`;

      // Copy into app directory
      await RNFS.copyFile(path, newPath);

      setCertificateFile({
        uri: `file://${newPath}`, // IMPORTANT
        name: file.name || `cert_${Date.now()}.pdf`,
        type: "application/pdf",
      });

      setErrors(prev => ({ ...prev, certificate: null }));
    } catch (e) {
      console.log("PDF Pick Error:", e);
      Alert.alert("Error", "Unable to pick PDF");
    }
  },
},
      { text: "Cancel", style: "cancel" },
    ]);
  };

  // ✅ Validation
const validate = () => {
  let e = {};

  if (!name.trim()) e.name = "Full name is required";
  if (!certificateFile) e.certificate = "Certificate is required";

  // 🎓 Education validation
  if (!education.length) {
    e.education = "At least one education entry is required";
  } else {
    const invalidEdu = education.find(
      (edu) =>
        !edu.degree.trim() || !edu.institution.trim()
    );

    if (invalidEdu) {
      e.education = "Please complete all education fields";
    }
  }

  setErrors(e);
  return Object.keys(e).length === 0;
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
        if (Array.isArray(data.certifications)) {
  setCertifications(data.certifications);
}

      }
    } catch (err) {
      console.log("Profile load error:", err);
    }
  };

  fetchProfile();
}, []);
  // 🚀 Submit
  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setUploading(true);
 const user = auth().currentUser;
      const ref = storage().ref(`certificates/${auth().currentUser.uid}_${Date.now()}`);
      await ref.putFile(certificateFile.uri);
      const url = await ref.getDownloadURL();
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
   certifications, // ✅ ADD THIS
  username,
  hasChecked: true,
  verificationRequested: true,
  verificationRequestedAt: FieldValue.serverTimestamp(),
};
if (url) {
  userData.mainCertificate = url;
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
      console.error(err);
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setUploading(false);
    }
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


  const addCertification = () => {
  setCertifications([
    ...certifications,
    {
      courseName: "",
      certificateNumber: "",
      issueDate: "",
      issuePlace: "",
    },
  ]);
};

const updateCertification = (index, field, value) => {
  const updated = [...certifications];
  updated[index][field] = value;
  setCertifications(updated);
};

const removeCertification = (index) => {
  setCertifications(certifications.filter((_, i) => i !== index));
};
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
       <Text style={[styles.title, { color: colors.text }]} allowFontScaling={false}>
            Request Verification
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Fill in your personal details and upload your resume for auto-fill
          </Text>
     <TouchableOpacity
        
             onPress={uploadResume}
          
            disabled={parsingResume}
            style={[styles.uploadBtn, { borderColor: colors.primary }]}
            labelStyle={{
              color: colors.primary,
              fontWeight: "600",
            }}
          >
             <LinearGradient colors={["#232323", "#000000"]} style={styles.button}>
  {!parsingResume ?<Text style={styles.buttonText}>
            Uplaod Resume To Autofill     </Text>: <ActivityIndicator size={'small'} />}
        
             </LinearGradient>
         
          </TouchableOpacity>

           <View style={styles.orWrapper}>
                        <View style={styles.line} />
                        <Text style={styles.orText}>Or</Text>
                        <View style={styles.line} />
                      </View>
          <Card style={[styles.card, { backgroundColor: colors.surface }]}>
            <Card.Content>
              <ThemedTextInput
                label="Full Name *"
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  if (t.trim()) setErrors(p => ({ ...p, name: null }));
                }}
                error={!!errors.name}
              />
              {errors.name && <Text style={styles.error}>{errors.name}</Text>}

              <ThemedTextInput label="Date of Birth" value={dob} onChangeText={setDob} />

              <ThemedTextInput
                label="Bio"
                multiline
                numberOfLines={4}
                style={styles.textArea}
                value={bio}
                onChangeText={(t) => t.length <= 200 && setBio(t)}
              />
            </Card.Content>
          </Card>

          <Button
            mode="outlined"
            onPress={pickCertificate}
            style={[
              styles.uploadBtn,
              { borderColor: errors.certificate ? "red" : colors.primary },
            ]}
            labelStyle={{
              color: errors.certificate ? "red" : colors.primary,
              fontWeight: "600",
            }}
            allowFontScaling={false}
          >
           Upload Education Certificate *
          </Button>

          {certificateFile && (
            <Text style={{ marginBottom: 10, color: colors.textSecondary }} allowFontScaling={false}>
              Selected: {certificateFile.name}
            </Text>
          )}
          {errors.certificate && <Text style={styles.error}>{errors.certificate}</Text>}
  <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Education*
          </Text>
          {errors.education && (
  <Text style={styles.error} >{errors.education}</Text>
)}
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

    titleStyle={{ color: colors.primary, fontWeight: "600" }} // Title color
                subtitle={
                  exp.org ? `${exp.org} | ${exp.from} - ${exp.to}` : "Add details"
                }
    subtitleStyle={{ color: colors.text }} // Subtitle color
    right={() => (
      <IconButton
        icon="delete"
        iconColor={colors.error} // Icon color
        onPress={() => removeExperience(index)}
      />
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
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
  Certifications
</Text>

{certifications.map((cert, index) => (
  <Card key={index} style={[styles.card, { backgroundColor: colors.surface }]}>
    <Card.Title
            title={cert.courseName || "New Certification"}


    titleStyle={{ color: colors.primary, fontWeight: "600" }} // Title color
                 subtitle={
        cert.issuePlace
          ? `${cert.issuePlace} | ${cert.issueDate}`
          : "Add details"
      }
    subtitleStyle={{ color: colors.text }} // Subtitle color
   
      right={() => (
        <IconButton
          icon="delete"
          iconColor={colors.error}
          onPress={() => removeCertification(index)}
        />
      )}
    />

    <Card.Content>
      <ThemedTextInput
        label="Course / Certification Name"
        value={cert.courseName}
        onChangeText={(text) =>
          updateCertification(index, "courseName", text)
        }
      />

      <ThemedTextInput
        label="Certificate Number"
        value={cert.certificateNumber}
        onChangeText={(text) =>
          updateCertification(index, "certificateNumber", text)
        }
      />

      <ThemedTextInput
        label="Date of Issue"
        placeholder="MM/YYYY"
        value={cert.issueDate}
        onChangeText={(text) =>
          updateCertification(index, "issueDate", text)
        }
      />

      <ThemedTextInput
        label="Place of Issue"
        placeholder="Google / Coursera / AWS"
        value={cert.issuePlace}
        onChangeText={(text) =>
          updateCertification(index, "issuePlace", text)
        }
      />
    </Card.Content>
  </Card>
))}

<Button
  mode="outlined"
  onPress={addCertification}
  style={[styles.addBtn, { borderColor: colors.primary }]}
  labelStyle={{ color: colors.primary, fontWeight: "600" }}
>
  + Add Certification
</Button>

       

        
        </ScrollView>
        
           <TouchableOpacity onPress={handleSubmit} disabled={uploading} style={{width:'80%',position:'absolute',bottom:10,alignSelf:'center'}}>
            <LinearGradient colors={["#F58AC9", "#3B82F6"]} style={styles.button}>
              <Text style={styles.buttonText}>
                {uploading ? "Please wait..." : "Request Verification"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
            <View style={{
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.5)",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
  elevation: 9999
}}>
 <Modal visible={parsingResume} transparent animationType="fade">
              <View style={{
                flex: 1,
                backgroundColor: "rgba(0,0,0,0.5)",
                justifyContent: "center", 
                alignItems: "center"
              }}>
                <View style={{
                  backgroundColor: "#fff",
                  padding: 30,
                  borderRadius: 12,
                  alignItems: "center"
                }}>
                  <ActivityIndicator size="large" />
                  <Text style={{ marginTop: 10 }}>{ "Processing..."}</Text>
                </View>
              </View>
            </Modal>
</View>
      </KeyboardAvoidingView>
    
       
    </SafeAreaView>
  );
};

export default UserDetailsPage;
//<LoadingModal visible={parsingResume} text="Processing Resume Please Wait..." />
const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, padding: 20, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: "800", marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 16, marginBottom: 24, textAlign: "center" },
  card: { borderRadius: 16, marginBottom: 20, elevation: 3 },
  input: { marginBottom: 16 },
  textArea: { minHeight: 100, textAlignVertical: "top" },
  uploadBtn: { marginBottom: 20, borderRadius: 12, paddingVertical: 6 },
  button: {
    height:60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom:12,
    
  },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "700",textAlign:'center'},
  error: { color: "red", marginBottom: 10, marginTop: -10, fontSize: 13 },
  
  orWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
    marginBottom:30
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#aecef7",
  },

  orText: {
    marginHorizontal: 12,
    fontSize: 22,
    fontWeight: "600",
    color: "#000000",
  },
  addBtn: { marginBottom: 20, borderRadius: 12, paddingVertical: 6 },
  uploadBtn: { marginBottom: 32, borderRadius: 12, paddingVertical: 6 },
  saveButton: {
    borderRadius: 16,
    elevation: 4,
    paddingVertical: 20,
    height:40,
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
    marginLeft:10
  },
});
