// FAQScreen.js
import React from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity, Text as RNText } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useNavigation } from "@react-navigation/native";
import Icon from "@react-native-vector-icons/material-icons";

const faqs = [
  {
    question: "How do I create a profile?",
    answer: "Go to 'My Account' in Settings and fill in your personal and professional details."
  },
  {
    question: "How can I connect with industry experts?",
    answer: "Use the chat or group chat features to directly message verified experts."
  },
  {
    question: "How do I apply for jobs?",
    answer: "Navigate to the Jobs section, browse listings, and apply directly from the app."
  },
  {
    question: "How do I report a problem?",
    answer: "Go to Feedback & Support from the Settings page and submit your issue."
  },
];

const FAQScreen = () => {
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
          <RNText style={[styles.headerTitle, { color: colors.text }]}>FAQs</RNText>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.content}>
        {faqs.map((item, index) => (
          <View key={index} style={styles.faqItem}>
            <RNText style={[styles.question, { color: colors.text }]}>{item.question}</RNText>
            <RNText style={[styles.answer, { color: colors.text }]}>{item.answer}</RNText>
          </View>
        ))}
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
  faqItem: { marginBottom: 20 },
  question: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  answer: { fontSize: 14, lineHeight: 20 },
});

export default FAQScreen;
