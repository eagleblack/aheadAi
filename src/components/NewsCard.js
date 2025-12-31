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
import Icon from "react-native-vector-icons/MaterialIcons";
import SIcon from "react-native-vector-icons/SimpleLineIcons";

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
          <View style={styles.headerRow}>
            
              <Avatar.Image
                size={42}
                source={{ uri: item.user.profilePic || "https://i.pravatar.cc/150" }}
              />
              <View style={styles.userInfo}>
                <Text allowFontScaling={false}  style={[styles.userName, { color: colors.text }]}>
                  {item.user.name || "Anonymous"}
                </Text>
             
              </View>
          
            <Text allowFontScaling={false}  style={[styles.timeAgo, { color: colors.textSecondary }]}>
              {timeAgo(item.createdAt)}
            </Text>
          </View>

          {/* Content */}
          {item.content && (
            <Hyperlink
              linkStyle={{ color: colors.link, textDecorationLine: "underline" }}
              onPress={(url) => Linking.openURL(url)}
            >
              <Text allowFontScaling={false}  style={[styles.postContent, { color: colors.text }]}>
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
              <Text allowFontScaling={false}  style={styles.readMoreText}>
                {isExpanded ? "Read less" : "Read more"}
              </Text>
            </TouchableOpacity>
          )}

          {/* Image */}
               {item.imageUrl && <FullWidthImage uri={item.imageUrl} resizeMode="contain" />}


          {/* Stats */}
          <View style={styles.actionRow}>
          
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
                  name={item.likedByCurrentUser ? "star" : "star-outline"}
                  size={26}
                  color={item.likedByCurrentUser ? colors.primary : colors.textSecondary}
                />
                <Text allowFontScaling={false}  style={[styles.statsText, { color: colors.text }]}>
                  {item.totalLikes || 0}
                </Text>
              </TouchableOpacity>

              {/* Comment */}
              <TouchableOpacity style={styles.actionItem}    onPress={() => navigation.navigate("Comments",{postId:item.id,creatorId:item.userId})}>
              
                <Text allowFontScaling={false}  style={[styles.statsText, { color: colors.text,fontSize:16 }]}>
                 Reply
                </Text>
              </TouchableOpacity>

      

              {/* Bookmark */}
              <TouchableOpacity
                style={[styles.actionItem,{marginLeft:'auto'}]}
                onPress={() => {
                  dispatch(toggleBookmarkOptimistic({ postId: item.id }));
                  dispatch(toggleBookmark(item));
                }}
              >
                <SIcon
                  name={item.bookmarkedByCurrentUser ? "pin" : "pin"}
                  size={24}
                  color={item.bookmarkedByCurrentUser ? colors.primary : colors.textSecondary}
                />
              </TouchableOpacity>
          
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
        <Text allowFontScaling={false}  style={{ color: colors.text, fontSize: 16 }}>No posts yet</Text>
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
    fontSize: 16,
    lineHeight: 22,
    fontWeight: 600,
    fontFamily: "Inter",
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

