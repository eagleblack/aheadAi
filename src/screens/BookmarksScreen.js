// BookmarksScreen.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from "react-native";
import Icon from "@react-native-vector-icons/material-icons";
import { Avatar } from "react-native-paper";
import { useTheme } from "../context/ThemeContext";
import { timeAgo } from "../utils/time";
import Hyperlink from "react-native-hyperlink";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchBookmarkedPosts,
  toggleLikeOptimistic,
  toggleBookmarkOptimistic,
} from "../store/bookMarkSlice";
import { toggleLike, toggleBookmark } from "../store/feedSlice";
import FullWidthImage from "../components/FullWidthImage";

const BookmarksScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const { bookmarks, loading, isLastBookmarkPage } = useSelector(
    (state) => state.bookmarks
  );

  const [expanded, setExpanded] = useState({});

  // Fetch initial bookmarks
  useEffect(() => {
    dispatch(fetchBookmarkedPosts());
  }, []);

  const loadMoreBookmarks = () => {
    if (!loading && !isLastBookmarkPage) {
      dispatch(fetchBookmarkedPosts({ loadMore: true }));
    }
  };

  const handleLike = (postId) => {
    dispatch(toggleLikeOptimistic({ postId }));
    dispatch(toggleLike(bookmarks.find((p) => p.id === postId)));
  };

  const handleBookmark = (postId) => {
    dispatch(toggleBookmarkOptimistic({ postId }));
    dispatch(toggleBookmark(bookmarks.find((p) => p.id === postId)));
  };

  const renderPost = ({ item }) => {
    const isExpanded = expanded[item.id] || false;
    const displayText = isExpanded
      ? item.content
      : item.content?.slice(0, 120) +
        (item.content?.length > 120 ? "..." : "");

    return (
      <View style={[styles.postContainer, { borderBottomColor: colors.surface }]}>
        {/* HEADER ROW */}
        <View style={styles.headerRow}>
          <Avatar.Image size={40} source={{ uri: item.user.avatar }} />

          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text }]}>
              {item.user.name}
            </Text>

            <Text style={[styles.userTagline, { color: colors.textSecondary }]}>
              {item.user.tagline}
            </Text>
          </View>

          <Text style={[styles.timeAgo, { color: colors.textSecondary }]}>
            {timeAgo(item.createdAt)}
          </Text>
        </View>

        {/* TEXT CONTENT */}
        {item.content && (
          <Hyperlink
            linkStyle={{
              color: colors.link,
              textDecorationLine: "underline",
            }}
            onPress={(url) => Linking.openURL(url)}
          >
            <Text
              style={[styles.postContent, { color: colors.text }]}
            >
              {displayText}
            </Text>
          </Hyperlink>
        )}

        {/* READ MORE */}
        {item.content?.length > 120 && (
          <TouchableOpacity
            onPress={() =>
              setExpanded((prev) => ({
                ...prev,
                [item.id]: !isExpanded,
              }))
            }
          >
            <Text style={[styles.readMore, { color: colors.primary }]}>
              {isExpanded ? "Read less" : "Read more"}
            </Text>
          </TouchableOpacity>
        )}

        {/* IMAGE */}
        {item.imageUrl && (
          <FullWidthImage uri={item.imageUrl} resizeMode="contain" />
        )}

        {/* ACTION BAR */}
        <View style={styles.actionRow}>
          {/* LIKE */}
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => handleLike(item.id)}
          >
            <Icon
              name={item.likedByCurrentUser ? "favorite" : "favorite-border"}
              size={22}
              color={
                item.likedByCurrentUser
                  ? colors.primary
                  : colors.textSecondary
              }
            />
            <Text style={[styles.actionText, { color: colors.text }]}>
              {item.totalLikes}
            </Text>
          </TouchableOpacity>

          {/* COMMENTS */}
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() =>
              navigation.navigate("Comments", {
                postId: item.id,
                creatorId: item.userId,
              })
            }
          >
            <Icon
              name="chat-bubble-outline"
              size={22}
              color={colors.textSecondary}
            />
            <Text style={[styles.actionText, { color: colors.text }]}>
              {item.totalComments}
            </Text>
          </TouchableOpacity>

          {/* SHARE */}
          <TouchableOpacity style={styles.actionItem}>
            <Icon name="share" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* BOOKMARK */}
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => handleBookmark(item.id)}
          >
            <Icon
              name={
                item.bookmarkedByCurrentUser
                  ? "bookmark"
                  : "bookmark-border"
              }
              size={22}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading && bookmarks.length === 0) {
    return (
      <View
        style={[
          styles.centered,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["top", "bottom"]}
    >
      {/* HEADER */}
      <View
        style={[
          styles.topHeader,
          { borderBottomColor: colors.surface },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ flexDirection: "row", alignItems: "center" }}
        >
          <Icon name="arrow-back" size={24} color={colors.text} />
          <Text
            style={[
              styles.headerTitle,
              { color: colors.text, marginLeft: 12 },
            ]}
          >
            Bookmarks
          </Text>
        </TouchableOpacity>
      </View>

      {/* LIST */}
      <FlatList
        data={bookmarks}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 50 }}
        onEndReached={loadMoreBookmarks}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() =>
          loading && bookmarks.length > 0 ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : null
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },

  /* HEADER */
  topHeader: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },

  /* POST STYLE */
  postContainer: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  userInfo: {
    marginLeft: 10,
    flex: 1,
  },
  userName: { fontSize: 15, fontWeight: "600" },
  userTagline: { fontSize: 12, marginTop: 1 },
  timeAgo: { fontSize: 12 },

  postContent: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "500",
    fontFamily: "Inter-Variable",
  },

  readMore: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: "600",
  },

  /* ACTION BAR */
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20,
  },
  actionText: {
    fontSize: 13,
    marginLeft: 6,
  },
});

export default BookmarksScreen;
