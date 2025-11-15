import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { useDispatch, useSelector } from "react-redux";
import { fetchUser } from "../store/userSlice";
import { ActivityIndicator, Button } from "react-native-paper";
import Icon from "react-native-vector-icons/Ionicons";
import UserPosts from "../components/UserPosts";
import YourPosting from "../components/YourPosting";

const DUMMY_PROFILE_PIC = "https://randomuser.me/api/portraits/men/75.jpg";

const ProfilePage = ({ navigation }) => {
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const { user: userData, loading } = useSelector((state) => state.user);

  const [activeTab, setActiveTab] = useState("Posts");

  useEffect(() => {
    if (!userData) {
      dispatch(fetchUser());
    }
  }, [dispatch]);

  // 🔹 Ensure company users cannot switch to other tabs
  useEffect(() => {
    if (userData?.userType === "company" && activeTab !== "About") {
      setActiveTab("About");
    }
  }, [userData]);

  if (loading || !userData) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Define tabs dynamically
  const TABS =
    userData?.userType === "company"
      ? ["About"]
      : ["Posts", "Experience", "Education"];

  const experiences = (userData.experiences || []).map((e) => ({
    ...e,
    type: "experience",
  }));
  const education = (userData.education || []).map((e) => ({
    ...e,
    type: "education",
  }));

  const sortedExperiences = experiences.sort(
    (a, b) =>
      new Date(b.to === "Present" ? Date.now() : b.to) -
      new Date(a.to === "Present" ? Date.now() : a.to)
  );

  const sortedEducation = education.sort(
    (a, b) => new Date(b.to) - new Date(a.to)
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["bottom", "top"]}
    >
      {/* Header Bar */}
      <View style={[styles.headerBar, { borderBottomColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={26} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Profile
        </Text>

        <TouchableOpacity
          onPress={() => {
            userData?.userType === "company"
              ? navigation.navigate("EditCompProfilePage")
              : navigation.navigate("EditProfilePage");
          }}
        >
          <Icon name="create-outline" size={26} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Info */}
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <Image
            source={{ uri: userData?.profilePic || DUMMY_PROFILE_PIC }}
            style={styles.profilePic}
          />

          <Text style={[styles.name, { color: colors.text }]}>
            {userData.name}
          </Text>
          <Text style={[styles.username, { color: colors.textSecondary }]}>
            @{userData.username}
          </Text>

          {userData.bio ? (
            <Text style={[styles.bio, { color: colors.text }]}>{userData.bio}</Text>
          ) : null}

          {userData.dob && (
            <Text style={[styles.dob, { color: colors.textSecondary }]}>
              🎂 DOB: {userData.dob}
            </Text>
          )}

          {userData.linkBtn && (
            <Button
              mode="contained-tonal"
              onPress={() =>
                Linking.openURL(
                  `https://linkedin.com/in/${userData.username || "dummy"}`
                )
              }
              style={styles.linkBtn}
              labelStyle={{ color: colors.primary }}
              icon="logo-linkedin"
            >
              View LinkedIn
            </Button>
          )}
        </View>

        {/* Tabs */}
        {userData?.userType=="company"?"":
        <View style={styles.tabs}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                activeTab === tab && {
                  borderBottomColor: colors.primary,
                },
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === tab ? colors.primary : colors.text },
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
}
        {/* Content */}
        <View style={styles.content}>
          {/* 🔹 Only show posts for non-company users */}
          {userData?.userType !== "company" && activeTab === "Posts" && (
            <UserPosts navigation={navigation} enableDelete />
          )}

          {activeTab === "Experience" &&
            sortedExperiences.map((exp, idx) => (
              <View key={idx} style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                <View
                  style={[
                    styles.timelineCard,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  <Text style={[styles.cardTitle, { color: colors.text }]}>
                    {exp.title}
                  </Text>
                  <Text
                    style={[styles.cardOrg, { color: colors.textSecondary }]}
                  >
                    {exp.org}
                  </Text>
                  <Text
                    style={[styles.cardDate, { color: colors.textSecondary }]}
                  >
                    {exp.from} – {exp.to}
                  </Text>
                  <Text style={[styles.cardDesc, { color: colors.text }]}>
                    {exp.desc}
                  </Text>
                </View>
              </View>
            ))}

          {activeTab === "Education" &&
            sortedEducation.map((edu, idx) => (
              <View key={idx} style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                <View
                  style={[
                    styles.timelineCard,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  <Text style={[styles.cardTitle, { color: colors.text }]}>
                    {edu.degree}
                  </Text>
                  <Text
                    style={[styles.cardOrg, { color: colors.textSecondary }]}
                  >
                    {edu.institution}
                  </Text>
                  <Text
                    style={[styles.cardDate, { color: colors.textSecondary }]}
                  >
                    {edu.from} – {edu.to}
                  </Text>
                </View>
              </View>
            ))}

          {/* For company users — show simple info section */}
          {userData?.userType === "company" && activeTab === "About" && (
            <View style={{ padding: 16 }}>
          
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { paddingBottom: 40 },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.8,
  },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  header: {
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    margin: 12,
    elevation: 2,
  },
  profilePic: { width: 120, height: 120, borderRadius: 60, marginBottom: 12 },
  name: { fontSize: 22, fontWeight: "700" },
  username: { fontSize: 15, marginBottom: 6 },
  bio: {
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
    marginBottom: 6,
  },
  dob: { fontSize: 13, marginBottom: 8 },
  linkBtn: { borderRadius: 30, marginTop: 10 },
  tabs: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 14,
  },
  tab: {
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: { fontSize: 16, fontWeight: "600" },
  content: { paddingHorizontal: 12 },
  timelineItem: { flexDirection: "row", marginBottom: 20 },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#0077b5",
    marginRight: 12,
    marginTop: 8,
  },
  timelineCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: "600", marginBottom: 2 },
  cardOrg: { fontSize: 14, fontWeight: "500", marginBottom: 2 },
  cardDate: { fontSize: 13, marginBottom: 6 },
  cardDesc: { fontSize: 14, lineHeight: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});

export default ProfilePage;
