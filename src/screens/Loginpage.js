import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { Button, TextInput } from "react-native-paper";
import { useTheme } from "../context/ThemeContext";
import auth from "@react-native-firebase/auth";
import { SafeAreaView } from "react-native-safe-area-context";

const LoginPage = ({ navigation }) => {
  const { colors } = useTheme();
  const [countryCode, setCountryCode] = useState("+91");
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!mobile) return;
    const phoneNumber = `${countryCode}${mobile}`;
    try {
      setLoading(true);
      const confirmation = await auth().signInWithPhoneNumber(phoneNumber);
      setLoading(false);
      navigation.navigate("OTPVerificationPage", {
        mobile,
        countryCode,
        confirmation,
      });
    } catch (err) {
      setLoading(false);
      console.error("Error sending OTP:", err);
    }
  };

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
             Welcome to Ahead AI.
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Enter your country code and mobile number to continue
            </Text>
          </View>

          {/* Input row: country code + mobile number */}
          <View style={styles.inputContainer}>
            <TextInput
              mode="flat"
              value={countryCode}
              onChangeText={setCountryCode}
              placeholder="+XX"
              keyboardType="phone-pad"
              maxLength={5}
              placeholderTextColor={colors.textSecondary}
              textColor={colors.text}
              style={[
                styles.codeInput,
                { backgroundColor: colors.surface },
              ]}
              underlineStyle={{ borderBottomWidth: 0 }} // remove underline
              theme={{ colors: { primary: "transparent" } }} // prevent active border
            />

            <TextInput
              mode="flat"
              value={mobile}
              onChangeText={setMobile}
              placeholder="Mobile Number"
              keyboardType="phone-pad"
              placeholderTextColor={colors.textSecondary}
              textColor={colors.text}
              style={[
                styles.mobileInput,
                { backgroundColor: colors.surface },
              ]}
              underlineStyle={{ borderBottomWidth: 0 }}
              theme={{ colors: { primary: "transparent" } }}
            />
          </View>

          <Button
            mode="contained"
            loading={loading}
            onPress={handleSendOtp}
            style={[styles.button, { backgroundColor: colors.primary }]}
            contentStyle={{ paddingVertical: 6 }}
            labelStyle={{
              fontSize: 16,
              fontWeight: "600",
              color: colors.onPrimary || colors.background,
            }}
          >
            Next
          </Button>

          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            By continuing, you agree to our{" "}
            <Text style={{ fontWeight: "600", color: colors.primary }}>
              Terms of Service
            </Text>{" "}
            and{" "}
            <Text style={{ fontWeight: "600", color: colors.primary }}>
              Privacy Policy
            </Text>
            .
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, justifyContent: "center", padding: 24 },
  header: { marginBottom: 32 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 6 },
  subtitle: { fontSize: 16, opacity: 0.8 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 36,
    gap: 12,
  },
  codeInput: {
    width: 70,
    borderRadius: 12,
  },
  mobileInput: {
    flex: 1,
    borderRadius: 12,
  },
  button: { borderRadius: 12, elevation: 2, marginBottom: 24 },
  footerText: { fontSize: 13, textAlign: "center", lineHeight: 18 },
});

export default LoginPage;
