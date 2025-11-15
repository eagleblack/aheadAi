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
    !hasImageError && item?.image
      ? { uri: item.image }
      : fallbackImage;

  const handleOpenLink = async (url) => {
    try {
   Linking.openURL(url);
    } catch (e) {
      console.error("Error opening link:", e);
    }
  };

  const addedDate =
    typeof item?.addedOn?.toDate === "function"
      ? item.addedOn.toDate()
      : item?.addedOn;

  return (
    <View style={[styles.newsPage, { backgroundColor: colors.background }]}>
      {hasImageError?
       <Image
        source={imageSource}
        style={styles.newsFullImage}
        resizeMode="cover"
        onError={() => {
          console.log("❌ Image failed to load, showing fallback");
          setHasImageError(true);
        }}
      />:   <Image
        source={imageSource}
        style={styles.newsFullImage}
        resizeMode="cover"
        onError={() => {
          console.log("❌ Image failed to load, showing fallback");
          setHasImageError(true);
        }}
      />}
   

      {/* Overlay footer on image */}
      <View style={styles.newsHeaderOverlay}>
        <Text style={styles.timeAgoOverlay}>{timeAgo(addedDate)}</Text>
        <Text style={styles.newsTitleOverlay}>{item?.title || "Untitled"}</Text>
      </View>

      {/* Summary below image */}
      <View
        style={[
          styles.newsSummaryContainer,
          { backgroundColor: colors.surface },
        ]}
      >
        <Text style={[styles.newsSummary, { color: colors.text }]}>
          {item?.summary || "No summary available."}
        </Text>

        {item?.link ? (
          <TouchableOpacity
            style={styles.readMoreButton}
            onPress={() => handleOpenLink(item.link)}
          >
            <Text style={[styles.readMoreLink, { color: colors.primary }]}>
              Read more →
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  newsPage: {
    minHeight: PAGE_HEIGHT,
    width: "100%",
    flexDirection: "column",
  },
  newsFullImage: {
    width: "100%",
    height: 250,
    backgroundColor: "#000", // prevents white flash before image load
  },
  newsHeaderOverlay: {
    position: "absolute",
    top: 140,
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  timeAgoOverlay: {
    fontSize: 12,
    color: "#fff",
    marginBottom: 4,
  },
  newsTitleOverlay: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    lineHeight: 24,
  },
  newsSummaryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  newsSummary: {
    fontSize: 15,
    lineHeight: 21,
  },
  readMoreButton: {
    marginTop: 12,
  },
  readMoreLink: {
    fontWeight: "600",
    fontSize: 16,
  },
});

export default NewsCard;
