// screens/ThemeScreen.js
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from "react-native";
import { useTheme } from "./ThemeContext";

const themes = [
  { key: "light", label: "Light Theme" },
  { key: "dark", label: "Dark Theme" },
  { key: "midnight", label: "Midnight Theme" },
];

const ThemeScreen = () => {
  const { theme, setTheme, colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        Choose Your Theme
      </Text>

      <FlatList
        data={themes}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => {
          const isSelected = theme === item.key;
          return (
            <TouchableOpacity
              style={[
                styles.option,
                {
                  backgroundColor: isSelected
                    ? colors.primary
                    : colors.surface,
                },
              ]}
              onPress={() => setTheme(item.key)}
            >
              <Text
                style={{
                  color: isSelected ? "#fff" : colors.text,
                  fontWeight: isSelected ? "700" : "400",
                }}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
  },
  option: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
});

export default ThemeScreen;