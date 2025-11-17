// FollowingScreen.js
import React, { useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import firestore,{FieldValue} from "@react-native-firebase/firestore";
import auth from "@react-native-firebase/auth";
import { useTheme } from "../context/ThemeContext";
import Icon from "@react-native-vector-icons/material-icons";
import { useNavigation } from "@react-navigation/native";
import { fetchFollowing, resetFollowing } from "../store/followersSlice";

const FollowingScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { colors } = useTheme();

  const currentUser = auth().currentUser;
  const { following, loading, hasMore, lastFetchedDoc } = useSelector(
    (state) => state.followers
  );

  // --- Initial Fetch ---
  useEffect(() => {
    if (currentUser?.uid) {
      dispatch(resetFollowing());
      dispatch(fetchFollowing({ startAfterDoc: null }));
    }
  }, [dispatch, currentUser?.uid]);

  // --- Load More for Pagination ---
  const loadMore = () => {
    if (!loading && hasMore) {
      dispatch(fetchFollowing({ startAfterDoc: lastFetchedDoc }));
    }
  };

  // --- Pull to Refresh ---
  const onRefresh = useCallback(() => {
    dispatch(resetFollowing());
    dispatch(fetchFollowing({ startAfterDoc: null }));
  }, [dispatch]);

  // --- Follow / Unfollow Toggle ---
  const toggleFollow = async (targetUserId, isFollowing) => {
    if (!currentUser?.uid || targetUserId === currentUser.uid) return;

    const followId = `${currentUser.uid}_${targetUserId}`;
    const followRef = firestore().collection("follows").doc(followId);

    try {
      if (isFollowing) {
        await followRef.delete();
      } else {
        await followRef.set({
          followerId: currentUser.uid,
          followingId: targetUserId,
          followedAt: FieldValue.serverTimestamp(),
        });
      }
      dispatch(resetFollowing());
      dispatch(fetchFollowing({ startAfterDoc: null }));
    } catch (error) {
      console.log("Error toggling follow:", error);
    }
  };

  // --- Render Each User Card ---
  const renderUserItem = ({ item }) => {
    const profilePic = item?.profilePic || item?.ProfileUrl || null;
    const displayName = item?.name || item?.username || "Unknown User";

    return (
      <TouchableOpacity
        style={[
          styles.userCard,
          { borderBottomColor: colors.surface },
        ]}
        onPress={()=>{  navigation.navigate("OtherProfile", { uid: item?.uid });}}
      >
        <Image
          source={
            profilePic
              ? { uri: profilePic }
              : require("../assets/logo_svg.png")
          }
          style={styles.avatar}
        />
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: colors.text }]}>
            {displayName}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.followBtn,
            {
              backgroundColor: "#fff",
              borderColor: colors.primary,
            },
          ]}
          onPress={() => toggleFollow(item.id, true)}
        >
          <Text style={[styles.followText, { color: colors.primary }]}>
            Following
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      <View
        style={[
          styles.header,
          { borderBottomColor: colors.surface, backgroundColor: colors.background },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          My Connections
        </Text>
        <View style={{ width: 40 }} />
      </View>

   
      {loading && following.length === 0 ? (
        <ActivityIndicator
          size="large"
          style={{ marginTop: 50 }}
          color={colors.primary}
        />
      ) : (
        <FlatList
          data={following}
          keyExtractor={(item) => item.id}
          renderItem={renderUserItem}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListFooterComponent={
            loading && following.length > 0 ? (
              <ActivityIndicator
                size="small"
                style={{ marginVertical: 16 }}
                color={colors.primary}
              />
            ) : null
          }
          ListEmptyComponent={
            !loading ? (
              <View style={{ alignItems: "center", marginTop: 50 }}>
                <Text style={{ color: colors.text }}>No following found</Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
};

export default FollowingScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  backButton: {
    width: 40,
    alignItems: "flex-start",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },

  userCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 0.5,
  },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  userInfo: { flex: 1, marginLeft: 12 },
  userName: { fontSize: 16, fontWeight: "600" },
  followBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  followText: { fontWeight: "600" },
});
