import React, { useState, useEffect, useRef } from "react";
import {
  Text,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  View,
  BackHandler,
  TouchableOpacity,
} from "react-native";
import { Button, Snackbar, TextInput as PaperInput } from "react-native-paper";
import { useTheme } from "../context/ThemeContext";
import firestore, { serverTimestamp } from "@react-native-firebase/firestore";
import auth from "@react-native-firebase/auth";
import { SafeAreaView } from "react-native-safe-area-context";

const OTPVerificationPage = ({ route, navigation }) => {
  const { colors } = useTheme();
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  const timerRef = useRef(null);
  const inputRefs = useRef([]);
  const { mobile, countryCode, confirmation } = route.params;

  // Disable back navigation
  useEffect(() => {
    const backAction = () => true;
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, []);

  // Timer for resend
  useEffect(() => {
    setCanResend(false);
    setTimer(30);
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [confirmation]);

  const handleOtpChange = (value, index) => {
    if (isNaN(value)) return;
    const newOtp = [...otpDigits];
    newOtp[index] = value;
    setOtpDigits(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const otp = otpDigits.join("");
    if (otp.length < 6) {
      setErrorMessage("Please enter the 6-digit OTP");
      return;
    }

    try {
      setLoading(true);
      const userCredential = await confirmation.confirm(otp);
      const { uid, phoneNumber } = userCredential.user;
        const userDoc = await firestore().collection("users").doc(uid).get();

      if (!userDoc.exists()) {
          await firestore().collection("users").doc(uid).set({
          uid,
          phoneNumber,
          createdAt: serverTimestamp(),
        });

        // Add Welcome Notification
        firestore().collection("notifications").add({
          notificationFrom: "ADMIN",
          notificationTo: uid,
          notificationType: "WELCOME",
          notificationText: "Welcome to Ahead!",
          comment: "User registered successfully.",
          createdOn: serverTimestamp(),
          status:'UNREAD'
        });
      }
      setLoading(false);
      // navigation.replace("ProfessionSelectPage");
    } catch (err) {
      console.error("OTP verification error:", err);
      setLoading(false);
      setErrorMessage("Invalid or expired OTP. Please try again.");
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    try {
      setLoading(true);
      const phoneProvider = new auth.PhoneAuthProvider();
      const newConfirmation = await phoneProvider.verifyPhoneNumber(`${countryCode}${mobile}`, true);
      route.params.confirmation = newConfirmation;
      setLoading(false);
      setErrorMessage("OTP resent successfully!");
    } catch (err) {
      console.error("Resend OTP error:", err);
      setLoading(false);
      setErrorMessage("Failed to resend OTP. Please try again.");
    }
  };

  const handleBackToLogin = () => {
    navigation.replace("Loginpage");
  };

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <View style={styles.container}>
          <Text style={[styles.title, { color: colors.text }]}>Verify OTP</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Enter the 6-digit code sent to {countryCode} {mobile}
          </Text>

          {/* OTP Boxes */}
          <View style={styles.otpContainer}>
            {otpDigits.map((digit, index) => (
             <PaperInput
  key={index}
  mode="outlined"
  value={digit}
  onChangeText={(value) => handleOtpChange(value.slice(-1), index)}
  keyboardType="number-pad"
  maxLength={1}
  ref={(el) => (inputRefs.current[index] = el)}
  style={[styles.otpBox, { borderColor: colors.primary }]}
  theme={{
    colors: { text: colors.text, primary: colors.primary },
  }}
  onKeyPress={({ nativeEvent }) => {
    if (nativeEvent.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }}
/>

            ))}
          </View>

          <Button
            mode="contained"
            loading={loading}
            onPress={handleVerifyOtp}
            style={[styles.button, { backgroundColor: colors.primary }]}
            contentStyle={{ paddingVertical: 10 }}
            labelStyle={{ fontSize: 16, fontWeight: "600", color: colors.onPrimary }}
          >
            Verify & Continue
          </Button>

          <Button
            mode="text"
            disabled={true}
            onPress={handleResendOtp}
            style={{ marginTop: 16 }}
            labelStyle={{
              color: canResend ? colors.primary : colors.textSecondary,
              fontWeight: "600",
            }}
          >
            {canResend ? "Resend Code" : `Resend Code in ${timer}s`}
          </Button>

          {/* Back to Login */}
          <TouchableOpacity onPress={handleBackToLogin} style={{ marginTop: 30 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 15 }}>
              ← Back to Login
            </Text>
          </TouchableOpacity>
        </View>

        <Snackbar
          visible={!!errorMessage}
          onDismiss={() => setErrorMessage("")}
          duration={3000}
          style={{ backgroundColor: colors.error }}
        >
          {errorMessage}
        </Snackbar>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
    textAlign: "center",
    lineHeight: 22,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "90%",
    marginBottom: 32,
  },
  otpBox: {
    width: 45,
    height: 55,

    fontSize: 20,
    borderRadius: 10,
    justifyContent: "center",
   
  },
  button: {
    borderRadius: 12,
    elevation: 2,
    width: "100%",
  },
});

export default OTPVerificationPage;
