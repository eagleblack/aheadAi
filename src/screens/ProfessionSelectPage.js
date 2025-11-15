import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { PaperProvider } from "react-native-paper";
import { useTheme } from "../context/ThemeContext";
import { SafeAreaView } from "react-native-safe-area-context";
import firestore from "@react-native-firebase/firestore";
import Dropdown from "../components/Dropdown";

const ProfessionSelectPage = ({ navigation }) => {
  const { colors } = useTheme();

  const [role, setRole] = useState(null);
  const [prep, setPrep] = useState(null);
  const [jobOptions, setJobOptions] = useState([]);
  const [studentOptions, setStudentOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔥 Fetch selection options from Firestore
  useEffect(() => {
    let unsubscribe;

    try {
      unsubscribe = firestore()
        .collection("selection_options")
        .doc("default")
        .onSnapshot(
          (doc) => {
            if (doc.exists) {
              const data = doc.data();
              setJobOptions(data?.jobOptions || []);
              setStudentOptions(data?.studentOptions || []);
            } else {
              console.warn("⚠️ No selection_options/default document found.");
            }
            setLoading(false);
          },
          (error) => {
            console.error("❌ Error fetching selection options:", error);
            setLoading(false);
          }
        );
    } catch (err) {
      console.error("🔥 Firestore listener setup failed:", err);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top", "bottom"]}>
      <PaperProvider>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.content}>
            {/* Illustration */}
            <Image
              source={require("../assets/illu.png")}
              style={styles.image}
              resizeMode="contain"
            />

            {/* Title */}
            <Text style={[styles.title, { color: colors.text }]}>
              Let’s get started
            </Text>
            <Text style={[styles.subtitle, { color: colors.text }]}>
              What are you looking for?
            </Text>

            {/* Dropdowns */}
            <View style={styles.dropdownWrapper}>
              <Dropdown
                label="I am a"
                value={role}
                options={
                  loading
                    ? ["Loading..."]
                    : jobOptions.length > 0
                    ? jobOptions
                    : ["No options available"]
                }
                onSelect={setRole}
                colors={colors}
                navigation={navigation}
                targetScreen="UserDetailsPage"
              />

              {/* Premium OR */}
              <View style={[styles.orContainer, { borderColor: colors.text,marginTop:50}]}>
                <Text style={[styles.orText, { color: colors.text }]}>OR</Text>
              </View>

              <Dropdown
                label="I Studied"
                value={prep}
                options={
                  loading
                    ? ["Loading..."]
                    : studentOptions.length > 0
                    ? studentOptions
                    : ["No options available"]
                }
                onSelect={setPrep}
                colors={colors}
                navigation={navigation}
                targetScreen="UserDetailsPage"
              />
            </View>
          </View>

          {/* Join as Company */}
          <TouchableOpacity
            onPress={() => navigation.navigate("CompanyVerificationPage")}
            style={styles.companyLink}
          >
            <Text style={[styles.companyText, { color: colors.link }]}>
              Join as a Company/Institution
            </Text>
          </TouchableOpacity>
        </View>
      </PaperProvider>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
    justifyContent: "space-between",
  },
  content: {
    alignItems: "center",
  },
  image: {
    width: 220,
    height: 180,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 17,
    textAlign: "center",
    marginBottom: 28,
    fontWeight: "600",
    opacity: 0.9,
  },
  dropdownWrapper: {
    width: "100%",
  },
  orContainer: {
    marginTop:20,
    
    alignItems: "center",
  },
  orText: {

    fontSize: 26,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  companyLink: {
    paddingVertical: 20,
    alignItems: "center",
  },
  companyText: {
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ProfessionSelectPage;
