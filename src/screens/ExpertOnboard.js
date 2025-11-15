// ExpertonScreen.js
import React, { useState } from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import Icon from "@react-native-vector-icons/material-icons";
import { useTheme } from "../context/ThemeContext";
import BecomeExpertScreen from "../components/BecomeExpertScreen";
import ExpertDashboardScreen from "../components/ExpertDashboardScreen";
import { useSelector } from "react-redux";

const ExpertonScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { user: userData } = useSelector((state) => state.user);
  
 const isVerified = userData?.expertVerification?.trim().toLowerCase() === "approved";
  const [expertData, setExpertData] = useState(null);
  console.log(userData?.expertVerification)

  const handleVerified = (form) => {
    setExpertData(form);
    //setIsVerified(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header Bar */}
      <View style={[styles.headerBar, { borderBottomColor: colors.surface }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ flexDirection: "row", alignItems: "center" }}
        >
          <Icon name="arrow-back" size={24} color={colors.text} />
          <Text style={[styles.headerTitle, { color: colors.text, marginLeft: 10 }]}>
            {isVerified ? "Manage Services" : "Become an Expert"}
          </Text>
        </TouchableOpacity>

        {/* Toggle for dev testing */}
       
      </View>

      {isVerified ? (
        <ExpertDashboardScreen expert={expertData} />
      ) : (
        <BecomeExpertScreen onVerified={handleVerified} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
});

export default ExpertonScreen;
