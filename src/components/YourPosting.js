// YourPosting.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
} from "react-native";
import { Card, TextInput, Button, ActivityIndicator } from "react-native-paper";
import Icon from "@react-native-vector-icons/material-icons";
import firestore from "@react-native-firebase/firestore";
import { useTheme } from "../context/ThemeContext";
import { useSelector } from "react-redux";
import { Calendar } from "react-native-calendars";

const YourPosting = () => {
  const { colors } = useTheme();
  const { user: userData } = useSelector((state) => state.user);
  const COMPANY_ID = userData?.uid;

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const snapshot = await firestore()
          .collection("jobs")
          .where("companyId", "==", COMPANY_ID)
          .get();

        const fetched = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const parsedJobs = fetched.map((job) => ({
          ...job,
          deadline: parseDeadline(job.deadline),
        }));

        setJobs(parsedJobs);
      } catch (err) {
        console.error("❌ Fetch error:", err);
        Alert.alert("Error", "Failed to fetch your job postings.");
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  const parseDeadline = (deadline) => {
    if (!deadline) return null;
    if (deadline instanceof Date) return deadline;
    if (deadline.seconds) return deadline.toDate();
    try {
      return new Date(deadline);
    } catch {
      return null;
    }
  };

  const handleEdit = (job) => {
    setSelectedJob({ ...job });
    setCalendarVisible(false);
    setModalVisible(true);
  };

  const handleFieldChange = (field, value) => {
    setSelectedJob((prev) => ({ ...prev, [field]: value }));
  };

  const flipStatus = () => {
    if (!selectedJob) return;
    const newStatus = selectedJob.status === "open" ? "closed" : "open";

    // If reopening the job, make sure deadline is still in the future
    if (newStatus === "open") {
      if (!selectedJob.deadline || selectedJob.deadline < new Date()) {
        Alert.alert(
          "Invalid Deadline",
          "You cannot open this job because the deadline has already passed. Please update the deadline first."
        );
        return;
      }
    }

    setSelectedJob((prev) => ({
      ...prev,
      status: newStatus,
    }));
  };

  const handleSave = async () => {
    if (!selectedJob) return;

    const { id, ...jobData } = selectedJob;

    if (!jobData.deadline || !(jobData.deadline instanceof Date)) {
      Alert.alert("Invalid Deadline", "Please select a valid deadline.");
      return;
    }

    if (jobData.deadline < new Date()) {
      Alert.alert(
        "Deadline Passed",
        "Please select a future date for the deadline."
      );
      return;
    }

    try {
      setSaving(true);

      const updated = {
        ...jobData,
        deadline: firestore.Timestamp.fromDate(jobData.deadline),
        updatedAt: firestore.Timestamp.now(),
      };

      await firestore().collection("jobs").doc(id).update(updated);

      setJobs((prev) =>
        prev.map((j) => (j.id === id ? { ...updated, id } : j))
      );

      setModalVisible(false);
      Alert.alert("✅ Job Updated", "Your job post has been updated successfully!");
    } catch (err) {
      console.error("❌ Update error:", err);
      Alert.alert("Error", "Failed to update job.");
    } finally {
      setSaving(false);
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }}>
        {jobs.length === 0 ? (
          <Text style={{ color: colors.textSecondary, textAlign: "center" }}>
            You haven’t posted any jobs yet.
          </Text>
        ) : (
          jobs.map((job) => (
            <Card
              key={job.id}
              style={[styles.card, { backgroundColor: colors.surface }]}
            >
              <Card.Content>
                <Text style={[styles.title, { color: colors.text }]}>
                  {job.title || "Untitled Job"}
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  {job.location || "No location"} •{" "}
                  {job.salary ? `₹${job.salary}` : "Salary not specified"}
                </Text>
                <Text style={[styles.deadline, { color: colors.textSecondary }]}>
                  Deadline:{" "}
                {job?.deadline
  ? (job.deadline instanceof Date
      ? job.deadline.toLocaleDateString()
      : job.deadline.toDate().toLocaleDateString())
  : "Not set"}
                </Text>
                <Text style={[styles.status, { color: colors.textSecondary }]}>
                  Status: {job.status?.toLowerCase() === "open" ? "Open" : "Closed"}
                </Text>

                <TouchableOpacity
                  style={[styles.editBtn, { backgroundColor: colors.primary }]}
                  onPress={() => handleEdit(job)}
                >
                  <Icon name="edit" size={20} color="#fff" />
                  <Text style={styles.editBtnText}>Edit Job</Text>
                </TouchableOpacity>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      {/* ✏️ Edit Job Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.surface, borderColor: colors.primary },
            ]}
          >
            <ScrollView>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Edit Job
              </Text>

              {selectedJob &&
                Object.keys(selectedJob)
                  .filter(
                    (key) =>
                      !["id", "companyId", "avatar", "updatedAt"].includes(key)
                  )
                  .map((field) => {
                    if (field === "deadline") {
                      const value = selectedJob.deadline
                        ? selectedJob.deadline.toISOString().split("T")[0]
                        : "";

                      return (
                        <View key={field} style={{ marginBottom: 12 }}>
                          <Text style={{ marginBottom: 4, color: colors.text }}>
                            Deadline
                          </Text>
                          <TouchableOpacity
                            style={[
                              styles.input,
                              { borderColor: colors.primary, padding: 12 },
                            ]}
                            onPress={() => setCalendarVisible(true)}
                          >
                            <Text
                              style={{
                                color: value ? colors.text : colors.text + "80",
                              }}
                            >
                              {value || "Select Deadline"}
                            </Text>
                          </TouchableOpacity>
                          {calendarVisible && (
                            <Calendar
                              onDayPress={(day) => {
                                handleFieldChange(
                                  "deadline",
                                  new Date(day.dateString)
                                );
                                setCalendarVisible(false);
                              }}
                              markedDates={{
                                [value]: {
                                  selected: true,
                                  selectedColor: colors.primary,
                                },
                              }}
                              theme={{
                                todayTextColor: colors.primary,
                                selectedDayBackgroundColor: colors.primary,
                              }}
                            />
                          )}
                        </View>
                      );
                    }

                    if (field === "status") {
                      return (
                        <View key={field} style={{ marginBottom: 12 }}>
                          <TextInput
                            label="Status"
                            mode="outlined"
                            value={selectedJob[field] ?? "open"}
                            onChangeText={(t) =>
                              handleFieldChange(
                                "status",
                                t.toLowerCase() === "open" ? "open" : "closed"
                              )
                            }
                            style={styles.input}
                          />
                          <TouchableOpacity
                            style={[
                              styles.flipBtn,
                              {
                                backgroundColor:
                                  selectedJob.status === "open"
                                    ? colors.error
                                    : colors.primary,
                              },
                            ]}
                            onPress={flipStatus}
                          >
                            <Text style={styles.flipBtnText}>
                              {selectedJob.status === "open"
                                ? "Close Job"
                                : "Reopen Job"}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      );
                    }

                    return (
                      <TextInput
                        key={field}
                        label={field.charAt(0).toUpperCase() + field.slice(1)}
                        mode="outlined"
                        value={String(selectedJob[field] ?? "")}
                        onChangeText={(t) => handleFieldChange(field, t)}
                        style={styles.input}
                        multiline={field === "description"}
                        numberOfLines={field === "description" ? 4 : 1}
                      />
                    );
                  })}

              <View style={styles.modalActions}>
                <Button
                  mode="outlined"
                  onPress={() => setModalVisible(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSave}
                  loading={saving}
                  style={{ backgroundColor: colors.primary }}
                >
                  Save Changes
                </Button>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: { borderRadius: 12, marginBottom: 12, padding: 6, elevation: 2 },
  title: { fontSize: 16, fontWeight: "600" },
  subtitle: { fontSize: 14, marginTop: 2 },
  deadline: { fontSize: 13, marginTop: 4 },
  status: { fontSize: 13, marginTop: 2 },
  editBtn: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: 8,
  },
  editBtnText: { color: "#fff", marginLeft: 6, fontWeight: "600" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "#00000088",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    maxHeight: "80%",
  },
  modalTitle: { fontSize: 18, fontWeight: "600", marginBottom: 12 },
  input: { marginBottom: 10 },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  flipBtn: {
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 6,
    alignItems: "center",
  },
  flipBtnText: { color: "#fff", fontWeight: "600" },
});

export default YourPosting;
