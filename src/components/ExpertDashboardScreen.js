import React, { useEffect, useState } from "react";
import { ScrollView, ActivityIndicator } from "react-native";
import { useSelector } from "react-redux";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";

import ProfileSection from "./ProfileSection";
import ServicesAndSlotsSection from "./ServicesAndSlotsSection";
import BookingsSection from "./BookingsSection";

const ExpertDashboardScreen = () => {
  const { user: userData } = useSelector((s) => s.user || {});
  const expert = userData || auth().currentUser || {};
  const uid = expert?.uid;

  const [services, setServices] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!uid) return;
    setLoading(true);

    const servicesUnsub = firestore().collection("services").doc(uid).collection("items").onSnapshot((snap) => setServices(snap.docs.map(d => ({ id: d.id, ...d.data() }))), (err) => console.warn(err));
    const availabilityUnsub = firestore().collection("availability").doc(uid).collection("slots").onSnapshot((snap) => setAvailability(snap.docs.map(d => ({ id: d.id, ...d.data() }))), (err) => console.warn(err));
    const bookingsUnsub = firestore().collection("bookings").where("expertUid", "==", uid).onSnapshot((snap) => setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    setLoading(false);

    return () => {
      servicesUnsub();
      availabilityUnsub();
      bookingsUnsub();
    };
  }, [uid]);

  if (loading) return <ActivityIndicator style={{ marginTop: 50 }} />;

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <ProfileSection expert={expert} />
      <ServicesAndSlotsSection uid={uid} />
    
    </ScrollView>
  );
};

export default ExpertDashboardScreen;
