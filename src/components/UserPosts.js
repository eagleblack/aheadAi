// UserPosts.js
import React, { useEffect, useState } from "react";
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
import Icon from "react-native-vector-icons/MaterialIcons";
import Hyperlink from "react-native-hyperlink";
import { useTheme } from "../context/ThemeContext";
import { useDispatch, useSelector } from "react-redux";
import {
  listenToUserPosts,
  toggleLikeUserPost,
  toggleUserPostOptimistic,
} from "../store/userPostsSlice";
import { toggleLikeOptimistic } from "../store/feedSlice";
import firestore from "@react-native-firebase/firestore";
import { timeAgo } from "../utils/time";
import FullWidthImage from "./FullWidthImage";

export default function UserPosts({ navigation }) {
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const { posts, loading } = useSelector((state) => state.userPosts);
  const { user: userData } = useSelector((state) => state.user);

  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    if (posts.length === 0) {
      dispatch(listenToUserPosts());
    }
  }, [dispatch, posts.length]);

  const handleDeletePost = (postId) => {
    Alert.alert("Delete Post", "Are you sure you want to delete this post?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await firestore().collection("posts").doc(postId).delete();
          } catch (err) {
            console.error("❌ Error deleting post:", err);
          }
        },
      },
    ]);
  };

  if (loading) {
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

  const renderItem = ({ item }) => {
    const isExpanded = expanded[item.id] || false;
    const displayText = isExpanded
      ? item.content
      : item.content?.slice(0, 120) +
        (item.content?.length > 120 ? "..." : "");

    return (
      <View style={[styles.postContainer, { borderColor: colors.border }]}>
        {/* Left column: avatar + thread line */}
        <View style={styles.headerRow}>
        <Image
            source={{
              uri: userData.profilePic || "https://i.pravatar.cc/150",
            }}
            style={styles.avatar}
          />
         
                   <View style={styles.userInfo}>
                     <Text allowFontScaling={false}  style={[styles.userName, { color: colors.text }]}>
                       {userData?.name}
                     </Text>
         
                     
                   </View>
         
                   <Text allowFontScaling={false}  style={[styles.timeAgo, { color: colors.textSecondary }]}>
                     {timeAgo(item.createdAt)}
                   </Text>
        </View>

        {/* Right content section */}
        <View style={styles.tweetContent}>

        

        

          {/* Content */}
          {item.content && (
            <Hyperlink
              linkStyle={{
                color: colors.link,
                textDecorationLine: "underline",
              }}
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
              <Text allowFontScaling={false}  style={[styles.readMore, { color: colors.primary }]}>
                {isExpanded ? "Read less" : "Read more"}
              </Text>
            </TouchableOpacity>
          )}

          {/* Image */}
          {item.imageUrl && (
            <FullWidthImage uri={item.imageUrl} resizeMode="contain" />
          )}

          {/* Stats Row */}
          <View style={styles.actionsRow}>
            {/* Like */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                dispatch(toggleUserPostOptimistic({ postId: item.id }));
                dispatch(
                  toggleLikeOptimistic({ feedType: "recent", postId: item.id })
                );
                dispatch(
                  toggleLikeOptimistic({
                    feedType: "trending",
                    postId: item.id,
                  })
                );
                dispatch(toggleLikeUserPost(item));
              }}
            >
              <Icon
                name={
                  item.likedByCurrentUser ? "star" : "star-outline"
                }
                size={26}
                color={
                  item.likedByCurrentUser
                    ? colors.primary
                    : colors.textSecondary
                }
              />
              <Text allowFontScaling={false} 
                style={[styles.statsCount, { color: colors.text }]}
              >
                {item.totalLikes || 0}
              </Text>
            </TouchableOpacity>

            {/* Comments */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() =>
                navigation.navigate("Comments", {
                  postId: item.id,
                  creatorId: item.userId,
                })
              }
            >
             
              <Text allowFontScaling={false} 
                style={[styles.statsCount, { color: colors.text ,fontSize:16}]}
              >
                Reply
              </Text>
            </TouchableOpacity>

        

            {/* Delete */}
            <TouchableOpacity
              style={[styles.actionButton,{marginLeft:'auto'}]}
              onPress={() => handleDeletePost(item.id)}
            >
              <Icon
                name="delete-outline"
                size={26}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <FlatList
      data={posts}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingTop: 8 }}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },

  /* TWITTER STYLE LAYOUT */
  tweetContainer: {
    flexDirection: "row",
    paddingVertical: 14,
    paddingRight: 12,
    marginBottom: 6,

  },

  threadColumn: {
    width: 55,
    alignItems: "center",
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginBottom: 6,
  },

  threadLine: {
    width: 2,
    flex: 1,
    marginTop: 2,
    opacity: 0.6,
  },

  tweetContent: {
    flex: 1,
    paddingRight: 8,
  },

  tweetHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },

  userName: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Inter-Variable",
  },

  timeAgo: {
    marginLeft: 6,
    fontSize: 13,
    fontFamily: "Inter-Variable",
  },

  userTagline: {
    fontSize: 12,
    marginTop: -2,
    marginBottom: 4,
    fontFamily: "Inter-Variable",
  },

  postContent: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 21,
    fontFamily: "Inter-Variable",
  },

  readMore: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Inter-Variable",
  },

  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },

  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 18,
  },

  statsCount: {
    marginLeft: 5,
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Inter-Variable",
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
