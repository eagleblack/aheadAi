import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
} from "react-native";
import { TextInput, Button, Card } from "react-native-paper";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTheme } from "../context/ThemeContext";
import { pick, types } from "@react-native-documents/picker";
import RNFS from "react-native-fs";
import firestore, { serverTimestamp } from "@react-native-firebase/firestore";
import { useSelector } from "react-redux";
import { Calendar } from "react-native-calendars";
import IconM from "react-native-vector-icons/MaterialCommunityIcons";
const JobAccessScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { user: userData } = useSelector((state) => state.user);
  const { jobOptions, studentOptions, filters, error: filterError } = useSelector(
    (state) => state.selection
  );

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState({ type: null, index: null });

  const getCompanyName = () => userData?.comapany_name?.value || "Unknown Company";

  const normalizeJob = (job) => ({
    ...job,
    company: getCompanyName(),
    jobCategory: job.jobCategory || "",
    jobType: job.jobType || "",
  });
const today = new Date();
const formatDate = (d) => d.toISOString().split("T")[0];

// Max allowed deadline = today + 15 days
const getMaxDeadline = () => {
  const max = new Date();
  max.setDate(today.getDate() + 15);
  return formatDate(max);
};

const maxDeadline = getMaxDeadline();
const todayStr = formatDate(today);

const [deadline, setDeadline] = useState(null);
  const handleUploadExcel = async () => {
    try {
      setLoading(true);
      const results = await pick({ type: [types.xlsx, types.csv] });
      if (!results?.length) return;

      const file = results[0];
      const fileBase64 = await RNFS.readFile(file.uri, "base64");

      const payload = {
        file: {
          name: file.name || "jobs.xlsx",
          mimeType:
            file.type ||
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          data: fileBase64,
        },
      };

      const response = await fetch(
        "https://us-central1-ahead-9fb4c.cloudfunctions.net/jobExcelApi/job-excel-analyze",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();
      if (!result.ok) throw new Error(result.error || "AI parsing failed");

      const extractedJobs = result.data?.jobs || [];
      if (extractedJobs.length === 0)
        throw new Error("No jobs found in the uploaded file.");

      const normalizedJobs = extractedJobs.map((job) => ({
        ...normalizeJob(job),
        deadline: job.deadline
          ? firestore.Timestamp.fromDate(new Date(job.deadline))
          : "",
      }));

      setJobs(normalizedJobs);
      Alert.alert("✅ Success", `${normalizedJobs.length} jobs extracted!`);
    } catch (err) {
      if (err.message === "user canceled the document picker") return;
      console.error("❌ Upload/parse error:", err);
      Alert.alert("Error", err.message || "Failed to process file.");
    } finally {
      setLoading(false);
    }
  };

  const handleJobChange = (index, field, value) => {
    setJobs((prev) =>
      prev.map((job, i) =>
        i === index
          ? {
              ...job,
              [field]:
                field === "deadline" && value instanceof Date
                  ? firestore.Timestamp.fromDate(value)
                  : value,
              company: getCompanyName(),
            }
          : job
      )
    );
  };

  const handleAddManualJob = () => {
    const blankJob = normalizeJob({
      title: "",
      location: "",
      type: "",
      salary: "",
      experience: "",
      skills: "",
      description: "",
      deadline: "",
      Shift: "",
      jobCategory: "",
      jobType: "",
    });
    setJobs((prev) => [...prev, blankJob]);
  };

  const handleDeleteJob = (index) => {
    setJobs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      const requiredFields = [
        "title",
        "company",
        "location",
        "salary",
        "skills",
        "description",
        "deadline",
        "jobCategory",
        "jobType",
      ];
      const missing = requiredFields.find((f) => !job[f]);
      if (missing) {
        Alert.alert("Validation Error", `Job ${i + 1} is missing field: ${missing}`);
        return;
      }
    }

    try {
      setLoading(true);
      const batch = firestore().batch();

      jobs.forEach((job) => {
        const ref = firestore().collection("jobs").doc();
        batch.set(ref, {
          ...normalizeJob(job),
          avatar: userData?.profilePic || null,
          companyId: userData?.uid,
          status: "open",
          createdAt: FieldValue.ServerTimestamp(),
        });
      });

      await batch.commit();
      Alert.alert("✅ Success", `${jobs.length} jobs posted successfully!`);
      setJobs([]);
    } catch (err) {
      console.error("❌ Firestore submission error:", err);
      Alert.alert("Error", "Failed to post jobs.");
    } finally {
      setLoading(false);
    }
  };

  const inputTheme = {
    colors: {
      primary: colors.primary,
      background: colors.surface,
      onSurface: colors.text,
      placeholder: colors.text + "80",
      outlineColor: colors.border || "#999",
    },
  };

 const renderDropdown = (index, field, options) => {
  const value = jobs[index][field];
  const label = field === "jobCategory" ? "Job Category" : "Rank";

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.8}
        style={[
          styles.inputContainer,
          { borderColor: colors.primary, backgroundColor: colors.surface },
        ]}
        onPress={() => setActiveDropdown({ type: field, index })}
      >
        <Text
          style={{
            color: value ? colors.text : colors.text + "80",
            fontSize: 16,
            flex: 1,
          }}
          numberOfLines={1}
        >
          {value || `Select ${label}`}
        </Text>

        <IconM
          name={
            activeDropdown.type === field && activeDropdown.index === index
              ? "chevron-up"
              : "chevron-down"
          }
          size={24}
          color={colors.primary}
        />
      </TouchableOpacity>

      {/* Modal for FlatList options */}
      <Modal
        visible={activeDropdown.type === field && activeDropdown.index === index}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveDropdown({ type: null, index: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(item, idx) => idx.toString()}
              renderItem={({ item }) => {
                const isSelected = item === value;
                return (
                  <TouchableOpacity
                    style={[
                      styles.optionItem,
                      isSelected && {
                        backgroundColor: colors.primary + "15",
                        borderLeftWidth: 4,
                        borderLeftColor: colors.primary,
                      },
                    ]}
                    onPress={() => {
                      handleJobChange(index, field, item);
                      setActiveDropdown({ type: null, index: null });
                    }}
                  >
                    <Text
                      style={{
                        color: colors.text,
                        fontWeight: isSelected ? "600" : "400",
                      }}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.primary }]}
              onPress={() => setActiveDropdown({ type: null, index: null })}
            >
              <Text style={{ color: "white", fontWeight: "600" }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={[styles.card, { backgroundColor: colors.surface }]}>
          <Card.Content>
            <TouchableOpacity
              style={[styles.uploadBox, { borderColor: colors.primary }]}
              onPress={handleUploadExcel}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Icon name="upload-file" size={32} color={colors.primary} />
                  <Text style={[styles.uploadText, { color: colors.text }]}>
                    Upload Excel / CSV to Auto-Fill Jobs
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <Button
              mode="outlined"
              onPress={handleAddManualJob}
              style={[styles.addBtn, { borderColor: colors.primary }]}
              labelStyle={{ color: colors.primary }}
            >
              + Add Job Manually
            </Button>
          </Card.Content>
        </Card>

        {jobs.map((job, index) => (
          <Card key={index} style={[styles.card, { backgroundColor: colors.surface }]}>
            <Card.Content>
              <View style={styles.jobHeaderRow}>
                <Text style={[styles.jobHeader, { color: colors.text }]}>
                  Job {index + 1}
                </Text>
                <TouchableOpacity onPress={() => handleDeleteJob(index)}>
                  <Icon name="delete" size={22} color={colors.error || "red"} />
                </TouchableOpacity>
              </View>

              {/* Job Category */}
              {renderDropdown(index, "jobCategory", filters || [])}

              {/* Job Type */}
              {renderDropdown(index, "jobType", jobOptions || [])}

              {/* Other Fields */}
              {Object.keys(job).map((field) => {
                if (["jobCategory", "jobType"].includes(field)) return null;

                const value =
                  field === "deadline" && job[field] instanceof firestore.Timestamp
                    ? job[field].toDate().toISOString().split("T")[0]
                    : Array.isArray(job[field])
                    ? job[field].join(", ")
                    : job[field] ?? "";

                const label = field
                  .charAt(0)
                  .toUpperCase()
                  .concat(field.slice(1).replace(/([A-Z])/g, " $1"));

                if (field === "deadline") {
                  return (
                    <View key={field} style={{ marginBottom: 12 }}>
                      <Text style={{ marginBottom: 4, color: colors.text }}>{label}</Text>
                      <TouchableOpacity
                        style={[
                          styles.input,
                          {
                            borderColor: colors.primary,
                            padding: 12,
                            borderWidth:1
                          },
                        ]}
                        onPress={() => setCalendarVisible(index)}
                      >
                        <Text style={{ color: value ? colors.text : colors.text + "80" }}>
                          {value || "Select Deadline Maximum 15 days from today"}
                        </Text>
                      </TouchableOpacity>
                      {calendarVisible === index && (
                        <Calendar
                          onDayPress={(day) => {
                            handleJobChange(index, "deadline", new Date(day.dateString));
                            setCalendarVisible(null);
                          }} 
                          markedDates={{
                            [value]: { selected: true, selectedColor: colors.primary },
                          }}
                          minDate={todayStr}
                          maxDate={maxDeadline} // prevents selecting dates beyond 15 days
                          theme={{
                            todayTextColor: colors.primary,
                            selectedDayBackgroundColor: colors.primary,
                          }}
                        />
                      )}
                    </View>
                  );
                }

                return (
                  <TextInput
                    key={field}
                    label={label}
                    mode="outlined"
                    value={value}
                    onChangeText={(t) => handleJobChange(index, field, t)}
                    style={styles.input}
                    theme={inputTheme}
                    multiline={field === "description"}
                    numberOfLines={field === "description" ? 4 : 1}
                    editable={field !== "company"}
                  />
                );
              })}
            </Card.Content>
          </Card>
        ))}

        {jobs.length > 0 && (
          <Button
            mode="contained"
            onPress={handleSubmit}
            style={[styles.submitBtn, { backgroundColor: colors.primary }]}
            labelStyle={{ color: colors.onPrimary ?? "#fff" }}
          >
            Submit All Jobs
          </Button>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 12, paddingBottom: 40 },
  card: { borderRadius: 12, marginBottom: 16, elevation: 2 },
  uploadBox: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadText: { marginTop: 8, fontSize: 14, fontWeight: "500" },
  addBtn: { marginTop: 16, borderRadius: 8, borderWidth: 1.2 },
  jobHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  jobHeader: { fontSize: 16, fontWeight: "600" },
  input: { marginBottom: 12},
  submitBtn: { marginTop: 16, borderRadius: 8, paddingVertical: 6 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000070",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "85%",
    maxHeight: "70%",
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: { fontSize: 16, fontWeight: "600", marginBottom: 10 },
  optionItem: {
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderColor: "#ccc",
  },
    inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: "90%",
    alignSelf: "center",
    marginTop: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginBottom:10
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "85%",
    maxHeight: "70%",
    borderRadius: 16,
    padding: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
    textAlign: "center",
  },
  optionItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 0.4,
    borderBottomColor: "#ccc",
    borderRadius: 6,
  },
  closeButton: {
    alignSelf: "center",
    marginTop: 15,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
});

export default JobAccessScreen;
