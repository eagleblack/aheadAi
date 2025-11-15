import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Card, Divider } from "react-native-paper";
import firestore from "@react-native-firebase/firestore";
import DateTimePicker from "@react-native-community/datetimepicker";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTheme } from "../context/ThemeContext";
import { Calendar } from "react-native-calendars";

const SERVICES_COL = "services";
const AVAILABILITY_COL = "availability";

const ServicesAndSlotsSection = ({ uid }) => {
  const { colors } = useTheme();

  const [services, setServices] = useState([]);
  const [availability, setAvailability] = useState([]);

  const [selectedDate, setSelectedDate] = useState(null);

  // -------------------- SERVICES --------------------
  const [serviceModalVisible, setServiceModalVisible] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceForm, setServiceForm] = useState({
    title: "",
    description: "",
    price: "",
    duration: 30, // default duration in minutes
  });

  // -------------------- SLOTS --------------------
  const [slotModalVisible, setSlotModalVisible] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [slotDraft, setSlotDraft] = useState({
    date: new Date(),
    start: new Date(),
    end: new Date(),
  });
  const [showDatePickerFor, setShowDatePickerFor] = useState(null);

  // -------------------- FETCH DATA --------------------
  useEffect(() => {
    const unsubServices = firestore()
      .collection(SERVICES_COL)
      .where("uid", "==", uid)
      .onSnapshot((snap) => {
        const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setServices(data);
      });

    const unsubSlots = firestore()
      .collection(AVAILABILITY_COL)
      .where("uid", "==", uid)
      .onSnapshot((snap) => {
        const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setAvailability(data);
      });

    return () => {
      unsubServices();
      unsubSlots();
    };
  }, [uid]);

  // -------------------- SERVICE FUNCTIONS --------------------
  const openServiceModal = (service = null) => {
    setEditingService(service);
    setServiceForm(
      service
        ? {
            title: service.title,
            description: service.description,
            price: String(service.price),
            duration: service.duration || 30,
          }
        : { title: "", description: "", price: "", duration: 30 }
    );
    setServiceModalVisible(true);
  };

  const saveService = async () => {
    try {
      if (!serviceForm.title || !serviceForm.price || !serviceForm.duration) {
        return Alert.alert("Error", "Please fill title, price, and duration.");
      }

      const serviceData = {
        ...serviceForm,
        price: Number(serviceForm.price),
        duration: Number(serviceForm.duration),
      };

      if (editingService) {
        await firestore()
          .collection(SERVICES_COL)
          .doc(editingService.id)
          .update(serviceData);
      } else {
        await firestore()
          .collection(SERVICES_COL)
          .add({ ...serviceData, uid });
      }

      setServiceModalVisible(false);
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  const deleteService = (serviceId) => {
    Alert.alert("Confirm", "Delete this service?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await firestore().collection(SERVICES_COL).doc(serviceId).delete();
        },
      },
    ]);
  };

  // -------------------- SLOT FUNCTIONS --------------------
const openSlotModal = (slot = null) => {
  setEditingSlot(slot);

  if (slot) {
    // Editing existing slot
    setSlotDraft({
      date: new Date(slot.date),
      start: new Date(slot.start),
      end: new Date(slot.end),
    });
  } else {
    // Creating new slot
    const baseDate = selectedDate ? new Date(selectedDate) : new Date();
    
    // Set default start and end times
    const start = new Date(baseDate);
    start.setHours(9, 0, 0, 0); // 09:00 AM
    const end = new Date(baseDate);
    end.setHours(10, 0, 0, 0); // 10:00 AM

    setSlotDraft({
      date: baseDate,
      start,
      end,
    });
  }

  setSlotModalVisible(true);
};


  const saveSlot = async () => {
    if (slotDraft.start >= slotDraft.end) {
      return Alert.alert("Error", "Start time must be before end time.");
    }

    try {
      if (editingSlot) {
        await firestore().collection(AVAILABILITY_COL).doc(editingSlot.id).update({
          date: slotDraft.date,
          start: slotDraft.start,
          end: slotDraft.end,
        });
      } else {
        await firestore().collection(AVAILABILITY_COL).add({
          uid,
          date: slotDraft.date,
          start: slotDraft.start,
          end: slotDraft.end,
          booked: false,
        });
      }
      setSlotModalVisible(false);
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  const deleteSlot = (slotId) => {
    Alert.alert("Confirm", "Delete this slot?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await firestore().collection(AVAILABILITY_COL).doc(slotId).delete();
        },
      },
    ]);
  };

  // -------------------- FILTER SLOTS --------------------
  const slotsForSelectedDate = selectedDate
    ? availability.filter((item) => {
        try {
          const d =
            item?.date && typeof item.date?.toDate === "function"
              ? item.date.toDate()
              : new Date(item?.date);
          if (!(d instanceof Date) || isNaN(d.getTime())) return false;
          return d.toISOString().split("T")[0] === selectedDate;
        } catch {
          return false;
        }
      })
    : [];

  const markedDates = availability.reduce((acc, item) => {
    try {
      const d =
        item?.date && typeof item.date?.toDate === "function"
          ? item.date.toDate()
          : new Date(item?.date);
      if (!(d instanceof Date) || isNaN(d.getTime())) return acc;

      const dateKey = d.toISOString().split("T")[0];
      acc[dateKey] = {
        marked: true,
        dotColor: item.booked ? "#f87171" : "#34d399",
        selected: dateKey === selectedDate,
        selectedColor: colors.primary,
      };
      return acc;
    } catch {
      return acc;
    }
  }, {});

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 80 }}
      showsVerticalScrollIndicator={false}
    >
      {/* -------------------- SERVICES -------------------- */}
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Services</Text>
        <TouchableOpacity onPress={() => openServiceModal()} style={styles.addButton}>
          <Icon name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={services}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card style={[styles.card, { backgroundColor: colors.surface }]} mode="elevated">
            <View style={styles.cardRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.serviceTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.serviceDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                  {item.description}
                </Text>
                <Text style={[styles.servicePrice, { color: colors.primary }]}>
                  ₹{item.price} • {item.duration} min
                </Text>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => openServiceModal(item)} style={styles.iconButton}>
                  <Icon name="edit" size={20} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteService(item.id)} style={styles.iconButton}>
                  <Icon name="delete" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No services added yet.</Text>
        }
      />

      <Divider style={{ marginVertical: 20, opacity: 0.3 }} />

      {/* -------------------- AVAILABILITY -------------------- */}
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Availability</Text>
      </View>

      <Calendar
        markedDates={markedDates}
        onDayPress={(day) => setSelectedDate(day.dateString)}
        theme={{
          selectedDayBackgroundColor: colors.primary,
          todayTextColor: colors.primary,
          arrowColor: colors.primary,
        }}
        style={{ borderRadius: 16, marginBottom: 12 }}
      />

      {selectedDate && (
        <View>
          <View style={styles.headerRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{new Date(selectedDate).toDateString()}</Text>
            <TouchableOpacity onPress={() => openSlotModal()} style={[styles.addButton, { backgroundColor: "#34d399" }]}>
              <Icon name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={slotsForSelectedDate}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={[styles.slotItem, { backgroundColor: item.booked ? "#f87171" : "#34d399" }]}>
                <Text style={styles.slotText}>
                  {item.start.toDate ? item.start.toDate().toLocaleTimeString() : new Date(item.start).toLocaleTimeString()}
                  -
                  {item.end.toDate ? item.end.toDate().toLocaleTimeString() : new Date(item.end).toLocaleTimeString()}
                  {"  "}({item.booked ? "Booked" : "Available"})
                </Text>
                <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
                  {!item.booked && (
                    <>
                      <TouchableOpacity onPress={() => openSlotModal(item)} style={styles.iconButton}>
                        <Icon name="edit" size={20} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteSlot(item.id)} style={styles.iconButton}>
                        <Icon name="delete" size={20} color="#fff" />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            )}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No slots on this date yet.</Text>
            }
          />
        </View>
      )}

      {/* -------------------- SLOT MODAL -------------------- */}
      <Modal visible={slotModalVisible} transparent animationType="slide" onRequestClose={() => setSlotModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingSlot ? "Edit Slot" : "Add Slot"}
            </Text>

            <TouchableOpacity onPress={() => setShowDatePickerFor("start")} style={styles.input}>
              <Text style={{ color: colors.text }}>Start: {slotDraft.start.toLocaleTimeString()}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowDatePickerFor("end")} style={styles.input}>
              <Text style={{ color: colors.text }}>End: {slotDraft.end.toLocaleTimeString()}</Text>
            </TouchableOpacity>

            {showDatePickerFor && (
              <DateTimePicker
                value={slotDraft[showDatePickerFor]}
                mode="time"
                is24Hour
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePickerFor(null);
                  if (selectedDate) {
                    setSlotDraft({ ...slotDraft, [showDatePickerFor]: selectedDate });
                  }
                }}
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setSlotModalVisible(false)} style={[styles.modalButton, { backgroundColor: "#ef4444" }]}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveSlot} style={[styles.modalButton, { backgroundColor: colors.primary }]}>
                <Text style={styles.modalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* -------------------- SERVICE MODAL -------------------- */}
      <Modal visible={serviceModalVisible} transparent animationType="slide" onRequestClose={() => setServiceModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{editingService ? "Edit Service" : "Add Service"}</Text>

            <TextInput
              placeholder="Title"
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { color: colors.text }]}
              value={serviceForm.title}
              onChangeText={(text) => setServiceForm({ ...serviceForm, title: text })}
            />

            <TextInput
              placeholder="Description"
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { color: colors.text }]}
              value={serviceForm.description}
              onChangeText={(text) => setServiceForm({ ...serviceForm, description: text })}
            />

            <TextInput
              placeholder="Price"
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { color: colors.text }]}
              keyboardType="numeric"
              value={serviceForm.price}
              onChangeText={(text) => setServiceForm({ ...serviceForm, price: text })}
            />

            {/* Duration picker */}
            <Text style={{ color: colors.text, marginBottom: 6 }}>Duration (minutes)</Text>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
              {[30, 60, 90].map((min) => (
                <TouchableOpacity
                  key={min}
                  onPress={() => setServiceForm({ ...serviceForm, duration: min })}
                  style={{
                    padding: 8,
                    borderRadius: 8,
                    backgroundColor: serviceForm.duration === min ? colors.primary : "#ddd",
                  }}
                >
                  <Text style={{ color: serviceForm.duration === min ? "#fff" : "#000" }}>{min} min</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setServiceModalVisible(false)} style={[styles.modalButton, { backgroundColor: "#ef4444" }]}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveService} style={[styles.modalButton, { backgroundColor: colors.primary }]}>
                <Text style={styles.modalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default ServicesAndSlotsSection;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  addButton: { backgroundColor: "#0ea5e9", padding: 8, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  card: { borderRadius: 16, marginBottom: 10, padding: 12, elevation: 3 },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  serviceTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  serviceDescription: { fontSize: 14, lineHeight: 20 },
  servicePrice: { fontSize: 15, fontWeight: "600", marginTop: 4 },
  cardActions: { flexDirection: "row", marginLeft: 8 },
  iconButton: { padding: 6 },
  emptyText: { textAlign: "center", fontSize: 14, marginVertical: 10 },
  slotItem: { padding: 14, borderRadius: 12, marginBottom: 8 },
  slotText: { color: "#fff", fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
  modalContent: { width: "100%", borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  input: { borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 10 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", marginTop: 10 },
  modalButton: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, marginLeft: 10 },
  modalButtonText: { color: "#fff", fontWeight: "600" },
});
