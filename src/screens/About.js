// AboutScreen.js
import React from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity, Text as RNText } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

const AboutScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.surface }]}>
        <TouchableOpacity
          style={styles.headerLeft}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color={colors.text} />
          <RNText style={[styles.headerTitle, { color: colors.text }]}>About Ahead</RNText>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.content}>
        <RNText style={[styles.heading, { color: colors.text }]}>
          Welcome to Ahead
        </RNText>

        <RNText style={[styles.paragraph, { color: colors.text }]}>
          Ahead is a professional social media platform that empowers users to connect with industry professionals, find jobs, receive expert support, and stay updated with live news.
        </RNText>

        <RNText style={[styles.paragraph, { color: colors.text }]}>
          Features include:
        </RNText>

        <RNText style={[styles.listItem, { color: colors.text }]}>• One-on-one chat with experts</RNText>
        <RNText style={[styles.listItem, { color: colors.text }]}>• Group chats for professional networking</RNText>
        <RNText style={[styles.listItem, { color: colors.text }]}>• Job search and application</RNText>
        <RNText style={[styles.listItem, { color: colors.text }]}>• Expert support and FAQs</RNText>
        <RNText style={[styles.listItem, { color: colors.text }]}>• Live news updates relevant to your industry</RNText>

        <RNText style={[styles.paragraph, { color: colors.text }]}>
          Ahead aims to bridge the gap between professionals and opportunities, helping users grow their network and career in a single app.
        </RNText>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    paddingHorizontal: 12,
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "600", marginLeft: 10 },
  content: { padding: 16 },
  heading: { fontSize: 20, fontWeight: "700", marginBottom: 16 },
  paragraph: { fontSize: 14, lineHeight: 22, marginBottom: 12 },
  listItem: { fontSize: 14, lineHeight: 20, marginLeft: 12 },
});

export default AboutScreen;
