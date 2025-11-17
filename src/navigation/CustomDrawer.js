// src/components/CustomDrawer.js
import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from "react-native";
import { DrawerContentScrollView } from "@react-navigation/drawer";
import Icon from "@react-native-vector-icons/material-icons";
import IconF from "react-native-vector-icons/Feather";

import { useTheme } from "../context/ThemeContext";
import { useNavigation } from "@react-navigation/native";
import { useSelector } from "react-redux";

const CustomDrawer = (props) => {
  const { isDark, toggleTheme, colors } = useTheme();
  const navigation=useNavigation()
  const { user: userData } = useSelector((state) => state.user);
const DUMMY_PROFILE_PIC = "https://randomuser.me/api/portraits/men/75.jpg";

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={{ flex: 1, backgroundColor: colors.surface }}
    >
      {/* Profile Section */}
      <TouchableOpacity style={styles.profileSection} onPress={()=>{
        navigation.navigate('Profile')
      }}>

            {userData?.profilePic?
                   <Image source={{ uri: userData?.profilePic }}    style={styles.avatar} />:
                   <Image 
                       source={require("../assets/logomain.jpg")} 
                       style={styles.avatar} 
                       resizeMode="contain"
                     />  }
     
        <Text style={[styles.name, { color: colors.text }]}>{userData?.name || "Ahead User"}</Text>
        <Text style={[styles.bio, { color: colors.textSecondary }]}>
        {userData?.profileTitle}
        </Text>
       
      </TouchableOpacity>

      {/* Analytics Section */}
     

      {/* Drawer Items */}
      
      <View style={styles.menuSection}>
          {
        userData.userType === "company"?"":
          <TouchableOpacity style={styles.menuItem} onPress={()=>{navigation.navigate("Following")}}>
          <Icon name="add" size={20} color={colors.text} />
          <Text style={[styles.menuText, { color: colors.text }]}>
            My Connections
          </Text>
        </TouchableOpacity>

          }
            {
        userData.userType === "company"?"":
        <TouchableOpacity style={styles.menuItem} onPress={()=>{navigation.navigate("Bookmark")}}>
          <Icon name="bookmark" size={20} color={colors.text} />
          <Text style={[styles.menuText, { color: colors.text }]}>
            Bookmarks
          </Text>
        </TouchableOpacity>
}
           {
        userData.userType === "company"?"": <TouchableOpacity style={styles.menuItem} onPress={()=>{navigation.navigate("Applied")}}>
            <IconF name="briefcase" size={20} color={colors.text} />
          <Text style={[styles.menuText, { color: colors.text }]}>
            Applied Jobs
          </Text>
         
        </TouchableOpacity>
      }
       {
        userData.userType === "company"?"":
        <TouchableOpacity style={styles.menuItem}
         onPress={()=>{navigation.navigate("Bookings")}}>
            <Icon name="star-border-purple500" size={20} color={colors.text} />
          <Text style={[styles.menuText, { color: colors.text }]}>
           Expert Booking
          </Text>
         
        </TouchableOpacity>
}
      
    {
        userData.userType === "company"?
        <TouchableOpacity style={styles.menuItem} onPress={()=>{navigation.navigate("JobPost")}}>
          <IconF name="briefcase" size={20} color={colors.text} />
          <Text style={[styles.menuText, { color: colors.text }]}>
            Post Job
          </Text>
         
        </TouchableOpacity>:""}

        {
        userData.userType === "company"?"":
          <TouchableOpacity style={styles.menuItem} onPress={()=>{navigation.navigate('MindGrow')}}>
         <Icon name="lightbulb" size={20} color={colors.text} />
          <Text style={[styles.menuText, { color: colors.text }]}>
            Mind Developing Games
          </Text>
         
        </TouchableOpacity>
}
  {
        userData.userType === "company"?"":
          <TouchableOpacity style={styles.menuItem} onPress={()=>{navigation.navigate('StudyScreen')}}>
          <Icon name="book" size={20} color={colors.text} />
          <Text style={[styles.menuText, { color: colors.text }]}>
           Learn
          </Text>
         
        </TouchableOpacity>
}
      </View>

      {/* Bottom Section */}
     
      <View style={styles.bottomSection}>
           {
        userData.userType === "company"?"":<TouchableOpacity style={styles.menuItem} onPress={()=>{navigation.navigate("ExpertonScreen")}}>
            <Icon name="explicit" size={20} color={colors.text} />
          <Text style={[styles.menuText, { color: colors.text }]}>
           Become an Expert
          </Text>
         
        </TouchableOpacity>
      }
        <TouchableOpacity style={styles.menuItem} onPress={()=>{navigation.navigate("Settings")}}>
          <Icon name="settings" size={20} color={colors.text} />
          <Text style={[styles.menuText, { color: colors.text }]}>
            Settings
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.modeSwitch} onPress={()=>{navigation.navigate("ThemeSelect")}}>
          <IconF name="sun" size={20} color={colors.text} />
          <Text style={[styles.menuText, { color: colors.text }]}>
           Themes
          </Text>
         
        </TouchableOpacity>
      </View>
    </DrawerContentScrollView>
  );
};

const styles = StyleSheet.create({
  profileSection: {
    padding: 20,
    alignItems: "flex-start",
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginBottom: 10,
    backgroundColor:'purple'
  },
  name: { fontSize: 18, fontWeight: "bold" },
  bio: { fontSize: 13, marginTop: 2 },
  streak: { marginTop: 8, fontSize: 14, fontWeight: "600" },

  analyticsBox: {
    padding: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    alignItems: "center",
  },
  analyticsText: { fontSize: 14, marginBottom: 10, textAlign: "center" },
  analyticsBtn: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  analyticsBtnText: { fontWeight: "600" },

  menuSection: { paddingHorizontal: 20,},
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  menuText: { marginLeft: 15, fontSize: 15 },
  newBadge: {
    marginLeft: "auto",
    fontSize: 12,
    fontWeight: "700",
    color: "#FF8800",
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },

  bottomSection: { marginTop: "auto", paddingHorizontal: 20 },
  modeSwitch: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
});

export default CustomDrawer;
