// CreatePostScreen.js
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Platform,
  ActivityIndicator,
  ScrollView,
  Linking,
} from "react-native";
import Icon from "@react-native-vector-icons/material-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";

import auth from "@react-native-firebase/auth";
import firestore,{FieldValue} from "@react-native-firebase/firestore";
import storage from "@react-native-firebase/storage";

import { launchImageLibrary } from "react-native-image-picker";
import uuid from "react-native-uuid";
import { useSelector } from "react-redux";

const AVATAR_URL = "https://i.pravatar.cc/150?img=12";

export default function CreatePostScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const [text, setText] = useState("");
  const [imageUri, setImageUri] = useState(null);
  const [uploading, setUploading] = useState(false);
  const { user: userData, loading } = useSelector((state) => state.user);
  
  const count = useMemo(() => `${text.length}/1000`, [text]);

  // Extract links from text
  const detectedLinks = useMemo(() => {
    const urlRegex =
      /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(ftp:\/\/[^\s]+)/gi;
    return text.match(urlRegex) || [];
  }, [text]);

  // Pick image directly
  const pickImage = async () => {
    const options = { mediaType: "photo", quality: 0.8 };
    const result = await launchImageLibrary(options);
    if (result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  // Upload post
  const handlePost = async () => {
    if (!text.trim() && !imageUri) return;
    setUploading(true);
    try {
      let imageUrl = null;
      if (imageUri) {
        const imgId = uuid.v4();
        const blob = await (await fetch(imageUri)).blob();
        const ref = storage().ref(
          `posts/${auth().currentUser.uid}/${imgId}.jpg`
        );
        await ref.put(blob);
        imageUrl = await ref.getDownloadURL();
      }

      await firestore().collection("posts").add({
        userId: auth().currentUser.uid,
        content: text.trim(),
        imageUrl: imageUrl || null,
        links: detectedLinks,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        totalLikes: 0,
        totalComments: 0,
        postIndex:0,
      });

      setText("");
      setImageUri(null);
      navigation.goBack();
    } catch (err) {
      console.error("Error posting:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar
        translucent={false}
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      {/* Top Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backHitbox}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Create Post
        </Text>
        <View style={styles.rightSpacer} />
      </View>

      {/* Profile Row */}
      <View style={styles.profileRow}>
        <TouchableOpacity style={styles.avatarWrap} activeOpacity={0.8}>
          {userData?.profilePic?
          <Image source={{ uri: userData?.profilePic }} style={styles.avatar} />:
          <Image source={{ uri: AVATAR_URL }} style={styles.avatar} />
          }
         
          <View
            style={[
              styles.avatarRing,
              { borderColor: colors.textSecondary },
            ]}
          />
        </TouchableOpacity>
        <View style={styles.nameBlock}>
          <Text style={[styles.name, { color: colors.text }]}>
           {userData?.name}
          </Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
           {userData?.profileTitle}

          </Text>
        </View>
      </View>

      {/* Banner */}
      <TouchableOpacity
        style={[styles.banner, { backgroundColor: colors.primary }]}
        activeOpacity={0.85}
      >
        <Text style={[styles.bannerText, { color: colors.background }]}>
          Please follow our Community Guidelines
        </Text>
      </TouchableOpacity>

      {/* Composer */}
      <ScrollView
        style={styles.composer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inputWrap}>
          <TextInput
            value={text}
            onChangeText={(v) => v.length <= 1000 && setText(v)}
            placeholder="What's on your mind?"
            placeholderTextColor={colors.textSecondary}
            style={[
              styles.input,
              {
                color: colors.text,
                borderColor: colors.divider,
                backgroundColor: colors.surface,
              },
            ]}
            multiline
            textAlignVertical="top"
          />
          <Text style={[styles.counter, { color: colors.textSecondary }]}>
            {count}
          </Text>
        </View>

        {/* Link preview area */}
        {detectedLinks.length > 0 && (
          <View
            style={[
              styles.linkBox,
              { backgroundColor: colors.primary + "15" },
            ]}
          >
            {detectedLinks.map((link, i) => (
              <TouchableOpacity key={i} onPress={() => Linking.openURL(link)}>
                <Text
                  style={{
                    color: colors.primary,
                    textDecorationLine: "underline",
                    marginBottom: 4,
                  }}
                >
                  {link}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Image preview */}
        {imageUri && (
          <View style={styles.imagePreviewWrap}>
            <Image
              source={{ uri: imageUri }}
              style={styles.imagePreview}
              resizeMode="cover"
            />
            <TouchableOpacity
              style={[styles.removeImgBtn, { backgroundColor: colors.background }]}
              onPress={() => setImageUri(null)}
            >
              <Icon name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.leftTools}>
          <TouchableOpacity style={styles.toolBtn} onPress={pickImage}>
            <Icon name="image" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[
            styles.postBtn,
            {
              backgroundColor:
                !text && !imageUri ? colors.disabled : colors.primary,
            },
          ]}
          disabled={!text && !imageUri}
          onPress={handlePost}
        >
          {uploading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={[styles.postLabel, { color: colors.background }]}>
              Post
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  backHitbox: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  rightSpacer: { width: 40 },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  avatarWrap: { width: 56, height: 56, marginRight: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarRing: {
    position: "absolute",
    left: -2,
    top: -2,
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
  },
  nameBlock: { flex: 1 },
  name: { fontSize: 18, fontWeight: "800", marginBottom: 2 },
  hint: { fontSize: 13, lineHeight: 18 },
  banner: {
    marginHorizontal: 16,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  bannerText: { fontSize: 13, textAlign: "center" },
  composer: { flex: 1, marginTop: 8, paddingHorizontal: 12 },
  inputWrap: { position: "relative" },
  input: {
    fontSize: 18,
    lineHeight: 26,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  counter: {
    position: "absolute",
    right: 10,
    bottom: 6,
    fontSize: 12,
    fontWeight: "600",
  },
  linkBox: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  imagePreviewWrap: { marginTop: 12, position: "relative" },
  imagePreview: {
    width: "100%",
    height: 220,
    borderRadius: 12,
  },
  removeImgBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  bottomBar: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: Platform.select({ ios: 18, android: 12 }),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftTools: { flexDirection: "row", alignItems: "center" },
  toolBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  postBtn: {
    height: 44,
    minWidth: 88,
    paddingHorizontal: 18,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  postLabel: { fontSize: 16, fontWeight: "700" },
});
