import React, { useEffect, useState } from "react";
import { Image, View, StyleSheet, ActivityIndicator, Dimensions } from "react-native";

const SCREEN_WIDTH = Dimensions.get("window").width;
const MAX_HEIGHT = 400; // like LinkedIn posts

const FullWidthImage = ({ uri, borderRadius = 8, resizeMode = "contain" }) => {
  const [aspectRatio, setAspectRatio] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (uri) {
      Image.getSize(
        uri,
        (width, height) => {
          setAspectRatio(width / height);
          setLoading(false);
        },
        () => {
          setAspectRatio(1);
          setLoading(false);
        }
      );
    }
  }, [uri]);

  if (!uri) return null;

  const calculatedHeight = Math.min(SCREEN_WIDTH / aspectRatio, MAX_HEIGHT);

  return (
    <View style={[styles.container, { borderRadius }]}>
      {loading ? (
        <View style={[styles.loader, { height: MAX_HEIGHT, borderRadius }]}>
          <ActivityIndicator size="small" color="#888" />
        </View>
      ) : (
        <Image
          source={{ uri }}
          style={[styles.image, { height: calculatedHeight, borderRadius }]}
          resizeMode={resizeMode}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    overflow: "hidden",
    marginVertical: 10,
  },
  loader: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    width: "100%",
  },
  image: {
    width: "100%",
  },
});

export default FullWidthImage;
