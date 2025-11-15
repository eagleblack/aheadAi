import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
  Alert,
} from "react-native";
import { Button, TextInput, ActivityIndicator } from "react-native-paper";
import firestore, { serverTimestamp } from "@react-native-firebase/firestore";
import storage from "@react-native-firebase/storage";
import auth from "@react-native-firebase/auth";
import { pick, types, isCancel } from "@react-native-documents/picker";
import RNFS from "react-native-fs";
import { useTheme } from "../context/ThemeContext";
import Icon from "@react-native-vector-icons/material-icons";

const ThemedTextInput = ({ style, ...props }) => {
  const { colors } = useTheme();

  return (
    <TextInput
      mode="outlined"
      style={[styles.input, { backgroundColor: colors.surface }, style]}
      placeholderTextColor={colors.text + "80"}
      theme={{
        colors: {
          primary: colors.primary,
          background: colors.surface,
          onSurface: colors.text,
          placeholder: colors.text + "80",
          outlineColor: colors.border || "#999",
        },
      }}
      {...props}
    />
  );
};

const CompanyVerificationPage = ({ navigation }) => {
  const { colors } = useTheme();
  const [entityType, setEntityType] = useState(null); // 🔹 "Company" or "Institution"
  const [entityDropdownVisible, setEntityDropdownVisible] = useState(false);

  const [companyTypes, setCompanyTypes] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [uploading, setUploading] = useState(false);

  // 🔹 Fetch company types
  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const snapshot = await firestore()
          .collection("companies_types")
          .where("isActive", "==", true)
          .get();
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCompanyTypes(data);
      } catch (error) {
        console.error("Error fetching company types:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTypes();
  }, []);

  // 🔹 Handle field change
  const handleFieldChange = (id, value) => {
    setFormData((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), value },
    }));
  };

  // 🔹 Select file (but don't upload yet)
  const handleFileSelect = async (field) => {
    try {
      const results = await pick({ type: [types.pdf, types.images] });
      if (!results || results.length === 0) return;

      const file = results[0];
      setFormData((prev) => ({
        ...prev,
        [field.id]: {
          ...(prev[field.id] || {}),
          value: file.name,
          localUri: file.uri,
          mimeType: file.mimeType || "application/octet-stream",
        },
      }));

      Alert.alert("Selected", `${file.name} ready for upload`);
    } catch (err) {
      if (isCancel(err)) {
        console.log("File picker cancelled");
      } else {
        console.error("File select error:", err);
        Alert.alert("Error", err.message);
      }
    }
  };

  // 🔹 Upload all files in formData
  const uploadAllFiles = async (userUid) => {
    const uploadedData = { ...formData };

    for (const [fieldId, entry] of Object.entries(formData)) {
      if (entry.localUri && !entry.fileLocation) {
        const filePath = `company_verification/${userUid}/${Date.now()}_${entry.value}`;
        const reference = storage().ref(filePath);

        const fileData = await RNFS.readFile(entry.localUri, "base64");
        await reference.putString(fileData, "base64", {
          contentType: entry.mimeType,
        });

        const fileUrl = await reference.getDownloadURL();
        uploadedData[fieldId] = {
          ...entry,
          fileLocation: fileUrl,
        };
      }
    }

    return uploadedData;
  };

  // 🔹 Submit (now triggers file upload first)
  const handleSubmit = async () => {
    if (!entityType) {
      Alert.alert("Error", "Please select whether you are a Company or Institution.");
      return;
    }

    if (!selectedType) {
      Alert.alert("Error", "Please select a company/institution type first.");
      return;
    }

    try {
      setUploading(true);
      const user = auth().currentUser;
      if (!user) {
        Alert.alert("Error", "User not logged in.");
        return;
      }

      const finalData = await uploadAllFiles(user.uid);
      setFormData(finalData);

      const normalizedData = {
        userType: entityType.toLowerCase(), // 🔹 dynamically sets company or institution
        companyType: selectedType.name,
      };

      selectedType.fields?.forEach((field) => {
        const entry = finalData[field.id];
        const key = field.label
          .toLowerCase()
          .trim()
          .replace(/\s+/g, "_")
          .replace(/[^\w_]/g, "");

        normalizedData[key] = {
          mapping: field.label,
          value: entry?.value || "",
        };

        if (entry?.fileLocation) {
          normalizedData[key].fileLocation = entry.fileLocation;
        }
      });

      await firestore()
        .collection("users")
        .doc(user.uid)
        .set(
          {
            ...normalizedData,
            status: "pending",
            hasChecked: true,
          },
          { merge: true }
        );

      firestore()
        .collection("notifications")
        .add({
          notificationFrom: "ADMIN",
          notificationTo: user.uid,
          notificationType: "COMPANY_VERIFICATION_ACTION",
          notificationText: "Your verification request has been received!",
          comment: `${entityType} verification form submitted successfully.`,
          createdOn: serverTimestamp(),
          status:'UNREAD'

        })
        .catch((err) => console.error("Notification add failed:", err));

      Alert.alert("Success", `${entityType} verification submitted! We’ll notify you soon.`);
    } catch (error) {
      console.error("Submit error:", error);
      Alert.alert("Error", "Could not submit verification data.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* 🔹 Header */}
      <View style={[styles.header, { borderBottomColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Company/Institution Verification
        </Text>
      </View>

      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Select whether you are a Company or Institution, then fill out details for verification.
      </Text>

      {/* 🔹 Entity Type Dropdown */}
      <TouchableOpacity
        style={[
          styles.dropdown,
          { borderColor: colors.primary, backgroundColor: colors.surface },
        ]}
        onPress={() => setEntityDropdownVisible(true)}
      >
        <Text style={{ color: colors.text }}>
          {entityType ? entityType : "Select Entity Type"}
        </Text>
      </TouchableOpacity>

      {/* Entity Dropdown Modal */}
      <Modal
        visible={entityDropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEntityDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPressOut={() => setEntityDropdownVisible(false)}
        >
          <View
            style={[
              styles.dropdownContainer,
              { backgroundColor: colors.surface, borderColor: colors.primary },
            ]}
          >
            {["Company", "Institution"].map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.dropdownItem}
                onPress={() => {
                  setEntityType(option);
                  setEntityDropdownVisible(false);
                }}
              >
                <Text style={{ color: colors.text, fontSize: 16 }}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 🔹 Company Type Dropdown */}
      {entityType && (
        <>
          <TouchableOpacity
            style={[
              styles.dropdown,
              { borderColor: colors.primary, backgroundColor: colors.surface },
            ]}
            onPress={() => setDropdownVisible(true)}
          >
            <Text style={{ color: colors.text }}>
              {selectedType ? selectedType.name : "Select Type"}
            </Text>
          </TouchableOpacity>

          <Modal
            visible={dropdownVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setDropdownVisible(false)}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPressOut={() => setDropdownVisible(false)}
            >
              <View
                style={[
                  styles.dropdownContainer,
                  { backgroundColor: colors.surface, borderColor: colors.primary },
                ]}
              >
                <FlatList
                  data={companyTypes}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSelectedType(item);
                        setDropdownVisible(false);
                      }}
                    >
                      <Text style={{ color: colors.text, fontSize: 16 }}>{item.name}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </TouchableOpacity>
          </Modal>
        </>
      )}

      {/* 🔹 Dynamic Form */}
      {selectedType && (
        <View style={{ marginTop: 24 }}>
          <Text style={[styles.formTitle, { color: colors.text }]}>
            {selectedType.name} Details
          </Text>

          {selectedType.fields?.map((field) => {
            if (field.type === "file") {
              const uploaded = formData[field.id]?.fileLocation;
              return (
                <TouchableOpacity
                  key={field.id}
                  style={[
                    styles.fileUpload,
                    {
                      borderColor: colors.primary,
                      backgroundColor: uploaded ? "#d7ffd9" : colors.surface,
                    },
                  ]}
                  onPress={() => handleFileSelect(field)}
                  disabled={uploading}
                >
                  <Text style={{ color: colors.text }}>
                    {field.label}
                    {field.required ? " *" : ""}
                    {uploaded ? " ✅" : ""}
                  </Text>
                </TouchableOpacity>
              );
            }

            return (
              <ThemedTextInput
                key={field.id}
                label={`${field.label}${field.required ? " *" : ""}`}
                value={formData[field.id]?.value || ""}
                onChangeText={(v) => handleFieldChange(field.id, v)}
                keyboardType={field.type === "number" ? "numeric" : "default"}
              />
            );
          })}

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={uploading}
            disabled={uploading}
            style={[styles.button, { backgroundColor: colors.primary }]}
          >
            {uploading ? "Submitting..." : "Request Verification"}
          </Button>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  subtitle: { fontSize: 16, marginBottom: 24 },
  input: { marginBottom: 16 },
  button: { borderRadius: 12, elevation: 2, marginTop: 12 },
  dropdown: {
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  dropdownContainer: {
    position: "absolute",
    top: "25%",
    left: "10%",
    right: "10%",
    maxHeight: 300,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 8,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "center",
  },
  formTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  fileUpload: {
    padding: 14,
    borderWidth: 1.5,
    borderRadius: 10,
    marginBottom: 16,
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: "600", marginLeft: 12 },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    marginBottom: 16,
  },
});

export default CompanyVerificationPage;
