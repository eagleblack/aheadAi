// CandidatesScreen.js
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import firestore from "@react-native-firebase/firestore";
import { useTheme } from "../context/ThemeContext";
import Icon from "@react-native-vector-icons/material-icons";
import { useNavigation, useRoute } from "@react-navigation/native";

const CandidatesScreen = ( ) => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { jobId } = route.params || {};

  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch swipes + user info
  const fetchCandidates = useCallback(async () => {
    if (!jobId) return;

    try {
      setLoading(true);
      const snapshot = await firestore()
        .collection("swipes")
        .where("targetId", "==", jobId)
        .where("direction", "==", "right")

        .get();

      const swipeData = snapshot.docs.map((doc) => doc.data());
      const userIds = [...new Set(swipeData.map((s) => s.swiperId))];

      const userPromises = userIds.map(async (uid) => {
        const userDoc = await firestore().collection("users").doc(uid).get();
        return { uid, ...userDoc.data() };
      });

      const users = await Promise.all(userPromises);

      // Merge user data with swipe info
      const merged = swipeData.map((s) => ({
        ...s,
        user: users.find((u) => u.uid === s.swiperId),
      }));

      setCandidates(merged);
    } catch (err) {
      console.error("❌ Error fetching candidates:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCandidates();
  }, [fetchCandidates]);

  const renderCandidate = ({ item }) => {
    const profilePic =
      item?.user?.profilePic || item?.user?.ProfileUrl || null;
    const displayName = item?.user?.name || item?.user?.username || "Unknown";
    const direction = item?.direction === "right" ? "Accepted" : "Rejected";

    return (
      <TouchableOpacity
        style={[styles.userCard, { borderBottomColor: colors.surface }]}
        onPress={() =>
          navigation.navigate("OtherProfile", { uid: item?.swiperId })
        }
      >
        <Image
          source={
            profilePic
              ? { uri: profilePic }
              : require("../assets/logo_svg.png")
          }
          style={styles.avatar}
        />
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: colors.text }]}>
            {displayName}
          </Text>
          <Text style={[styles.userSub, { color: colors.textSecondary }]}>
            {direction} • {item?.jobTitle || "Unknown Role"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            borderBottomColor: colors.surface,
            backgroundColor: colors.background,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Candidates
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 40 }}
        />
      ) : (
        <FlatList
          data={candidates}
          keyExtractor={(item, index) => item.swiperId + index}
          renderItem={renderCandidate}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 50 }}>
              <Icon name="person-off" size={64} color={colors.textSecondary} />
              <Text style={{ color: colors.text, fontSize: 16, marginTop: 12 }}>
                No candidates found
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 13,
                  marginTop: 4,
                }}
              >
                Nobody has swiped yet for this job.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default CandidatesScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  backButton: {
    width: 40,
    alignItems: "flex-start",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 0.5,
  },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  userInfo: { flex: 1, marginLeft: 12 },
  userName: { fontSize: 16, fontWeight: "600" },
  userSub: { fontSize: 13, marginTop: 2 },
});
