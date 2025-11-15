import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  TextInput,
  FlatList,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

const Dropdown = ({ label, value, options, onSelect, colors, navigation, targetScreen }) => {
  const [visible, setVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [filteredOptions, setFilteredOptions] = useState(options || []);

  useEffect(() => {
    // Filter options based on search text
    if (searchText.trim() === "") {
      setFilteredOptions(options);
    } else {
      const filtered = options.filter((item) =>
        item.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredOptions(filtered);
    }
  }, [searchText, options]);

  const handleSelect = (item) => {
    onSelect(item);
    setVisible(false);
    setSearchText("");

    // Navigate with label + value if provided
    if (navigation && targetScreen) {
      navigation.navigate(targetScreen, {
        label: label,
        value: item,
      });
    }
  };

  return (
    <View style={{ marginTop: 16 }}>
      {/* Row with label and selection */}
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        <TouchableOpacity
          style={[styles.dropdown, { borderBottomColor: colors.primary }]}
          onPress={() => setVisible(true)}
        >
          <Text style={{ color: value ? colors.text : colors.placeholder }}>
            {value || "Select an option"}
          </Text>
          <MaterialCommunityIcons name="chevron-down" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Modal with search and options */}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            {/* Search Input */}
            <TextInput
              placeholder="Search..."
              placeholderTextColor={colors.placeholder || "#888"}
              style={[styles.searchInput, { color: colors.text, borderColor: colors.primary }]}
              value={searchText}
              onChangeText={setSearchText}
            />

            {/* Options list */}
            <FlatList
              data={filteredOptions}
              keyExtractor={(item, index) => item + index}
              style={styles.optionsList}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={{ color: colors.text }}>{item}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: colors.text }]}>
                  No options found
                </Text>
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
  },
  label: {
    fontSize: 18,
    width: 140,
    marginRight: 10,
    fontWeight: "700",
  },
  dropdown: {
    flex: 1,
    borderBottomWidth: 1,
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    borderRadius: 12,
    padding: 16,
    maxHeight: "60%", // Fixed height for long lists
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  optionsList: {
    flexGrow: 0,
  },
  option: {
    paddingVertical: 12,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 20,
    fontStyle: "italic",
  },
});
     
export default Dropdown;
