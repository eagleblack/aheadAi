import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing, ImageBackground } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import LinearGradient from "react-native-linear-gradient"; // 👈 Make sure this is installed
import { themes } from "../themes/themes";
import { useJobTheme } from "../context/JobThemeContext";

const JobCard = ({ job }) => {
  const { currentTheme } = useJobTheme();
  const theme = themes[currentTheme];
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentTheme]);

  if (!job) return null;

  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
      {/* Gradient Background */}
      <LinearGradient
        colors={["#FFF5E1", "#FFF9F5", "#FDFBFB"]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Logo Box */}
      <View style={[styles.logoBox]}>
        <LinearGradient
          colors={["#6A11CB", "#2575FC"]}
          style={[StyleSheet.absoluteFillObject, { borderRadius: 16 }]}
        />
        <Text style={styles.logoText}>
          {job.company?.charAt(0)?.toUpperCase() || "C"}
        </Text>
      </View>

      {/* Job Title & Company */}
      <Text style={[styles.title, { color: "#1A1A1A" }]}>{job.title}</Text>
      <Text style={styles.subtitle}>{job.company}</Text>

      {/* Location & Salary */}
      <View style={styles.row}>
        <Icon name="location-on" size={20} color="#FF6F61" />
        <Text style={styles.info}>{job.location}</Text>
        <Icon
          name="payments"
          size={20}
          color="#FFB400"
          style={{ marginLeft: 16 }}
        />
        <Text style={styles.info}>{job.salary}</Text>
      </View>

      {/* Job Type & Remote */}
      <View style={styles.row}>
        <Icon name="work" size={20} color="#4CAF50" />
        <Text style={styles.info}>{job?.type || job?.shift || "N/A"}</Text>
        <Icon
          name="home"
          size={20}
          color="#007BFF"
          style={{ marginLeft: 16 }}
        />
        <Text style={styles.info}>{job?.remote ? "Remote" : "On-site"}</Text>
      </View>

      {/* Skills */}
      <Text style={[styles.keySkillsLabel, { color: "#6A11CB" }]}>Key Skills:</Text>
         <View style={styles.skillsContainer}>
  {(() => {
    // Normalize skills into an array
    let skillsArray = [];

    if (Array.isArray(job?.skills)) {
      skillsArray = job.skills;
    } else if (typeof job?.skills === "string" && job.skills.trim().length > 0) {
      // Split by commas and trim spaces
      skillsArray = job.skills.split(",").map((s) => s.trim());
    }

    // Render
    if (skillsArray.length > 0) {
      return skillsArray.slice(0, 6).map((skill, index) => (
        <View key={index} style={styles.skillTag}>
          <Text style={styles.skillText}>{skill}</Text>
        </View>
      ));
    } else {
      return <Text style={styles.keySkills}>N/A</Text>;
    }
  })()}
</View>


      {/* Footer */}
      <Text style={styles.descTitle}>Description:</Text>
      <Text style={styles.bottomText}>{job.description}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 24,
    borderRadius: 24,
    marginVertical: 14,
    width:'100%',
    minHeight: 550,
    alignSelf: "center",
    justifyContent: "flex-start",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  logoBox: {
    width: 110,
    height: 110,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    overflow: "hidden",
  },
  logoText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 34,
    letterSpacing: 1,
    zIndex: 2,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 17,
    color: "#444",
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  info: {
    marginLeft: 6,
    fontSize: 16,
    color: "#0D1B2A",
    fontWeight: "500",
  },
  keySkillsLabel: {
    marginTop: 18,
    fontSize: 16,
    fontWeight: "bold",
  },
  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
    marginBottom: 10,
  },
  skillTag: {
    backgroundColor: "#F1F4FF",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#B3C4FF",
  },
  skillText: {
    color: "#3D5AFE",
    fontSize: 14,
    fontWeight: "600",
  },
  descTitle: {
    marginTop: 28,
    fontWeight: "900",
    fontSize: 18,
    color: "#333",
  },
  bottomText: {
    marginTop: 12,
    textAlign: "left",
    fontSize: 16,
    color: "#333",
    fontStyle: "italic",
    lineHeight: 22,
  },
});

export default JobCard;
