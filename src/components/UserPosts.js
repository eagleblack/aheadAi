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
import { Card, Avatar } from "react-native-paper";
import Icon from "@react-native-vector-icons/material-icons";
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

export default function UserPosts({navigation}) {
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
    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete this post?",
      [
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
      ]
    );
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
        <Text style={{ color: colors.text, fontSize: 16 }}>No posts yet</Text>
      </View>
    );
  }

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
                source={{ uri: userData.profilePic || "https://i.pravatar.cc/150" }}
              />
              <View style={styles.userDetails}>
                <Text style={[styles.userName, { color: colors.text }]}>
                  {userData.name || "Anonymous"}
                </Text>
                <Text style={[styles.userTagline, { color: colors.textSecondary }]}>
                  {userData?.profileTitle || "New on Ahead"}
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
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => {
                  dispatch(toggleUserPostOptimistic({ postId: item.id }));
                       dispatch(toggleLikeOptimistic({ feedType: 'recent', postId: item.id }));
                       dispatch(toggleLikeOptimistic({ feedType:'trending', postId: item.id }));

                  dispatch(toggleLikeUserPost(item));
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

              <TouchableOpacity style={styles.actionItem}    onPress={() => navigation.navigate("Comments",{postId:item.id,creatorId:item.userId})}>
                <Icon name="chat-bubble-outline" size={22} color={colors.textSecondary} />
                <Text style={[styles.statsText, { color: colors.text }]}>
                  {item.totalComments || 0}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionItem}>
                <Icon name="share" size={22} color={colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => handleDeletePost(item.id)}
              >
                <Icon name="delete-outline" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <FlatList
      data={posts}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 8}}
      showsVerticalScrollIndicator={false}
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
