// components/CustomHeader.js
import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import Feather from "react-native-vector-icons/Feather";
import { useTheme } from "../context/ThemeContext";
import { useNavigation } from "@react-navigation/native";
import { useSelector } from "react-redux";

const CustomHeader = ({ activeTab, setActiveTab }) => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { user: userData } = useSelector((state) => state.user);
   const unreadCount = useSelector((state) => state.chat.unreadCount);
const DUMMY_PROFILE_PIC = "https://randomuser.me/api/portraits/men/75.jpg";
 const dummyUnreadCount = 4; // 🔴 Replace with Redux later
  return (
    <View style={[styles.header]}>
      {/* Left: Avatar -> open drawer */}
      <TouchableOpacity onPress={() => navigation.openDrawer()}>
      
              <View style={[styles.avatar,{borderColor:colors.primary}]}>
  <Image 
    source={require("../assets/logomain.jpg")} 
    style={{ width: 34, height: 34, borderRadius: 18}} 
    resizeMode="contain"
  />    
</View>
      </TouchableOpacity>

      {/* Center */}
      <View style={styles.headerCenter}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Ahead AI</Text>
    

      </View>

      {/* Right */}
       <TouchableOpacity
        style={styles.messageWrapper}
        onPress={() => navigation.navigate("Notifications")}
        activeOpacity={0.8}
      >
        <Feather
          name="bell"
          size={26}
          color={colors.text}
        />
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    height: 55,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
   

  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  subTabs: {
    flexDirection: "row",
    marginTop: 2, // ↓ slightly closer to title
    justifyContent: "center",
  },
  subTabButton: { marginHorizontal: 6, paddingBottom: 4 },
  subTabText: { fontSize: 12, fontWeight: "600" },
  verticalLine: {
    width: 1,
    height: 20,
    alignSelf: "center",
    marginHorizontal: 8,
  },
  activeTabText: {
    fontSize: 16, // keep client’s requested size
    fontWeight: "bold",
  },
  messageWrapper: {
    position: "relative",
    marginRight: 4,
  },
  unreadBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    backgroundColor: "red",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  unreadText: {
    color: "white",
    fontSize: 10,
    fontWeight: "700",
  },
});


export default CustomHeader;
