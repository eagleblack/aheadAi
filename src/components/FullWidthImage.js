import React, { useEffect, useState } from "react";
import { Image, View, StyleSheet, ActivityIndicator, Dimensions } from "react-native";

const SCREEN_WIDTH = Dimensions.get("window").width;
const MAX_HEIGHT = 400; // like LinkedIn

const FullWidthImage = ({ uri, borderRadius = 8, resizeMode = "contain" }) => {
  const [aspectRatio, setAspectRatio] = useState(null);

  useEffect(() => {
    if (uri) {
      Image.getSize(
        uri,
        (width, height) => setAspectRatio(width / height),
        () => setAspectRatio(1)
      );
    }
  }, [uri]);

  if (!uri) return null;

  // Still loading image dimensions
  if (aspectRatio === null) {
    return (
      <View style={[styles.loaderWrapper, { borderRadius }]}>
        <ActivityIndicator size="small" color="#888" />
      </View>
    );
  }

  const isPortrait = aspectRatio < 1;

  const calculatedHeight = isPortrait
    ? Math.min(SCREEN_WIDTH / aspectRatio, MAX_HEIGHT)
    : SCREEN_WIDTH / aspectRatio;

  return (
    <View style={{ marginVertical: 2 }}>
      <View style={[styles.imageWrapper, { borderRadius }]}>
        <Image
          source={{ uri }}
          style={{ width: "100%", height: calculatedHeight, borderRadius }}
          resizeMode={"cover"}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  imageWrapper: {
    width: "100%",
    overflow: "hidden",
    marginVertical:2
  },
  loaderWrapper: {
    width: "100%",
    height: MAX_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    marginVertical: 2,
  },
});

export default FullWidthImage;
