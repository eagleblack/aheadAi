import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Alert,
} from "react-native";
import Icon from "@react-native-vector-icons/material-icons";
import { useTheme } from "../context/ThemeContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import { fetchComments, addComment, deleteComment } from "../store/commentsSlice";

const CommentScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { postId, creatorId } = route.params;

  const dispatch = useDispatch();
  const { commentsByPost, loading, addingComment, deletingComment } = useSelector(
    (state) => state.comments
  );
  const { user: userData } = useSelector((state) => state.user);

  const postState = commentsByPost[postId] || { comments: [], isLastPage: false };
  const postComments = postState.comments;
  const isLastPage = postState.isLastPage;

  const [newComment, setNewComment] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const flatListRef = useRef();

  useEffect(() => {
    if (!postComments.length) {
      dispatch(fetchComments({ postId }));
    }
  }, [dispatch, postId, postComments.length]);

  // ✅ Handle keyboard height dynamically
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) =>
      setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardHeight(0)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleSendComment = async () => {
    if (!newComment.trim() || addingComment) return;
    const text = newComment;
    setNewComment("");
    await dispatch(addComment({ postId, text, creatorId }));
    setTimeout(
      () => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }),
      100
    );
  };

  const handleLoadMore = async () => {
    if (loadingMore || isLastPage) return;
    setLoadingMore(true);
    await dispatch(fetchComments({ postId, loadMore: true }));
    setLoadingMore(false);
  };

  // 🔹 Confirm and delete comment
  const handleDelete = (commentId) => {
    Alert.alert("Delete Comment", "Are you sure you want to delete this comment?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => dispatch(deleteComment({ postId, commentId })),
      },
    ]);
  };

  const renderComment = ({ item }) => (
    <View style={[styles.commentCard, { backgroundColor: colors.surface }]}>
      <Image source={{ uri: item.user.avatar }} style={styles.avatar} />
      <View style={styles.commentContent}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={[styles.userName, { color: colors.text }]}>
            {item.user.name}
          </Text>

          {/* 🔹 Show delete icon only for comment owner */}
          {userData?.uid === item.userId && (
            <TouchableOpacity onPress={() => handleDelete(item.id)}>
              <Icon name="delete" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={[styles.commentText, { color: colors.textSecondary }]}>
          {item.text}
        </Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
        <View style={[styles.headerBar, { borderBottomColor: colors.surface }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ flexDirection: "row", alignItems: "center" }}
          >
            <Icon name="arrow-back" size={24} color={colors.text} />
            <Text
              style={[styles.headerTitle, { color: colors.text, marginLeft: 10 }]}
            >
              Comments
            </Text>
          </TouchableOpacity>
        </View>

        {/* Comments */}
        <View style={{ flex: 1 }}>
          {loading && postComments.length === 0 ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : postComments.length === 0 ? (
            <View style={styles.centered}>
              <Text style={{ color: colors.textSecondary }}>No comments yet</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              contentContainerStyle={{ padding: 16, paddingBottom: 10 }}
              data={postComments}
              keyExtractor={(item) => item.id}
              renderItem={renderComment}
              inverted
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.2}
              ListFooterComponent={
                loadingMore ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.primary}
                    style={{ marginVertical: 12 }}
                  />
                ) : null
              }
            />
          )}
        </View>

        {/* Input Bar */}
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.primary,
              paddingBottom: keyboardHeight > 0 ? keyboardHeight - 10 : 10,
            },
          ]}
        >
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Write a comment..."
            placeholderTextColor={colors.textSecondary}
            value={newComment}
            onChangeText={setNewComment}
            editable={!addingComment}
          />
          <TouchableOpacity
            onPress={handleSendComment}
            style={[
              styles.sendBtn,
              { backgroundColor: addingComment ? "#999" : "#4B7BE5" },
            ]}
            disabled={addingComment}
          >
            <Icon name="send" size={22} color="white" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

export default CommentScreen;

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  commentCard: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 10 },
  commentContent: { flex: 1 },
  userName: { fontWeight: "700", fontSize: 15, marginBottom: 2 },
  commentText: { fontSize: 14, lineHeight: 20 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1.5,
  },
  input: {
    flex: 1,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.05)",
    marginRight: 8,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
