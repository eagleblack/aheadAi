// components/CustomHeaderTabs.js
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const TAB_LABELS = {
  Post: "CREW Q&A",
  News: "NEWS ROOM",
  Trending: "HIGHLIGHT",
};
const CustomHeaderTabs = ({ tabs = [], activeTab, setActiveTab, colors }) => {
  // Calculate equal width per tab
  const tabWidth = width / tabs.length;
   const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background}]}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab}
          onPress={() => setActiveTab(tab)}
          style={[styles.tabButton, { width: tabWidth }]}
          activeOpacity={0.7}
        >
         <Text
  style={{
    color: activeTab === tab ? colors.primary : colors.textSecondary,
    fontWeight: "700",
    fontSize: 13,
    textAlign: "center",
  }}
>
  {(TAB_LABELS[tab] || tab).toUpperCase()}
</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    height: 50, // full height
    alignItems: "center",
    justifyContent: "center",


  },
  tabButton: {
    justifyContent: "center",
    alignItems: "center",
  },
});

export default CustomHeaderTabs;
