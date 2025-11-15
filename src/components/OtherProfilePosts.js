// OtherProfilePosts.js
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from "react-native";
import { Card, Avatar } from "react-native-paper";
import Icon from "@react-native-vector-icons/material-icons";
import Hyperlink from "react-native-hyperlink";
import { useTheme } from "../context/ThemeContext";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchOtherProfilePosts,
  refreshOtherProfilePosts,
  toggleLike,
  toggleBookmark,
  toggleLikeOptimisticotherprofile,
  toggleBookmarkOptimistic,
  clearPosts,
} from "../store/otherProfilePostSlice";
import { timeAgo } from "../utils/time";
import { toggleLikeOptimistic } from "../store/feedSlice";
import FullWidthImage from "./FullWidthImage";

export default function OtherProfilePosts({ navigation, otherUserId }) {
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const { posts, isFetching, lastPostFetched, isLastPage } = useSelector(
    (state) => state.otherProfilePost
  );
  console.log(otherUserId)
  const [expanded, setExpanded] = useState({});

  // Fetch initial posts
useEffect(() => {
  dispatch(fetchOtherProfilePosts({ profileUserId: otherUserId }));
}, [dispatch, otherUserId]);

  // Handle load more on scroll
  const handleLoadMore = () => {
    if (!isFetching && !isLastPage) {
      dispatch(
        fetchOtherProfilePosts({ profileUserId: otherUserId, loadMore: true })
      );
    }
  };

  // Refresh posts
  const handleRefresh = () => {
    dispatch(refreshOtherProfilePosts({ profileUserId: otherUserId }));
  };

  const renderItem = ({ item }) => {
    const isExpanded = expanded[item.id] || false;
    const displayText = isExpanded
      ? item.content
      : item.content?.slice(0, 120) + (item.content?.length > 120 ? "..." : "");

    return (
      <Card style={[styles.postCard, { backgroundColor: colors.surface }]}>
        <Card.Content>
          {/* Header */}
          <View style={styles.postHeader}>
            <View style={styles.userInfo}>
              <Avatar.Image
                size={42}
                source={{ uri: item.user.profilePic || "https://i.pravatar.cc/150" }}
              />
              <View style={styles.userDetails}>
                <Text style={[styles.userName, { color: colors.text }]}>
                  {item.user.name || "Anonymous"}
                </Text>
                <Text style={[styles.userTagline, { color: colors.textSecondary }]}>
                  {item.user.tagline || "New on Ahead"}
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
              <Text style={[styles.postContent, { color: colors.text }]}>
                {displayText}
              </Text>
            </Hyperlink>
          )}

          {/* Read More */}
          {item.content?.length > 120 && (
            <TouchableOpacity
              onPress={() =>
                setExpanded((prev) => ({ ...prev, [item.id]: !isExpanded }))
              }
            >
              <Text style={styles.readMoreText}>
                {isExpanded ? "Read less" : "Read more"}
              </Text>
            </TouchableOpacity>
          )}

          {/* Image */}
               {item.imageUrl && <FullWidthImage uri={item.imageUrl} resizeMode="contain" />}


          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.actionsRow}>
              {/* Like */}
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => {
                  dispatch(toggleLikeOptimisticotherprofile({ postId: item.id }));
                  dispatch(toggleLike(item));
                                    dispatch(toggleLikeOptimistic({ postId: item.id }));
                  
                }}
              >
                <Icon
                  name={item.likedByCurrentUser ? "favorite" : "favorite-border"}
                  size={22}
                  color={item.likedByCurrentUser ? colors.primary : colors.textSecondary}
                />
                <Text style={[styles.statsText, { color: colors.text }]}>
                  {item.totalLikes || 0}
                </Text>
              </TouchableOpacity>

              {/* Comment */}
              <TouchableOpacity style={styles.actionItem}    onPress={() => navigation.navigate("Comments",{postId:item.id,creatorId:item.userId})}>
                <Icon name="chat-bubble-outline" size={22} color={colors.textSecondary} />
                <Text style={[styles.statsText, { color: colors.text }]}>
                  {item.totalComments || 0}
                </Text>
              </TouchableOpacity>

              {/* Share */}
              <TouchableOpacity style={styles.actionItem}>
                <Icon name="share" size={22} color={colors.textSecondary} />
              </TouchableOpacity>

              {/* Bookmark */}
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => {
                  dispatch(toggleBookmarkOptimistic({ postId: item.id }));
                  dispatch(toggleBookmark(item));
                }}
              >
                <Icon
                  name={item.bookmarkedByCurrentUser ? "bookmark" : "bookmark-outline"}
                  size={22}
                  color={item.bookmarkedByCurrentUser ? colors.primary : colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  if (isFetching && posts.length === 0) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (posts.length === 0) {
    return (
      <View style={styles.loader}>
        <Text style={{ color: colors.text, fontSize: 16 }}>No posts yet</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={posts}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding:8 }}
      showsVerticalScrollIndicator={false}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.3}
      refreshing={isFetching}
      onRefresh={handleRefresh}
    />
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },

  postCard: {
    marginBottom: 16,
    borderRadius: 14,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },

  postHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  userInfo: { flexDirection: "row", alignItems: "center" },
  userDetails: { marginLeft: 10 },
  userName: { fontFamily: "Inter-Variable", fontWeight: "600", fontSize: 16 },
  userTagline: { fontFamily: "Inter-Variable", fontWeight: "400", fontSize: 12 },
  timeAgo: { fontFamily: "Inter-Variable", fontWeight: "400", fontSize: 12 },

  postContent: { marginVertical: 8, fontFamily: "Inter-Variable", fontWeight: "700", fontSize: 15, lineHeight: 21 },

  readMoreText: { color: "#1e88e5", fontFamily: "Inter-Variable", fontWeight: "500", marginTop: 4 },

  postImage: {
    height: 200,
    marginVertical: 10,
    marginLeft: -16,
    marginRight: -16,
    borderRadius: 0,
  },

  statsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14 },
  actionsRow: { flexDirection: "row", alignItems: "center" },
  actionItem: { flexDirection: "row", alignItems: "center", marginRight: 18 },
  statsText: { fontFamily: "Inter-Variable", fontWeight: "500", fontSize: 13, marginLeft: 6 },
});
