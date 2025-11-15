// PostJobScreen.js
import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Card, Button } from "react-native-paper";
import { useTheme } from "../context/ThemeContext";
import { useSelector } from "react-redux";
import Icon from "@react-native-vector-icons/material-icons";
import JobAccessScreen from "./JobAccessScreen";
import YourPosting from '../components/YourPosting'

const PostJobScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { user: userData, loading } = useSelector((state) => state.user);

  const [activeTab, setActiveTab] = useState("post"); // "post" or "view"

  // 🟢 Helper: Always return the correct company name
  const getCompanyName = () =>
    userData?.comapany_name?.value || "Unknown Company";

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Loading...</Text>
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>User data not available.</Text>
      </View>
    );
  }

  // 🟢 Header UI
  const renderHeader = () => (
    <View style={[styles.header, { borderBottomColor: colors.surface }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Icon name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: colors.text }]}>Job Posting</Text>
    </View>
  );

  const handleVerificationNavigation = () => {
    navigation.navigate("CompanyVerificationPageNew");
  };

  // 🟢 Case 1: Company user
  if (userData.userType === "company") {
    const companyName = getCompanyName();

    // ✅ Approved → Show tabs
    if (userData.status === "approved") {
      return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          

          {/* Tabs */}
          <View style={[styles.tabContainer, { borderBottomColor: colors.surface }]}>
         

          
          </View>

          {/* Tab Content */}
          {activeTab === "post" ? (
            <JobAccessScreen navigation={navigation} companyName={companyName} />
          ) : (
           <YourPosting />
          )}
        </View>
      );
    }

    // Pending → Waiting screen
    if (userData.status === "pending") {
      return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {renderHeader()}
          <Card style={[styles.card, { backgroundColor: colors.surface }]}>
            <Card.Content>
              <Text style={[styles.title, { color: colors.text }]}>
                Pending Your Company Verification
              </Text>
              <Text style={[styles.message, { color: colors.textSecondary }]}>
                You’ll be notified once your company ({companyName}) is approved.
              </Text>
            </Card.Content>
          </Card>
        </View>
      );
    }

    // Rejected → Reverify prompt
    if (userData.status === "rejected") {
      return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {renderHeader()}
          <Card style={[styles.card, { backgroundColor: colors.surface }]}>
            <Card.Content>
              <Text style={[styles.title, { color: colors.text }]}>
                Verification Rejected
              </Text>
              <Text style={[styles.message, { color: colors.textSecondary }]}>
                Your company verification was rejected. Please reverify your company
                ({companyName}).
              </Text>
              <Button
                mode="contained"
                onPress={handleVerificationNavigation}
                style={[styles.btn, { backgroundColor: colors.primary }]}
              >
                Reverify
              </Button>
            </Card.Content>
          </Card>
        </View>
      );
    }
  }

  // 🟢 Case 2: Non-company users
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderHeader()}
      <Card style={[styles.card, { backgroundColor: colors.surface }]}>
        <Card.Content>
          <Text style={[styles.title, { color: colors.text }]}>
            Company Verification Required
          </Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            Only verified companies can post jobs. Please verify your company before posting.
          </Text>
          <Button
            mode="contained"
            onPress={handleVerificationNavigation}
            style={[styles.btn, { backgroundColor: colors.primary }]}
          >
            Request Verification
          </Button>
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: "600", marginLeft: 12 },
  card: { borderRadius: 12, padding: 20, elevation: 2, marginBottom: 16 },
  title: { fontSize: 18, fontWeight: "600", marginBottom: 12 },
  message: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  btn: { marginTop: 8, borderRadius: 8 },
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptyView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default PostJobScreen;
