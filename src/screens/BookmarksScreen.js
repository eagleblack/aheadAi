// BookmarksScreen.js
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Linking,
  ActivityIndicator,
} from "react-native";
import { Card, Avatar } from "react-native-paper";
import Icon from "@react-native-vector-icons/material-icons";
import { useTheme } from "../context/ThemeContext";
import { timeAgo } from "../utils/time";
import Hyperlink from "react-native-hyperlink";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchBookmarkedPosts,
  toggleLikeOptimistic,
  toggleBookmarkOptimistic,
} from "../store/bookMarkSlice"; // adjust path if needed
import { toggleLike, toggleBookmark } from "../store/feedSlice"; // for actual Firestore updates
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

  // Load more on scroll
  const loadMoreBookmarks = () => {
    if (!loading && !isLastBookmarkPage) {
      dispatch(fetchBookmarkedPosts({ loadMore: true }));
    }
  };

  // Optimistic like toggle
  const handleLike = (postId) => {
    dispatch(toggleLikeOptimistic({ postId }));
    dispatch(toggleLike(bookmarks.find((p) => p.id === postId)));
  
  };

  // Optimistic bookmark toggle
  const handleBookmark = (postId) => {
    dispatch(toggleBookmarkOptimistic({ postId }));
    dispatch(toggleBookmark(bookmarks.find((p) => p.id === postId)));
  };

  const renderPost = ({ item }) => {
    const isExpanded = expanded[item.id] || false;
    const displayText = isExpanded
      ? item.content
      : item.content?.slice(0, 100) + (item.content?.length > 100 ? "..." : "");

    return (
      <Card style={[styles.postCard, { backgroundColor: colors.surface }]}>
        <Card.Content>
          {/* Header */}
          <View style={styles.postHeader}>
            <View style={styles.userInfo}>
              <Avatar.Image size={40} source={{ uri: item.user.avatar }} />
              <View style={styles.userDetails}>
                <Text style={[styles.userName, { color: colors.text }]}>
                  {item.user.name}
                </Text>
                <Text style={[styles.userTagline, { color: colors.textSecondary }]}>
                  {item.user.tagline}
                </Text>
              </View>
            </View>
            <Text style={[styles.timeAgo, { color: colors.textSecondary }]}>
              {timeAgo(item.createdAt)}
            </Text>
          </View>

          {/* Content */}
          {item.content && (
            <Hyperlink
              linkStyle={{ color: colors.link, textDecorationLine: "underline" }}
              onPress={(url) => Linking.openURL(url)}
            >
              <Text style={[styles.postContent, { color: colors.text }]}>{displayText}</Text>
            </Hyperlink>
          )}

          {item.content?.length > 100 && (
            <TouchableOpacity
              onPress={() =>
                setExpanded((prev) => ({ ...prev, [item.id]: !isExpanded }))
              }
            >
              <Text style={{ color: colors.primary, marginTop: 4, fontWeight: "600" }}>
                {isExpanded ? "Read less" : "Read more"}
              </Text>
            </TouchableOpacity>
          )}

                        {item.imageUrl && <FullWidthImage uri={item.imageUrl} resizeMode="contain" />}

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => handleLike(item.id)}
              >
                <Icon
                  name={item.likedByCurrentUser ? "favorite" : "favorite-border"}
                  size={20}
                  color={item.likedByCurrentUser ? colors.primary : colors.textSecondary}
                />
                <Text style={[styles.statsText, { color: colors.text }]}>
                  {item.totalLikes}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => navigation.navigate("Comments",{postId:item.id,creatorId:item.userId})}
              >
                <Icon name="chat-bubble-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.statsText, { color: colors.text }]}>
                  {item.totalComments}
                </Text>
              </TouchableOpacity>

              <Icon
                name="share"
                size={20}
                color={colors.textSecondary}
                style={{ marginLeft: 12 }}
              />
            </View>

            <TouchableOpacity onPress={() => handleBookmark(item.id)}>
              <Icon
                name={item.bookmarkedByCurrentUser ? "bookmark" : "bookmark-border"}
                size={20}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>
        </Card.Content>
      </Card>
    );
  };

  if (loading && bookmarks.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center",backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top", "bottom"]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.headerBar, { borderBottomColor: colors.surface }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ flexDirection: "row", alignItems: "center" }}
          >
            <Icon name="arrow-back" size={24} color={colors.text} />
            <Text style={[styles.headerTitle, { color: colors.text, marginLeft: 10 }]}>
              Bookmarks
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={bookmarks}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16 }}
          onEndReached={loadMoreBookmarks}
          onEndReachedThreshold={0.5}
          ListFooterComponent={() =>
            loading && bookmarks.length > 0 ? <ActivityIndicator size="small" color={colors.primary} /> : null
          }
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  postCard: { marginBottom: 16, borderRadius: 12, elevation: 3 },
  postHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  userInfo: { flexDirection: "row", alignItems: "center" },
  userDetails: { marginLeft: 10 },
  userName: { fontWeight: "bold", fontSize: 15 },
  userTagline: { fontSize: 12 },
  timeAgo: { fontSize: 12 },
  postContent: { marginVertical: 8, fontFamily: "Inter-Variable", fontWeight: "700", fontSize: 15, lineHeight: 21 },

  postImage: { width: "100%", height: 200, borderRadius: 12, marginTop: 8 },
  statsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  actionsRow: { flexDirection: "row", alignItems: "center" },
  actionItem: { flexDirection: "row", alignItems: "center", marginRight: 16 },
  statsText: { fontSize: 12, marginLeft: 4 },
  headerBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: "700" },
});

export default BookmarksScreen;
