import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Card, Avatar, Chip } from "react-native-paper";
import Icon from "@react-native-vector-icons/material-icons"; // replace with your vector-icons import
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import firestore from "@react-native-firebase/firestore";
import auth from "@react-native-firebase/auth";
import { useSelector } from "react-redux";

const ExpertPage = ({ navigation }) => {
  const { colors } = useTheme();
  const [experts, setExperts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const currentUserId = auth().currentUser?.uid;

  // Redux selection slice
  const {
    experts: expertsCategory,
  } = useSelector((state) => state.selection);

  // Firestore listener for approved experts
  useEffect(() => {
    const unsubscribe = firestore()
      .collection("users")
      .where("expertVerification", "==", "approved")
      .onSnapshot((snapshot) => {
        const expertList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setExperts(expertList);
      });

    return () => unsubscribe();
  }, []);

  const getRandomAvatar = (name) =>
    `https://api.dicebear.com/8.x/initials/png?seed=${encodeURIComponent(name)}`;

  // Filter experts by selected category
  const filteredExperts = useMemo(() => {
    if (selectedCategory === "All") return experts;
    return experts.filter((exp) => exp.expertCategory === selectedCategory);
  }, [experts, selectedCategory]);

  const renderExpert = ({ item }) => {
    const profilePic = item.profilePic
      ? item.profilePic
      : getRandomAvatar(item.name || "User");
    const topExpertise = item.expertise?.slice(0, 3) || [];

    return (
      <TouchableOpacity
        onPress={() =>
          item.uid === currentUserId
            ? navigation.navigate("ExpertonScreen")
            : navigation.navigate("BookServiceScreen", {
                expertId: item.uid,
                userId: currentUserId,
              })
        }
      >
        <Card style={[styles.expertCard, { backgroundColor: colors.surface }]}>
          <Card.Content style={styles.expertContent}>
            <View style={styles.expertHeader}>
              <Avatar.Image size={60} source={{ uri: profilePic }} />
              <View style={styles.expertInfo}>
                <View style={styles.expertNameRow}>
                  <Text style={[styles.expertName, { color: colors.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Icon name="verified" size={16} color={colors.primary} />
                </View>
                <Text style={[styles.expertProfession, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item.expertProfession || "Professional Expert"}
                </Text>
              </View>
            </View>

            <Text style={[styles.bio, { color: colors.text }]} numberOfLines={3}>
              {item.expertBio || "No bio provided."}
            </Text>

            <View style={styles.expertiseContainer}>
              {topExpertise.map((skill, index) => (
                <Chip
                  key={index}
                  style={[styles.expertiseChip, { backgroundColor: colors.secondary }]}
                  textStyle={[styles.expertiseText, { color: colors.text }]}
                >
                  {skill}
                </Chip>
              ))}
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderCategoryTabs = () => {
    const categories = ["All", ...(expertsCategory || [])];
    return (
      <View style={styles.categoryContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 10, alignItems: "center" }}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              onPress={() => setSelectedCategory(category)}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: selectedCategory === category ? colors.primary : colors.surface,
                  borderColor: colors.primary,
                },
              ]}
            >
              <Text
                style={{
                  color: selectedCategory === category ? colors.onPrimary : colors.text,
                  fontWeight: "600",
                }}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Expert Consultations</Text>
      </View>

      {/* Horizontal Category Tabs */}
      {renderCategoryTabs()}

      <FlatList
        data={filteredExperts}
        renderItem={renderExpert}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.expertsList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="person-search" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No experts available</Text>
            <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
              Approved experts will appear here once verified.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingVertical: 16 },
  headerTitle: { fontSize: 20, fontWeight: "bold" },

  categoryContainer: { height: 50, marginBottom: 8 }, // fixed container height
  categoryScroll: { flex: 1 },
  categoryChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    alignSelf: "center", // center vertically in ScrollView
  },

  expertsList: { padding: 10 },
  expertCard: { marginBottom: 12, elevation: 2, borderRadius: 12 },
  expertContent: { padding: 10 },
  expertHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  expertInfo: { flex: 1, marginLeft: 12 },
  expertNameRow: { flexDirection: "row", alignItems: "center" },
  expertName: { fontSize: 15, fontWeight: "bold", marginRight: 6 },
  expertProfession: { fontSize: 13 },
  bio: { fontSize: 13, lineHeight: 20, marginBottom: 10 },
  expertiseContainer: { flexDirection: "row", flexWrap: "wrap" },
  expertiseChip: { margin: 2, borderRadius: 10 },
  expertiseText: { fontSize: 12 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 80, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 18, fontWeight: "bold", marginTop: 16 },
  emptyMessage: { fontSize: 14, textAlign: "center", marginTop: 4 },
});

export default ExpertPage;
