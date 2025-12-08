import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Platform,
  Alert,
  PermissionsAndroid,
} from "react-native";
import { useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import auth from "@react-native-firebase/auth";
import messaging from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';
import { logoutUser } from "../store/store";

const NOTIFICATION_ATTEMPTS_KEY = "notification_attempts";

// Dummy function — replace with your actual Firestore save function.
const saveFcmToken = async (uid) => {
  try {
    if (!uid) {
      console.log('saveFcmToken: no uid provided');
      return;
    }

    // Get the token from firebase messaging
    const token = await messaging().getToken();
    console.log('FCM token obtained:', token);

    if (!token) {
      console.warn('No token returned from messaging().getToken()');
      return;
    }

    // Write token to Firestore under user's doc (merge to avoid overwriting)
    await firestore().collection('users').doc(uid).set(
      {
        fcmToken: token,
        fcmTokenUpdatedAt: firestore.FieldValue ? firestore.FieldValue.serverTimestamp() : new Date()
      },
      { merge: true }
    );

    console.log('FCM token saved to Firestore for uid:', uid);
  } catch (err) {
    console.error('saveFcmToken error:', err);
  }
}
export default function PendingVerificationScreen({navigation}) {
  const { user: userData } = useSelector((state) => state.user);

  useEffect(() => {
    const checkNotificationPermission = async () => {
      if (Platform.OS !== "android") return;

      const user = auth().currentUser;
      if (!user) return;

      try {
        let granted = true;

        // Android 13+ requires POST_NOTIFICATIONS permission
        if (Platform.Version >= 33) {
          const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          granted = result === PermissionsAndroid.RESULTS.GRANTED;
        }

        if (granted) {
          await saveFcmToken(user.uid);
        } else {
          let attempts = parseInt(
            await AsyncStorage.getItem(NOTIFICATION_ATTEMPTS_KEY),
            10
          );
          if (isNaN(attempts)) attempts = 0;

          // Show prompt every 10 attempts
          if (attempts === 0 || attempts % 10 === 0) {
            showNotificationPrompt(user.uid);
          }

          await AsyncStorage.setItem(
            NOTIFICATION_ATTEMPTS_KEY,
            (attempts + 1).toString()
          );
        }
      } catch (err) {
        console.log("Error handling notification attempts:", err);
      }
    };

    const showNotificationPrompt = (userId) => {
      Alert.alert(
        "Enable Notifications",
        "Turn on notifications to get instant updates when new cars are approved.",
        [
          { text: "Not now", style: "cancel" },
          {
            text: "Enable",
            onPress: async () => {
              try {
                const result = await PermissionsAndroid.request(
                  PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
                );
                if (result === PermissionsAndroid.RESULTS.GRANTED) {
                  await saveFcmToken(userId);
                }
              } catch (e) {
                console.log("Permission denied:", e);
              }
            },
          },
        ]
      );
    };

    checkNotificationPermission();
  }, []);

  return (
    <View style={styles.container}>
      <Image
        source={require("../assets/logomain.jpg")}
        style={styles.image}
        resizeMode="contain"
      />

      <View style={styles.card}>
  {userData?.remark ? (
    <>
      <Text style={styles.title}>Verification Rejected</Text>

      <Text style={styles.subtitle}>
        Your profile verification was rejected due to the following reason:
      </Text>

      <Text style={styles.logoutText}>
        ❌ {userData.remark}
      </Text>

      <Text style={[styles.subtitle, { marginTop: 10 }]}>
        Please edit and resubmit your details.
      </Text>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={() => navigation.navigate("UserDetailsPage")}
        activeOpacity={0.7}
      >
        <Text style={styles.logoutText}>Edit & Resubmit</Text>
      </TouchableOpacity>
    </>
  ) : (
    <>
      <Text style={styles.title}>Verification Pending</Text>

      <Text style={styles.subtitle}>
        Your profile verification is in progress. 
        We’ll notify you once it's completed.
      </Text>
    </>
  )}

  <TouchableOpacity
    style={[styles.logoutButton, { marginTop: 25 }]}
    onPress={async () => await logoutUser()}
    activeOpacity={0.7}
  >
    <Text style={styles.logoutText}>Logout</Text>
  </TouchableOpacity>
</View>

    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#00001a",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  image: {
    width: 180,
    height: 140,
    marginBottom: 40,
    marginTop: -50,
  },

  card: {
    width: "100%",
    paddingVertical: 30,
    paddingHorizontal: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
  },

  title: {
    color: "white",
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 10,
  },

  subtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 25,
  },

  logoutButton: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 30,
  },

  logoutText: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
  }, 
});
