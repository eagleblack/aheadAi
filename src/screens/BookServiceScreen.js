import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Card } from "react-native-paper";
import firestore from "@react-native-firebase/firestore";
import { Calendar } from "react-native-calendars";
import { useTheme } from "../context/ThemeContext";

const SERVICES_COL = "services";
const AVAILABILITY_COL = "availability";
const BOOKINGS_COL = "bookings";
const BASE_CHUNK_MINUTES = 30;

const BookServiceScreen = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { expertId, userId } = route.params;

  const [services, setServices] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [bookedDocs, setBookedDocs] = useState([]);

  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // -------------------- realtime listeners --------------------
  useEffect(() => {
    const unsubServices = firestore()
      .collection(SERVICES_COL)
      .where("uid", "==", expertId)
      .onSnapshot((snap) => setServices(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));

    const unsubAvailability = firestore()
      .collection(AVAILABILITY_COL)
      .where("uid", "==", expertId)
      .onSnapshot((snap) => setAvailability(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));

    const unsubBookings = firestore()
      .collection(BOOKINGS_COL)
      .where("expertId", "==", expertId)
      .onSnapshot((snap) => setBookedDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));

    return () => {
      unsubServices();
      unsubAvailability();
      unsubBookings();
    };
  }, [expertId]);

  // -------------------- helpers --------------------
  const toISODateKey = (d) => {
    const dt = d instanceof Date ? d : d.toDate ? d.toDate() : new Date(d);
    return dt.toISOString().split("T")[0];
  };

  const normalizeTime = (d) => {
    const dt = d instanceof Date ? new Date(d) : d.toDate ? d.toDate() : new Date(d);
    dt.setSeconds(0, 0);
    return dt.getTime();
  };

  const splitIntoBaseChunks = (start, end) => {
    const chunks = [];
    let current = new Date(start);
    const endTime = new Date(end);
    while (current < endTime) {
      const next = new Date(current.getTime() + BASE_CHUNK_MINUTES * 60000);
      if (next <= endTime) {
        chunks.push({ start: new Date(current), end: new Date(next) });
      }
      current = next;
    }
    return chunks;
  };

  // -------------------- booked chunks for selected date --------------------
  const bookedChunksForDate = useMemo(() => {
    if (!selectedDate) return new Set();
    const set = new Set();

    // From availability bookedTimes
    availability.forEach((slotDoc) => {
      const slotDate = slotDoc.date && slotDoc.date.toDate ? slotDoc.date.toDate() : new Date(slotDoc.date);
      if (toISODateKey(slotDate) !== selectedDate) return;
      (slotDoc.bookedTimes || []).forEach((bt) => set.add(normalizeTime(bt.start)));
    });

    // From bookings
    bookedDocs.forEach((b) => {
      const bDate = b.date && b.date.toDate ? b.date.toDate() : new Date(b.date);
      if (toISODateKey(bDate) !== selectedDate) return;
      set.add(normalizeTime(b.start));
    });

    return set;
  }, [availability, bookedDocs, selectedDate]);

  // -------------------- marked dates for calendar --------------------
  const markedDates = useMemo(() => {
    const acc = {};
    availability.forEach((slotDoc) => {
      const d = slotDoc.date && slotDoc.date.toDate ? slotDoc.date.toDate() : new Date(slotDoc.date);
      acc[toISODateKey(d)] = { marked: true, dotColor: "#34d399" };
    });
    return acc;
  }, [availability]);

  // -------------------- available slots --------------------
  const availableSlotsForDate = useMemo(() => {
    if (!selectedDate || !selectedService) return [];
    const neededChunks = Math.ceil(selectedService.duration / BASE_CHUNK_MINUTES);
    const allBaseChunks = [];

    availability.forEach((slotDoc) => {
      const slotDate = slotDoc.date && slotDoc.date.toDate ? slotDoc.date.toDate() : new Date(slotDoc.date);
      if (toISODateKey(slotDate) !== selectedDate) return;
      const start = slotDoc.start && slotDoc.start.toDate ? slotDoc.start.toDate() : new Date(slotDoc.start);
      const end = slotDoc.end && slotDoc.end.toDate ? slotDoc.end.toDate() : new Date(slotDoc.end);
      splitIntoBaseChunks(start, end).forEach((c) => {
        allBaseChunks.push({ parentAvailabilityId: slotDoc.id, start: c.start, end: c.end });
      });
    });

    allBaseChunks.sort((a, b) => a.start.getTime() - b.start.getTime());

    const results = [];
    for (let i = 0; i <= allBaseChunks.length - neededChunks; i++) {
      const window = allBaseChunks.slice(i, i + neededChunks);
      let ok = true;

      for (let j = 0; j < window.length; j++) {
        if (j > 0 && window[j - 1].end.getTime() !== window[j].start.getTime()) {
          ok = false;
          break;
        }
        if (bookedChunksForDate.has(normalizeTime(window[j].start))) {
          ok = false;
          break;
        }
      }

      if (ok) {
        results.push({
          id: `${window[0].parentAvailabilityId}_${normalizeTime(window[0].start)}`,
          slotId: window[0].parentAvailabilityId,
          date: selectedDate,
          start: new Date(window[0].start),
          end: new Date(window[window.length - 1].end),
          chunks: window.map((w) => ({ start: w.start, end: w.end })),
        });
      }
    }

    return results;
  }, [availability, selectedService, selectedDate, bookedChunksForDate]);

  // -------------------- modal handlers --------------------
  const openBookingModal = (service) => {
    setSelectedService(service);
    setSelectedDate(null);
    setSelectedSlot(null);
    setBookingModalVisible(true);
  };

  const confirmBooking = async () => {
    if (!selectedService || !selectedDate || !selectedSlot) {
      return Alert.alert("Incomplete", "Please select a date and time slot.");
    }

    try {
      const parentRef = firestore().collection(AVAILABILITY_COL).doc(selectedSlot.slotId);

      await firestore().runTransaction(async (tx) => {
        const parentSnap = await tx.get(parentRef);
        if (!parentSnap.exists) throw new Error("Parent availability not found.");

        const parentData = parentSnap.data();
        const existingBookedTimes = parentData.bookedTimes || [];

        const anyOverlap = selectedSlot.chunks.some((chunk) =>
          existingBookedTimes.some((bt) => normalizeTime(bt.start) === normalizeTime(chunk.start))
        );

        const overlappingBooking = bookedDocs.some((b) => {
          const bDate = b.date && b.date.toDate ? b.date.toDate() : new Date(b.date);
          return toISODateKey(bDate) === selectedDate &&
            selectedSlot.chunks.some((chunk) => normalizeTime(chunk.start) === normalizeTime(b.start));
        });

        if (anyOverlap || overlappingBooking) {
          throw new Error("One or more of the selected time chunks were just booked.");
        }

        // Create booking doc
        const bookingRef = firestore().collection(BOOKINGS_COL).doc();
        tx.set(bookingRef, {
          userId,
          expertId,
          serviceId: selectedService.id,
          slotId: selectedSlot.slotId,
          date: new Date(selectedDate),
          start: selectedSlot.start,
          end: selectedSlot.end,
          status: "pending",
          createdAt: firestore.FieldValue.serverTimestamp(),
        });

        // Update parent availability
        selectedSlot.chunks.forEach((chunk) => {
          tx.update(parentRef, {
            bookedTimes: firestore.FieldValue.arrayUnion({
              start: chunk.start,
              end: chunk.end,
              userId,
              serviceId: selectedService.id,
            }),
          });
        });
        
        // Optional fullyBooked flag
        const parentStart = parentData.start && parentData.start.toDate ? parentData.start.toDate() : new Date(parentData.start);
        const parentEnd = parentData.end && parentData.end.toDate ? parentData.end.toDate() : new Date(parentData.end);
        const totalPossibleChunks = Math.floor((parentEnd.getTime() - parentStart.getTime()) / (BASE_CHUNK_MINUTES * 60000));
        const newBookedCount = (parentData.bookedTimes ? parentData.bookedTimes.length : 0) + selectedSlot.chunks.length;
        if (newBookedCount >= totalPossibleChunks) {
          tx.update(parentRef, { fullyBooked: true });
        }
      });
   firestore()
      .collection("notifications")
      .add({
        notificationFrom: userId,
        notificationTo: expertId,
        notificationType: "NEW_SERVICE_REQUEST",
        serviceId:selectedService.id,
        notificationText:
          "A new service booking was requested!",
        createdOn: firestore.FieldValue.serverTimestamp(),
        status:'UNREAD'

      })
      .catch((err) => console.error("Notification add failed:", err));
      Alert.alert("Success", "Your booking is confirmed!");
      setBookingModalVisible(false);
      setSelectedSlot(null); // reset selection
    } catch (err) {
      Alert.alert("Error", err.message || String(err));
    }
  };

  // -------------------- UI --------------------
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 80 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Services Offered</Text>
      </View>

      <FlatList
        data={services}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card style={[styles.card, { backgroundColor: colors.surface }]} mode="elevated">
            <View style={styles.cardContent}>
              <Text style={[styles.serviceTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.serviceDescription, { color: colors.textSecondary }]} >
                {item.description}
              </Text>
              <Text style={[styles.servicePrice, { color: colors.primary }]}>₹{item.price} • {item.duration} min</Text>

              <View style={styles.bookButtonContainer}>
                <TouchableOpacity onPress={() => openBookingModal(item)} style={[styles.bookButton, { backgroundColor: "#34d399" }]}>
                  <Text style={{ color: "#fff", fontWeight: "700" }}>Book</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        )}
        ListEmptyComponent={<Text style={[styles.emptyText, { color: colors.textSecondary }]}>No services available.</Text>}
      />

      {/* Booking Modal */}
      <Modal
  visible={bookingModalVisible}
  transparent
  animationType="slide"
  onRequestClose={() => setBookingModalVisible(false)}
>
  <View style={styles.modalOverlay}>
    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <Text style={[styles.modalTitle, { color: colors.text }]}>Book: {selectedService?.title}</Text>

        <Text style={{ color: colors.text, fontWeight: "600", marginBottom: 8 }}>Select Date</Text>
        <Calendar
          markedDates={{
            ...markedDates,
            ...(selectedDate ? { [selectedDate]: { selected: true, selectedColor: colors.primary } } : {}),
          }}
          onDayPress={(day) => setSelectedDate(day.dateString)}
          theme={{ selectedDayBackgroundColor: colors.primary, todayTextColor: colors.primary, arrowColor: colors.primary }}
          style={{ borderRadius: 16, marginBottom: 16 }}
        />

        {selectedDate && (
          <>
            <Text style={{ color: colors.text, fontWeight: "600", marginBottom: 8 }}>Available Slots</Text>
            {availableSlotsForDate.length > 0 ? (
              <View style={{ flexWrap: "wrap", flexDirection: "row" }}>
                {availableSlotsForDate.map((slot) => {
                  const start = slot.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                  const end = slot.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                  const isSelected = selectedSlot?.id === slot.id;
                  const isBooked = slot.chunks.some((chunk) => bookedChunksForDate.has(normalizeTime(chunk.start)));
                  return (
                    <TouchableOpacity
                      key={slot.id}
                      disabled={isBooked}
                      onPress={() => setSelectedSlot(slot)}
                      style={{
                        backgroundColor: isSelected ? colors.primary : isBooked ? "#ef4444" : "#34d399",
                        padding: 10,
                        borderRadius: 8,
                        margin: 4,
                        opacity: isBooked ? 0.6 : 1,
                      }}
                    >
                      <Text style={{ color: "#fff" }}>{start} - {end}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <Text style={{ color: colors.textSecondary, fontStyle: "italic" }}>No slots available for this date.</Text>
            )}
          </>
        )}

        <View style={styles.modalActions}>
          <TouchableOpacity onPress={() => setBookingModalVisible(false)} style={[styles.modalButton, { backgroundColor: "#ef4444" }]}>
            <Text style={styles.modalButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={confirmBooking} style={[styles.modalButton, { backgroundColor: colors.primary }]}>
            <Text style={styles.modalButtonText}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  </View>
</Modal>

    </ScrollView>
  );
};

export default BookServiceScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  card: { borderRadius: 16, marginBottom: 10,paddingVertical:20, elevation: 3 },
  cardContent: { position: "relative", padding: 12 },
  serviceTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  serviceDescription: { fontSize: 14, lineHeight: 20 },
  servicePrice: { fontSize: 15, fontWeight: "600", marginTop: 4 },
  bookButtonContainer: { position: "absolute", bottom:-10, right: 12 },
  bookButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, alignItems: "center", 
    justifyContent: "center" },
  emptyText: { textAlign: "center", fontSize: 14, marginVertical: 10 },
  
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
 modalContent: {
  width: "100%",
  borderRadius: 20,
  padding: 20,
  maxHeight: "90%", // ensures ScrollView can scroll
},
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", marginTop: 20 },
  modalButton: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, marginLeft: 10 },
  modalButtonText: { color: "#fff", fontWeight: "600" },
});
