import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing, Image, ScrollView } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import LinearGradient from "react-native-linear-gradient";
import { themes } from "../themes/themes";
import { useJobTheme } from "../context/JobThemeContext";

const UserCard = ({ user }) => {
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

  if (!user) return null;

  const {
    name,
    bio,
    profilePic,
    profileTitle,
    education = [],
    experiences = [],
    linkedin,
    username,
  } = user;

  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
      {/* Gradient Background */}
      <LinearGradient
        colors={["#FFF5E1", "#FFF9F5", "#FDFBFB"]}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Picture */}
        <View style={styles.profileBox}>
          {profilePic ? (
            <Image source={{ uri: profilePic }} style={styles.profileImage} />
          ) : (
            <View style={styles.profileFallback}>
              <Text style={styles.profileFallbackText}>
                {name?.charAt(0)?.toUpperCase() || "U"}
              </Text>
            </View>
          )}
        </View>

        {/* Name & Title */}
        <Text style={styles.name}>{name || "Unknown User"}</Text>
        {profileTitle ? <Text style={styles.subtitle}>{profileTitle}</Text> : null}

        {/* Bio */}
        {bio ? (
          <>
            <Text style={styles.sectionLabel}>I am</Text>
            <Text style={styles.bio}>{bio}</Text>
          </>
        ) : null}

        {/* Experiences */}
        {experiences.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>My Experiences</Text>
            {experiences.map((exp, index) => (
              <View key={index} style={styles.expItem}>
                <Icon name="work" size={20} color="#4CAF50" />
                <Text style={styles.expText}>{exp.title || "Experience"}</Text>
              </View>
            ))}
          </>
        )}

        {/* Education */}
        {education.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>I Studied</Text>
            {education.map((edu, index) => (
              <View key={index} style={styles.eduItem}>
                <Icon name="school" size={20} color="#007BFF" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.eduDegree}>{edu.degree}</Text>
                  <Text style={styles.eduInstitute}>
                    {edu.institution} ({edu.from} - {edu.to})
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* LinkedIn */}
        {linkedin ? (
          <View style={styles.linkRow}>
            <Icon name="link" size={20} color="#0A66C2" />
            <Text style={styles.linkText}>{linkedin}</Text>
          </View>
        ) : null}

        {/* Username */}
        {username ? (
          <View style={styles.linkRow}>
            <Icon name="person" size={20} color="#555" />
            <Text style={styles.linkText}>@{username}</Text>
          </View>
        ) : null}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 24,
    borderRadius: 24,
    marginVertical: 14,
    width: "100%",
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
  profileBox: {
    alignSelf: "center",
    marginBottom: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: "#fff",
    backgroundColor: "#eee",
  },
  profileFallback: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#6A11CB",
    justifyContent: "center",
    alignItems: "center",
  },
  profileFallbackText: {
    fontSize: 48,
    color: "#fff",
    fontWeight: "bold",
  },
  name: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
    color: "#1A1A1A",
  },
  subtitle: {
    fontSize: 17,
    color: "#444",
    textAlign: "center",
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#6A11CB",
    marginBottom: 6,
    marginTop: 12,
  },
  bio: {
    fontSize: 16,
    color: "#333",
    lineHeight: 22,
    fontStyle: "italic",
    marginBottom: 10,
  },
  expItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  expText: {
    fontSize: 16,
    color: "#0D1B2A",
    marginLeft: 6,
  },
  eduItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  eduDegree: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0D1B2A",
    marginLeft: 6,
  },
  eduInstitute: {
    fontSize: 14,
    color: "#555",
    marginLeft: 6,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  linkText: {
    marginLeft: 6,
    color: "#0A66C2",
    fontSize: 15,
    flexShrink: 1,
  },
});

export default UserCard;
