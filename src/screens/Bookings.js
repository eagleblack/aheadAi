import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import Icon from "@react-native-vector-icons/material-icons";
import { useTheme } from "../context/ThemeContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import firestore from "@react-native-firebase/firestore";
import { useSelector } from "react-redux";

const BookingScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { user: userData } = useSelector((state) => state.user);

  const [activeTab, setActiveTab] = useState("Bookings");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const flatListRef = useRef();
  const isExpert = userData?.expertVerification === "approved";

  useEffect(() => {
    fetchBookings();
  }, [activeTab]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      let query = firestore().collection("bookings");

      if (isExpert && activeTab === "YourBookings") {
        query = query.where("expertId", "==", userData.uid);
      } else {
        query = query.where("userId", "==", userData.uid);
      }

      const snapshot = await query.get();

      const bookingsData = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const booking = { id: doc.id, ...doc.data() };

          // Fetch service details
          if (booking.serviceId) {
            const serviceDoc = await firestore()
              .collection("services")
              .doc(booking.serviceId)
              .get();
            if (serviceDoc.exists) {
              booking.service = serviceDoc.data();
            }
          }

          return booking;
        })
      );

      setBookings(bookingsData);
    } catch (error) {
      console.log("Error fetching bookings: ", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookingAction = async (item, action) => {
    if (!isExpert) return;

    setProcessingId(item.id);
    try {
      const bookingRef = firestore().collection("bookings").doc(item.id);

      if (action === "accept") {
        await bookingRef.update({ status: "accepted" });
      } else if (action === "reject") {
        await bookingRef.update({ status: "rejected" });

        // reopen availability
        if (item.expertId && item.start && item.end) {
          const availRef = firestore()
            .collection("availabilities")
            .where("expertId", "==", item.expertId)
            .where("date", "==", item.date); // assuming you store booking.date

          const availSnap = await availRef.get();
          for (const doc of availSnap.docs) {
            const data = doc.data();
            if (Array.isArray(data.bookedTimes)) {
              const updated = data.bookedTimes.filter(
                (t) =>
                  !(t.start.toDate().getTime() === item.start.toDate().getTime() &&
                    t.end.toDate().getTime() === item.end.toDate().getTime())
              );
              await firestore().collection("availabilities").doc(doc.id).update({
                bookedTimes: updated,
              });
            }
          }
        }
      }

      Alert.alert("Success", `Booking ${action}ed successfully`);
      fetchBookings();
    } catch (error) {
      console.log("Error updating booking:", error);
      Alert.alert("Error", "Could not update booking.");
    } finally {
      setProcessingId(null);
    }
  };

  const renderBooking = ({ item }) => {
    const startTime = item.start?.toDate?.().toLocaleString() || "Invalid date";
    const endTime = item.end?.toDate?.().toLocaleString() || "Invalid date";
    const service = item.service || {};

    return (
      <View style={[styles.bookingCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.bookingTitle, { color: colors.text }]}>
          {service.title || "No title"}
        </Text>
        <Text style={[styles.bookingDesc, { color: colors.textSecondary }]}>
          {service.description || "No description available"}
        </Text>
        <Text style={[styles.bookingTime, { color: colors.textSecondary }]}>
          {startTime} - {endTime}
        </Text>
        <Text style={[styles.bookingStatus, { color: colors.primary }]}>
          Status: {item.status || "unknown"}
        </Text>
        <Text style={[styles.bookingPrice, { color: colors.text }]}>
          ₹{service.price ?? 0} | Duration: {service.duration ?? 0} mins
        </Text>

        {/* Expert action buttons */}
        {isExpert && activeTab === "YourBookings" && item.status === "pending" && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.success || "#4CAF50" }]}
              disabled={processingId === item.id}
              onPress={() => handleBookingAction(item, "accept")}
            >
              <Text style={{ color: "#fff" }}>
                {processingId === item.id ? "..." : "Accept"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.error || "#F44336" }]}
              disabled={processingId === item.id}
              onPress={() => handleBookingAction(item, "reject")}
            >
              <Text style={{ color: "#fff" }}>
                {processingId === item.id ? "..." : "Reject"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.headerBar, { borderBottomColor: colors.surface }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ flexDirection: "row", alignItems: "center" }}
        >
          <Icon name="arrow-back" size={24} color={colors.text} />
          <Text
            style={[styles.headerTitle, { color: colors.text, marginLeft: 10 }]}
          >
            Bookings
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      {isExpert && (
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === "Bookings" && {
                borderBottomColor: colors.primary,
                borderBottomWidth: 2,
              },
            ]}
            onPress={() => setActiveTab("Bookings")}
          >
            <Text style={{ color: colors.text }}>Bookings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === "YourBookings" && {
                borderBottomColor: colors.primary,
                borderBottomWidth: 2,
              },
            ]}
            onPress={() => setActiveTab("YourBookings")}
          >
            <Text style={{ color: colors.text }}>Your Bookings</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Booking List */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : bookings.length === 0 ? (
          <View style={styles.centered}>
            <Text style={{ color: colors.textSecondary }}>No bookings found</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            contentContainerStyle={{ padding: 16 }}
            data={bookings}
            keyExtractor={(item) => item.id}
            renderItem={renderBooking}
            onEndReachedThreshold={0.2}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default BookingScreen;

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 8,
  },
  tabBtn: { paddingVertical: 10 },
  bookingCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  bookingTitle: { fontWeight: "700", fontSize: 16, marginBottom: 4 },
  bookingDesc: { fontSize: 14, marginBottom: 4 },
  bookingTime: { fontSize: 12, marginBottom: 4 },
  bookingStatus: { fontSize: 14, marginBottom: 4 },
  bookingPrice: { fontSize: 14, fontWeight: "600" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  actionBtn: {
    flex: 1,
    padding: 10,
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: "center",
  },
});
