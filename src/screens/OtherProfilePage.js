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
import {
  fetchOtherProfile,
  clearOtherProfile,
} from "../store/otherProfileSlice";
import { ActivityIndicator, Button } from "react-native-paper";
import Icon from "react-native-vector-icons/Ionicons";
import Feather from "react-native-vector-icons/Feather";
import OtherProfilePosts from "../components/OtherProfilePosts";
import { clearPosts } from "../store/otherProfilePostSlice";
import firestore from "@react-native-firebase/firestore";
import auth from "@react-native-firebase/auth";

const DUMMY_PROFILE_PIC = "https://randomuser.me/api/portraits/men/75.jpg";

const OtherProfilePage = ({ navigation, route }) => {
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const { uid } = route.params;
  const { profile: userData, loading } = useSelector(
    (state) => state.otherProfile
  );

  const TABS =
    userData?.userType === "company"
      ? ["Posts"]
      : ["Posts", "Experience", "Education"];

  const [activeTab, setActiveTab] = useState("Posts");
  const [isFollowing, setIsFollowing] = useState(false);
  const currentUser = auth().currentUser;

  // 🔹 Check follow status
  useEffect(() => {
  let unsubscribe;
  if (uid && currentUser?.uid && uid !== currentUser.uid) {
    const followDoc = firestore()
      .collection("follows")
      .doc(`${currentUser.uid}_${uid}`);

    unsubscribe = followDoc.onSnapshot((doc) => {
      setIsFollowing(doc.exists);
    });
  }
  return () => unsubscribe && unsubscribe();
}, [uid, currentUser]);


  // 🔹 Toggle follow/unfollow
const handleFollowToggle = async () => {
  if (!currentUser?.uid || uid === currentUser.uid) return;

  const followId = `${currentUser.uid}_${uid}`;
  const followRef = firestore().collection("follows").doc(followId);
  const notificationsRef = firestore().collection("notifications");

  try {
    if (isFollowing) {
      // 🔹 UNFOLLOW: Remove follow doc & notification
      await followRef.delete();

      // Find the existing FOLLOW notification and delete it
      const notifSnap = await notificationsRef
        .where("notificationFrom", "==", currentUser.uid)
        .where("notificationTo", "==", uid)
        .where("notificationType", "==", "FOLLOW")
        .get();

      const batch = firestore().batch();
      notifSnap.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();

      console.log("✅ Unfollowed and removed notification.");
    } else {
      // 🔹 FOLLOW: Create follow doc & notification
      await followRef.set({
        followerId: currentUser.uid,
        followingId: uid,
        followedAt: firestore.FieldValue.serverTimestamp(),
      });

      await notificationsRef.add({
        notificationFrom: currentUser.uid,
        notificationTo: uid,
        notificationType: "FOLLOW",
        notificationText: `You have a new follower.`,
        createdOn: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
        read: false,
        status:"UNREAD"
      });

      console.log("✅ Followed and notification added.");
    }
  } catch (error) {
    console.log("❌ Error toggling follow:", error);
  }
};


  useEffect(() => {
    if (userData?.userType === "company" && activeTab !== "Posts") {
      setActiveTab("Posts");
    }
    dispatch(clearPosts());
  }, [userData]);

  useEffect(() => {
    if (uid) {
      dispatch(fetchOtherProfile(uid));
    }

    return () => {
      dispatch(clearOtherProfile());
    };
  }, [dispatch, uid]);

  if (loading || !userData) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

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
      {/* 🔹 Header Bar */}
      <View style={[styles.headerBar, { borderBottomColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={26} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Profile
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {/* 🔹 Follow Button */}
          {uid !== currentUser?.uid && (
            <TouchableOpacity
              onPress={handleFollowToggle}
              style={[
                styles.followBtn,
                {
                  backgroundColor: isFollowing
                    ? colors.surface
                    : colors.primary,
                },
              ]}
            >
              <Text
                style={{
                  color: isFollowing ? colors.text : "#fff",
                  fontWeight: "600",
                }}
              >
                {isFollowing ? "Following" : "Follow"}
              </Text>
            </TouchableOpacity>
          )}

          {/* 🔹 Message Button */}
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("Message", {
                otherUserId: uid,
                otherUserName: userData.name,
                otherUserAvatar: userData.avatar,
              })
            }
          >
            <Feather
              name="message-circle"
              size={22}
              color={colors.text}
              style={{ marginLeft: 12 }}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
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

          {userData.bio && (
            <Text style={[styles.bio, { color: colors.text }]}>
              {userData.bio}
            </Text>
          )}

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
              <Text>View LinkedIn</Text>
            </Button>
          )}
        </View>

        {userData?.userType == "company" ? (
          ""
        ) : (
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
                    {
                      color:
                        activeTab === tab ? colors.primary : colors.text,
                    },
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.content}>
          {activeTab === "Posts" && (
            <OtherProfilePosts navigation={navigation} otherUserId={uid} />
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
  followBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  header: {
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    margin: 12,
    elevation: 2,
  },
  profilePic: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 12,
  },
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

export default OtherProfilePage;
