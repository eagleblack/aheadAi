// JobListing.js
import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
} from "react-native";
import { Card, Button, TextInput, ActivityIndicator } from "react-native-paper";
import Icon from "@react-native-vector-icons/material-icons";
import firestore from "@react-native-firebase/firestore";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { useSelector } from "react-redux";
import { Calendar } from "react-native-calendars";
import CustomHeaderCompany from "../components/CustomHeaderCompany";
import { useNavigation } from "@react-navigation/native";

const HomeScreenComp = ({  }) => {
  const { colors } = useTheme();
  const navigation=useNavigation()
  const { user: userData } = useSelector((state) => state.user);
  const COMPANY_ID = userData?.uid;
  const { filters, jobOptions } = useSelector((state) => state.selection);

  const [jobs, setJobs] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [dropdownType, setDropdownType] = useState(null);

  // Fetch company jobs
  useEffect(() => {
    const unsubscribe = firestore()
      .collection("jobs")
      .where("companyId", "==", COMPANY_ID)
      .onSnapshot(
        (snapshot) => {
          const fetchedJobs = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            deadline: parseDeadline(doc.data().deadline),
          }));
          setJobs(fetchedJobs);
          setLoading(false);
        },
        (err) => {
          console.error("❌ Firestore error:", err);
          Alert.alert("Error", "Failed to fetch job listings.");
          setLoading(false);
        }
      );

    return () => unsubscribe();
  }, [COMPANY_ID]);


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
  // Filter jobs by category
  const filteredJobs = useMemo(() => {
    if (selectedCategory === "All") return jobs;
    return jobs.filter((job) => job?.jobType === selectedCategory);
  }, [jobs, selectedCategory]);

  // --- Modal Edit Logic ---
  const handleEdit = (job) => {
    setSelectedJob({ ...job });
    setModalVisible(true);
  };

  const handleFieldChange = (field, value) => {
    setSelectedJob((prev) => ({ ...prev, [field]: value }));
  };

  const flipStatus = () => {
    if (!selectedJob) return;
    const newStatus = selectedJob.status === "open" ? "closed" : "open";

    if (newStatus === "open") {
      if (!selectedJob.deadline || selectedJob.deadline < new Date()) {
        Alert.alert(
          "Invalid Deadline",
          "You cannot open this job because the deadline has already passed."
        );
        return;
      }
    }

    setSelectedJob((prev) => ({ ...prev, status: newStatus }));
  };

  const handleSave = async () => {
    if (!selectedJob) return;

    const { id, ...jobData } = selectedJob;

    if (!jobData.deadline || !(jobData.deadline instanceof Date)) {
      Alert.alert("Invalid Deadline", "Please select a valid deadline.");
      return;
    }

    if (jobData.deadline < new Date()) {
      Alert.alert("Deadline Passed", "Please select a future date.");
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
      Alert.alert("✅ Updated", "Job updated successfully!");
    } catch (err) {
      console.error("❌ Update error:", err);
      Alert.alert("Error", "Failed to update job.");
    } finally {
      setSaving(false);
    }
  };

  // --- UI Render ---
  const renderCategoryTabs = () => {
    const categories = ["All", ...(jobOptions || [])];
    return (
      <View style={styles.categoryContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 10,
            alignItems: "center",
          }}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              onPress={() => setSelectedCategory(category)}
              style={[
                styles.categoryChip,
                {
                  backgroundColor:
                    selectedCategory === category
                      ? colors.primary
                      : colors.surface,
                  borderColor: colors.primary,
                },
              ]}
            >
              <Text
                style={{
                  color:
                    selectedCategory === category
                      ? colors.onPrimary
                      : colors.text,
                  fontWeight: "600",
                }}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderJob = ({ item }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate("Candidates", { jobId: item.id })}
      activeOpacity={0.9}
    >
      <Card style={[styles.jobCard, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={styles.editIcon}
          onPress={() => handleEdit(item)}
        >
          <Icon name="edit" size={20} color={colors.primary} />
        </TouchableOpacity>

        <Card.Content>
          <Text style={[styles.title, { color: colors.text }]}>
            {item.title || "Untitled Job"}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {item.location || "No location"} •{" "}
            {item.salary ? `₹${item.salary}` : "Salary not specified"}
          </Text>
           <Text style={[styles.deadline, { color: colors.textSecondary }]}>
                           Deadline:{" "}
                         {item?.deadline
           ? (item.deadline instanceof Date
               ? item.deadline.toLocaleDateString()
               : item.deadline.toDate().toLocaleDateString())
           : "Not set"}
                         </Text>
          <Text style={[styles.status, { color: colors.textSecondary }]}>
            Status: {item.status === "open" ? "Open" : "Closed"}
          </Text>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <CustomHeaderCompany />
      {renderCategoryTabs()}

      <FlatList
        data={filteredJobs}
        renderItem={renderJob}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        style={{ marginBottom: 80 }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="work-off" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No Jobs Created.
            </Text>
            <Text style={[styles.emptyMsg, { color: colors.textSecondary }]}>
              Your posted jobs will appear here.
            </Text>
          </View>
        }
      />

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

              {selectedJob && (
                <>
                  <TextInput
                    label="Title"
                    mode="outlined"
                    value={selectedJob.title ?? ""}
                    onChangeText={(t) => handleFieldChange("title", t)}
                    style={styles.input}
                  />
                  <TextInput
                    label="Location"
                    mode="outlined"
                    value={selectedJob.location ?? ""}
                    onChangeText={(t) => handleFieldChange("location", t)}
                    style={styles.input}
                  />
                  <TextInput
                    label="Salary"
                    mode="outlined"
                    value={String(selectedJob.salary ?? "")}
                    onChangeText={(t) => handleFieldChange("salary", t)}
                    style={styles.input}
                  />
                  <TextInput
                    label="Experience"
                    mode="outlined"
                    value={selectedJob.experience ?? ""}
                    onChangeText={(t) => handleFieldChange("experience", t)}
                    style={styles.input}
                  />
                  <TextInput
                    label="Skills"
                    mode="outlined"
                    value={selectedJob.skills ?? ""}
                    onChangeText={(t) => handleFieldChange("skills", t)}
                    style={styles.input}
                  />
                  <TextInput
                    label="Shift"
                    mode="outlined"
                    value={selectedJob.shift ?? ""}
                    onChangeText={(t) => handleFieldChange("shift", t)}
                    style={styles.input}
                  />
                  <TouchableOpacity
                    style={[styles.dropdown, { borderColor: colors.primary }]}
                    onPress={() => setDropdownType("category")}
                  >
                    <Text style={{ color: colors.text }}>
                      {selectedJob.jobCategory || "Select Job Category"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.dropdown, { borderColor: colors.primary }]}
                    onPress={() => setDropdownType("type")}
                  >
                    <Text style={{ color: colors.text }}>
                      {selectedJob.jobType || "Select Job Type"}
                    </Text>
                  </TouchableOpacity>
                  <TextInput
                    label="Description"
                    mode="outlined"
                    value={selectedJob.description ?? ""}
                    multiline
                    numberOfLines={4}
                    onChangeText={(t) => handleFieldChange("description", t)}
                    style={styles.input}
                  />

                  {/* Deadline Picker */}
                  <TouchableOpacity
                    style={[styles.input, { padding: 12 }]}
                    onPress={() => setCalendarVisible(true)}
                  >
                    <Text
                      style={{
                        color: selectedJob.deadline
                          ? colors.text
                          : colors.text + "80",
                      }}
                    >
                      {selectedJob.deadline
                        ? selectedJob.deadline.toISOString().split("T")[0]
                        : "Select Deadline"}
                    </Text>
                  </TouchableOpacity>

                  {calendarVisible && (
                    <Calendar
                      onDayPress={(day) => {
                        handleFieldChange("deadline", new Date(day.dateString));
                        setCalendarVisible(false);
                      }}
                      markedDates={{
                        [selectedJob.deadline
                          ? selectedJob.deadline
                              .toISOString()
                              .split("T")[0]
                          : ""]: {
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

                  {/* Flip Status */}
                  <TouchableOpacity
                    style={[
                      styles.flipBtn,
                      {
                        backgroundColor:
                         colors.primary
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
                </>
              )}

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
                  Save
                </Button>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Dropdown modal */}
      <Modal visible={!!dropdownType} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setDropdownType(null)}
        >
          <View style={[styles.dropdownBox, { backgroundColor: colors.surface }]}>
            <ScrollView>
              {(dropdownType === "category" ? filters : jobOptions || []).map(
                (opt) => (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => {
                      handleFieldChange(
                        dropdownType === "category" ? "jobCategory" : "jobType",
                        opt
                      );
                      setDropdownType(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        { color: colors.text, padding: 10 },
                      ]}
                    >
                      {opt}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  categoryContainer: { height: 50, marginBottom: 8 },
  categoryChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  listContent: { padding: 10 },
  jobCard: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    position: "relative",
  },
  editIcon: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 10,
    backgroundColor: "#ffffffaa",
    padding: 6,
    borderRadius: 20,
  },
  title: { fontSize: 15, fontWeight: "bold" },
  subtitle: { fontSize: 13 },
  deadline: { fontSize: 13, marginTop: 4 },
  status: { fontSize: 13, marginTop: 2 },
  emptyState: { alignItems: "center", justifyContent: "center", padding: 60 },
  emptyTitle: { fontSize: 18, fontWeight: "bold", marginTop: 16 },
  emptyMsg: { fontSize: 14, marginTop: 4, textAlign: "center" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
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
  flipBtn: {
    paddingVertical: 8,
    borderRadius: 8,
    marginVertical: 8,
    alignItems: "center",
  },
  flipBtnText: { color: "#fff", fontWeight: "600" },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  dropdown: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  dropdownBox: {
    borderRadius: 10,
    padding: 15,
    marginHorizontal: 20,
  },
  optionText: {
    fontSize: 16,
    paddingVertical: 6,
  },
});

export default HomeScreenComp;
