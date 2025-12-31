import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Linking,
  StyleSheet,
  Dimensions,
} from "react-native";
import { timeAgo } from "../utils/time";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const BOTTOM_TAB_HEIGHT = 60;
const PAGE_HEIGHT = SCREEN_HEIGHT - BOTTOM_TAB_HEIGHT;

const fallbackImage = require("../assets/maxresdefault.jpg");

const NewsCard = ({ item, colors }) => {
  const [hasImageError, setHasImageError] = useState(false);

  const imageSource =
    !hasImageError && item?.image_urls?.length
      ? { uri: item.image_urls[0] }
      : fallbackImage;

  const addedDate =
    typeof item?.addedOn?.toDate === "function"
      ? item.addedOn.toDate()
      : item?.addedOn;

  const openSource = () => {
    if (item?.url) {
      Linking.openURL(item.url);
    }
  };

  return (
    <View style={[styles.newsPage, { backgroundColor: colors.background }]}>
      {/* IMAGE */}
      <View style={styles.imageWrapper}>
        <Image
          source={imageSource}
          style={styles.newsFullImage}
          resizeMode="cover"
          onError={() => setHasImageError(true)}
        />

        {/* SOURCE – bottom right */}
        {item?.source ? (
          <TouchableOpacity style={styles.sourceBadge} onPress={openSource}>
            <Text allowFontScaling={false}  style={styles.sourceText}>{item.source}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* CONTENT BELOW IMAGE */}
      <View
        style={[
          styles.contentContainer,
          { backgroundColor: colors.surface },
        ]}
      >
        {/* TIME */}
        <Text allowFontScaling={false}  style={styles.timeAgo}>{timeAgo(addedDate)}</Text>

        {/* TITLE */}
        <Text allowFontScaling={false}  style={[styles.newsTitle, { color: colors.text }]}>
          {item?.title || "Untitled"}
        </Text>

        {/* SUMMARY */}
        <Text allowFontScaling={false}  style={[styles.newsSummary, { color: colors.text }]}>
          {item?.summary || "No summary available."}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  newsPage: {
    minHeight: PAGE_HEIGHT,
    width: "100%",
  },

  imageWrapper: {
    position: "relative",
  },

  newsFullImage: {
    width: "100%",
    height: 250,
    backgroundColor: "#000",
  },

  /* SOURCE BADGE */
  sourceBadge: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },

  sourceText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },

  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 18,
  },

  timeAgo: {
    fontSize: 12,
    color: "#888",
    marginBottom: 6,
  },

  newsTitle: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
    marginBottom: 10,
    marginTop:-10
  },

  newsSummary: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.9,
  },
});

export default NewsCard;
