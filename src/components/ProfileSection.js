import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Linking,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Avatar, ActivityIndicator } from "react-native-paper";
import firestore,{FieldValue} from "@react-native-firebase/firestore";
import Icon from "@react-native-vector-icons/material-icons";
import { useTheme } from "../context/ThemeContext";

const ProfileSection = ({ expert }) => {
  const { colors } = useTheme();
  const uid = expert?.uid;

  const [bio, setBio] = useState(expert?.expertBio || "");
  const [profession, setProfession] = useState(expert?.expertProfession || "");
  const [expertise, setExpertise] = useState(expert?.expertise || []);
  const [newSkill, setNewSkill] = useState("");
  const [loading, setLoading] = useState(false);

  const addExpertise = async () => {
    const skill = newSkill.trim();
    if (!skill || expertise.includes(skill)) return setNewSkill("");
    const updated = [...expertise, skill];
    setExpertise(updated);
    setNewSkill("");
    if (!uid) return;
    try {
      await firestore().collection("users").doc(uid).update({ expertise: updated });
    } catch (err) {
      console.warn("failed to update expertise", err);
      Alert.alert("Error", "Could not save expertise.");
    }
  };

  const saveProfile = async () => {
    if (!uid) return;
    try {
      setLoading(true);
      await firestore().collection("users").doc(uid).update({
        expertBio: bio,
        expertProfession: profession,
        expertise,
        updatedAt: FieldValue.serverTimestamp(),
      });
      Alert.alert("Saved", "Profile updated successfully.");
    } catch (err) {
      console.warn("saveProfile error", err);
      Alert.alert("Error", "Could not save profile.");
    } finally {
      setLoading(false);
    }
  };

  const openLink = (url) => {
    if (!url) return;
    Linking.openURL(url).catch((e) => console.warn("openLink error", e));
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Profile Card */}
      <View style={[styles.profileCard, { backgroundColor: colors.surface }]}>
        <Avatar.Image
          size={72}
          source={{ uri: expert?.profilePic }}
          style={{ backgroundColor: colors.primary + "20" }}
        />
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={[styles.name, { color: colors.text }]}>{expert?.name}</Text>
          <TextInput
            placeholder="Profession"
            value={profession}
            onChangeText={setProfession}
            placeholderTextColor={colors.textSecondary}
            style={[styles.professionInput, { color: colors.text, borderBottomColor: colors.textSecondary + "40" }]}
          />
        </View>
      </View>

      {/* Bio Section */}
      <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>About You</Text>
        <TextInput
          placeholder="Write a short bio..."
          value={bio}
          onChangeText={setBio}
          multiline
          placeholderTextColor={colors.textSecondary}
          style={[
            styles.bioInput,
            {
              color: colors.text,
              borderColor: colors.textSecondary + "30",
            },
          ]}
        />
      </View>

      {/* Expertise Section */}
      <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Expertise</Text>
        <View style={styles.skillsContainer}>
          {expertise.map((skill) => (
            <View
              key={skill}
              style={[styles.skillChip, { backgroundColor: colors.primary + "15" }]}
            >
              <Text style={{ color: colors.primary, fontWeight: "500" }}>{skill}</Text>
              <TouchableOpacity
                onPress={() =>
                  setExpertise(expertise.filter((s) => s !== skill))
                }
              >
                <Icon name="close" size={16} color={colors.primary} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
        <TextInput
          placeholder="Add new skill"
          value={newSkill}
          onChangeText={setNewSkill}
          onSubmitEditing={addExpertise}
          placeholderTextColor={colors.textSecondary}
          style={[
            styles.newSkillInput,
            {
              color: colors.text,
              borderColor: colors.textSecondary + "40",
            },
          ]}
        />
      </View>

      {/* Save Button */}
      <TouchableOpacity
        disabled={loading}
        onPress={saveProfile}
        style={[
          styles.saveButton,
          { backgroundColor: loading ? colors.primary + "80" : colors.primary },
        ]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Update Profile</Text>
        )}
      </TouchableOpacity>

      {/* Certificates */}
    
    </ScrollView>
  );
};

export default ProfileSection;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  professionInput: {
    fontSize: 15,
    borderBottomWidth: 1,
    paddingVertical: 4,
  },
  sectionCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },
  bioInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    minHeight: 80,
    textAlignVertical: "top",
  },
  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  skillChip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 6,
  },
  newSkillInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
  },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  linkText: {
    marginTop: 6,
    fontSize: 14,
    textDecorationLine: "underline",
  },
});
