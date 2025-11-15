import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import Icon from "@react-native-vector-icons/material-icons";
import LinearGradient from "react-native-linear-gradient";
import { themes } from "../themes/themes";
import { useJobTheme } from "../context/JobThemeContext";

const JobCardApplied = ({ job }) => {
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

  // ---------- STATUS ----------
  const now = new Date();
  const deadline = job?.deadline?.toDate
    ? job.deadline.toDate()
    : job?.deadline
    ? new Date(job.deadline)
    : null;

  let statusLabel = "Open";
  if (deadline && deadline < now) statusLabel = "Closed";
  else if (job?.status) statusLabel = job.status;

  const statusColors = {
    Closed: { bg: "#FFD6D6", text: "#B00020" },
    Open: { bg: "#C9FFD9", text: "#1B5E20" },
    default: { bg: "#D9F3FF", text: "#01579B" },
  };

  const currentStatus = statusColors[statusLabel] || statusColors.default;

  // ---------- UI ----------
  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={["#FFF8E7", "#FFFFFF", "#FDFBFB"]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Logo */}
      <View style={styles.logoBox}>
        <LinearGradient
          colors={["#6A11CB", "#2575FC"]}
          style={[StyleSheet.absoluteFillObject, { borderRadius: 16 }]}
        />
        <Text style={styles.logoText}>
          {job.company?.[0]?.toUpperCase() || "C"}
        </Text>
      </View>

      {/* Title + Company */}
      <Text style={styles.title}>{job.title || "Untitled Job"}</Text>
      <Text style={styles.subtitle}>{job.company || "Unknown Company"}</Text>

      {/* Status */}
      <View
        style={[
          styles.statusTag,
          { backgroundColor: currentStatus.bg },
        ]}
      >
        <Text
          style={[
            styles.statusText,
            { color: currentStatus.text },
          ]}
        >
          {statusLabel.toUpperCase()}
        </Text>
      </View>

      {/* Location + Salary */}
      <View style={styles.row}>
        <Icon name="location-on" size={20} color="#FF6F61" />
        <Text style={styles.info}>{job.location || "N/A"}</Text>

        <Icon name="payments" size={20} color="#FFB400" style={styles.iconSpacing} />
        <Text style={styles.info}>{job.salary || "Not Disclosed"}</Text>
      </View>

      {/* Type + Remote */}
      <View style={styles.row}>
        <Icon name="work" size={20} color="#4CAF50" />
        <Text style={styles.info}>
          {job?.type || job?.shift || "N/A"}
        </Text>

        <Icon name="home" size={20} color="#007BFF" style={styles.iconSpacing} />
        <Text style={styles.info}>
          {job?.remote ? "Remote" : "On-site"}
        </Text>
      </View>

      {/* Skills */}
      <Text style={styles.sectionLabel}>Key Skills:</Text>
      <View style={styles.skillsContainer}>
        {job.skills?.length ? (
          job.skills.slice(0, 6).map((skill, i) => (
            <View key={i} style={styles.skillTag}>
              <Text style={styles.skillText}>{skill}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.noSkills}>N/A</Text>
        )}
      </View>

      {/* Description */}
      <Text style={styles.sectionLabel}>Description:</Text>
      <Text style={styles.description}>
        {job.description || "No description available."}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 24,
    borderRadius: 24,
    marginVertical: 14,
    width: "100%",
    minHeight: 540,
    alignSelf: "center",
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    overflow: "hidden",
  },
  logoBox: {
    width: 100,
    height: 100,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
    overflow: "hidden",
  },
  logoText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 34,
    zIndex: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#444",
    marginBottom: 18,
  },
  statusTag: {
    alignSelf: "flex-start",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 14,
  },
  statusText: {
    fontWeight: "700",
    fontSize: 13,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  iconSpacing: {
    marginLeft: 16,
  },
  info: {
    marginLeft: 6,
    fontSize: 15,
    color: "#0D1B2A",
    fontWeight: "500",
  },
  sectionLabel: {
    marginTop: 18,
    fontSize: 16,
    fontWeight: "700",
    color: "#6A11CB",
  },
  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
    marginBottom: 10,
  },
  skillTag: {
    backgroundColor: "#EEF3FF",
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
  noSkills: {
    fontSize: 14,
    color: "#555",
    fontStyle: "italic",
  },
  description: {
    marginTop: 10,
    textAlign: "left",
    fontSize: 15.5,
    color: "#333",
    lineHeight: 22,
  },
});

export default JobCardApplied;
