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
import Icon from "react-native-vector-icons/MaterialIcons";
import firestore from "@react-native-firebase/firestore";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { useSelector } from "react-redux";
import { Calendar } from "react-native-calendars";
import CustomHeaderCompany from "../components/CustomHeaderCompany";
import { useNavigation } from "@react-navigation/native";
const ensureDate = (d) => {
  if (!d) return null;
  if (d instanceof Date) return d;
  if (d?.seconds) return d.toDate();
  return new Date(d);
};
const HomeScreenComp = ({  }) => { 
  const { colors } = useTheme();
  const navigation=useNavigation()
  const { user: userData } = useSelector((state) => state.user);
  const COMPANY_ID = userData?.uid;
  const { filters, jobOptions } = useSelector((state) => state.selection);
const [selectedStatus, setSelectedStatus] = useState("OPENED"); // default Open
  const [jobs, setJobs] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [dropdownType, setDropdownType] = useState(null);
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

const renderStatusTabs = () => {
  const statuses = ["OPENED", "CLOSED"];

  return (
    <View
      style={{
        flexDirection: "row",
        height: 50,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {statuses.map((status) => {
        const isActive = selectedStatus === status;

        return (
          <TouchableOpacity
            key={status}
            onPress={() => setSelectedStatus(status)}
            style={{
              width: `${100 / statuses.length}%`, // 50% each
              justifyContent: "center",
              alignItems: "center",
            }}
            activeOpacity={0.7}
          >
            <Text
              style={{
                color: isActive ? colors.primary : colors.textSecondary,
                fontWeight: "700",
                fontSize: 18,
              }}
            >
              {status}
            </Text>

            {/* underline */}
           
          </TouchableOpacity>
        );
      })}
    </View>
  );
};


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
  const now = new Date();

  if (selectedStatus === "Open") {
    return jobs.filter(
      (job) => job.status === "open" && (!job.deadline || job.deadline >= now)
    );
  } else {
    return jobs.filter(
      (job) => job.status === "closed" || (job.deadline && job.deadline < now)
    );
  }
}, [jobs, selectedStatus]);

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
  const deadline = ensureDate(jobData.deadline);

  if (!deadline) {
    Alert.alert("Invalid Deadline", "Please select a valid deadline.");
    return;
  }

  if (deadline < new Date()) {
    Alert.alert("Deadline Passed", "Please choose a future date.");
    return;
  }

  try {
    setSaving(true);

    const updated = {
      ...jobData,
      deadline: firestore.Timestamp.fromDate(deadline),
      updatedAt: firestore.Timestamp.now(),
    };

    await firestore().collection("jobs").doc(id).update(updated);

    // ✅ keep UI clean: Date stays Date
    setJobs((prev) =>
      prev.map((j) =>
        j.id === id
          ? {
              ...jobData,
              id,
              deadline,
              updatedAt: new Date(),
            }
          : j
      )
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
  <TouchableOpacity
          style={styles.deleteIcon}
          onPress={() => handleEdit(item)}
        >
          <Icon name="delete" size={20} color={colors.primary} />
        </TouchableOpacity>
        <Card.Content>
          <Text style={[styles.title, { color: colors.text }]}>
            {item.title || "Untitled Job" } - {item?.jobType|| "No Role"}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {item.location || "No location"} •{" "}
            {item.salary ? `${item.salary}` : "Salary not specified"}
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
      {renderStatusTabs()}

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
                        ? ensureDate(selectedJob.deadline)?.toISOString()?.split("T")[0]
                        : "Select Deadline"}
                    </Text>
                  </TouchableOpacity>

                  {calendarVisible && (
                    <Calendar  
                      onDayPress={(day) => {
                        handleFieldChange("deadline", new Date(day.dateString));
                        setCalendarVisible(false);
                      }}
                        minDate={todayStr}
                          maxDate={maxDeadline} // prevents selecting dates beyond 15 days
                      markedDates={{
                        [selectedJob.deadline
                          ? ensureDate(selectedJob.deadline)
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
  categoryContainer: {
  height: 50,
  marginBottom: 8,
  flexDirection: "row",       // horizontal layout
  alignItems: "center",       // vertically center items
  justifyContent: "center",   // horizontally center all tabs if needed
},
 categoryChip: {
  paddingHorizontal: 16,
  paddingVertical: 8,   // ensures text is vertically centered
  borderRadius: 20,
  borderWidth: 1,
  marginRight: 8,
},
  listContent: { padding: 10 },
  jobCard: {
    marginBottom: 12,
    borderRadius: 12,
    padding:8,
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
  deleteIcon:{
  position: "absolute",
    top: 50,
    right: 8,
    zIndex: 10,
    backgroundColor: "#ffffffaa",
    padding: 6,
    borderRadius: 20,
    
  
  },
  title: { fontSize: 15, fontWeight: "bold", },
  subtitle: { fontSize: 13,marginVertical:5 },
  deadline: { fontSize: 13 },
  status: { fontSize: 13,marginVertical:5  },
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
