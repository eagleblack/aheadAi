// HomeScreen.js
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Linking,
} from "react-native";
import { FAB } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import Icon from "@react-native-vector-icons/material-icons";
import Hyperlink from "react-native-hyperlink";
import { useTheme } from "../context/ThemeContext";
import CustomHeader from "../components/CustomHeader";
import CustomHeaderTabs from "../components/CustomHeaderTabs";

import FullWidthImage from "../components/FullWidthImage";
import NewsCard from "../components/NewsCard";
import { timeAgo } from "../utils/time";
import { Animated } from "react-native";

import {
  fetchTrendingPosts,
  fetchRecentPosts,
  toggleBookmark,
  toggleBookmarkOptimistic,
  toggleLike,
  toggleLikeOptimistic,
} from "../store/feedSlice";

import {
  fetchInitialNews,
  fetchMoreNews,
  refreshNews,
  clearNews,
} from "../store/newsSlice";
import { useNavigation } from "@react-navigation/native";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const BOTTOM_TAB_HEIGHT = 60;
const PAGE_HEIGHT = SCREEN_HEIGHT - BOTTOM_TAB_HEIGHT;

const HomeScreenUser = ({  }) => {
  const navigation=useNavigation()
  const { colors } = useTheme();
  const dispatch = useDispatch();

const scrollY = useRef(new Animated.Value(0)).current;
const headerHeight = scrollY.interpolate({
  inputRange: [0, 60], // adjust threshold
  outputRange: [60, 0],
  extrapolate: "clamp",
});  

const tabsOpacity = scrollY.interpolate({
  inputRange: [0, 60],
  outputRange: [0, 1],  
  extrapolate: "clamp",
});
const headerTranslate = scrollY.interpolate({
  inputRange: [0, 60],
  outputRange: [0, -60], // move up as header collapses
  extrapolate: "clamp",
});
const [tabsVisible, setTabsVisible] = useState(false);

useEffect(() => {
  const listener = scrollY.addListener(({ value }) => {
    setTabsVisible(value > 60); // same threshold as your headerHeight/tabsOpacity
  });
  return () => scrollY.removeListener(listener);
}, []);
  const feed = useSelector((state) => state.feed);
  const { news, loadingInitial: isFetchingNews, hasMore } = useSelector(
    (state) => state.news
  );
  const { user: userData } = useSelector((state) => state.user);

  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("Post");
  const [expanded, setExpanded] = useState({});

  const recentListRef = useRef(null);
  const trendingListRef = useRef(null);
  const newsListRef = useRef(null);

  const recentOffsetRef = useRef(0);
  const trendingOffsetRef = useRef(0);
  const newsOffsetRef = useRef(0);

  // Initial fetch
  useEffect(() => {
    dispatch(fetchRecentPosts());
    dispatch(fetchTrendingPosts());
    dispatch(fetchInitialNews());
    return () => dispatch(clearNews());
  }, [dispatch]);

  // Refresh control
  const onRefresh = async () => {
    setRefreshing(true);
    if (activeTab === "News") await dispatch(refreshNews());
    else if (activeTab === "Trending") await dispatch(fetchTrendingPosts());
    else await dispatch(fetchRecentPosts());
    setRefreshing(false);
  };

  // Pagination
  const loadMorePosts = useCallback(() => {
    const current = activeTab === "Trending" ? feed.trending : feed.recent;
    if (!current.isFetching && !current.isLastPage) {
      dispatch(
        activeTab === "Trending"
          ? fetchTrendingPosts({ loadMore: true })
          : fetchRecentPosts({ loadMore: true })
      );
    }
  }, [activeTab, feed, dispatch]);

  const loadMoreNews = () => {
    if (!isFetchingNews && hasMore) dispatch(fetchMoreNews());
  };

  // Like / Bookmark handlers
  const handleLike = useCallback(
    (post) => {
      dispatch(toggleLikeOptimistic({ feedType: "recent", postId: post.id }));
      dispatch(toggleLikeOptimistic({ feedType: "trending", postId: post.id }));
      dispatch(toggleLike(post));
    },
    [dispatch]
  );

  const handleBookmark = useCallback(
    (post) => {
      dispatch(toggleBookmarkOptimistic({ feedType: "recent", postId: post.id }));
      dispatch(toggleBookmarkOptimistic({ feedType: "trending", postId: post.id }));
      dispatch(toggleBookmark(post));
    },
    [dispatch]
  );

  // Track scroll offset
  const onRecentScroll = (e) =>
    (recentOffsetRef.current = e.nativeEvent.contentOffset.y);
  const onTrendingScroll = (e) =>
    (trendingOffsetRef.current = e.nativeEvent.contentOffset.y);
  const onNewsScroll = (e) =>
    (newsOffsetRef.current = e.nativeEvent.contentOffset.y);

  // Restore scroll position with delay
  useEffect(() => {
    const timeout = setTimeout(() => {
      let ref, offset;
      if (activeTab === "Post") {
        ref = recentListRef;
        offset = recentOffsetRef.current;
      } else if (activeTab === "Trending") {
        ref = trendingListRef;
        offset = trendingOffsetRef.current;
      } else {
        ref = newsListRef;
        offset = newsOffsetRef.current;
      }

      if (ref?.current) {
        try {
          ref.current.scrollToOffset({ offset, animated: false });
        } catch {}
      }
    }, 60);

    return () => clearTimeout(timeout);
  }, [activeTab]);

  // Render post
  const renderPost = useCallback(
    ({ item }) => {
      const isExpanded = expanded[item.id] || false;
      const contentPreview =
        item.content?.length > 120 && !isExpanded
          ? item.content.slice(0, 120) + "..."
          : item.content;

      return (
        <View style={[styles.postCard, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <TouchableOpacity
            style={styles.postHeader}
            onPress={() =>
              item?.user.uid === userData.uid
                ? navigation.navigate("Profile")
                : navigation.navigate("OtherProfile", { uid: item?.user.uid })
            }
          >
            <View style={styles.userInfo}>
              <Image source={{ uri: item.user.avatar }} style={styles.avatar} />
              <View style={styles.userDetails}>
                <Text style={[styles.userName, { color: colors.text }]}>
                  {item.user.name}
                </Text>
                <Text
                  style={[styles.userTagline, { color: colors.textSecondary }]}
                >
                  {item.user?.tagline ?? "New on Ahead"}
                </Text>
              </View>
            </View>
            <Text style={[styles.timeAgo, { color: colors.textSecondary }]}>
              {timeAgo(item.createdAt)}
            </Text>
          </TouchableOpacity>

          {/* Content */}
          {item.content && (
            <Hyperlink
              linkStyle={{ color: colors.link, textDecorationLine: "underline" }}
              onPress={(url) => Linking.openURL(url)}
            >
              <Text style={[styles.postContent, { color: colors.text }]}>
                {contentPreview}
              </Text>
            </Hyperlink>
          )}

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

          {item.imageUrl && (
            <FullWidthImage uri={item.imageUrl} resizeMode="contain" />
          )}

          {/* Actions */}
          <View style={styles.statsRow}>
            <View style={styles.actionsRow}>
              {/* Like */}
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => handleLike(item)}
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
                <Text style={[styles.statsText, { color: colors.text,fontWeight:800 }]}>
                  {item.totalLikes || 0}
                </Text>
              </TouchableOpacity>

              {/* Comment */}
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
                <Text style={[styles.statsText, { color: colors.text,fontWeight:800 }]}>
                  {item.totalComments || 0}
                </Text>
              </TouchableOpacity>

              <Icon
                name="share"
                size={22}
                color={colors.textSecondary}
                style={{ marginLeft: 12 }}
              />
            </View>

            {/* Bookmark */}
            <TouchableOpacity onPress={() => handleBookmark(item)}>
              <Icon
                name={
                  item.bookmarkedByCurrentUser ? "bookmark" : "bookmark-border"
                }
                size={22}
                color={
                  item.bookmarkedByCurrentUser
                    ? colors.primary
                    : colors.textSecondary
                }
              />
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [colors, expanded, handleBookmark, handleLike, navigation, userData.uid]
  );

  const renderNews = useCallback(
    ({ item }) => <NewsCard item={item} colors={colors} />,
    [colors]
  );

  // Selectors
  const currentFeed = activeTab === "Trending" ? feed.trending : feed.recent;
  const postList = currentFeed.posts || [];
  const isFetching =
    activeTab === "Trending" ? feed.trending.isFetching : feed.recent.isFetching;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.container}>
   {/* === HEADER SECTION === */}
<Animated.View
  style={{
    height: headerHeight,
    overflow: "hidden",
    opacity: headerHeight.interpolate({
      inputRange: [0, 60],
      outputRange: [0, 1],
      extrapolate: "clamp",
    }),
  }}
>
  <CustomHeader activeTab={activeTab} setActiveTab={setActiveTab} />
</Animated.View>

{/* === TABS SECTION (always visible but shifts position) === */}
<Animated.View
  style={{
    position: "absolute",
    top: headerHeight.interpolate({
      inputRange: [0, 60],
      outputRange: [0, 60], // when header collapses, tabs stay pinned
      extrapolate: "clamp",
    }),
    left: 0,
    right: 0,
    zIndex: 10,
   
  }}
>
  <CustomHeaderTabs
    tabs={["Post", "News", "Trending"]}
    activeTab={activeTab}
    setActiveTab={setActiveTab}
    colors={colors}
  />
</Animated.View>



        <View style={styles.content}>
          {/* --- POST LIST --- */}
          <Animated.View
  style={{
    
    transform: [{ translateY: headerTranslate }],
    marginTop: 60, // initial static padding for header height
  }}
>
          <FlatList
            ref={recentListRef}
            style={{ display: activeTab === "Post" ? "flex" : "none" }}
            data={feed.recent.posts}
            renderItem={renderPost}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
            onEndReached={loadMorePosts}
            onEndReachedThreshold={0.5}
            
           onScroll={Animated.event(
  [{ nativeEvent: { contentOffset: { y: scrollY } } }],
  {
    useNativeDriver: false,
    listener: (e) => {
      recentOffsetRef.current = e.nativeEvent.contentOffset.y;
    },
  }
)}
  scrollEventThrottle={16}
            contentContainerStyle={{ paddingBottom: 65 }}
            ListEmptyComponent={
              isFetching ? (
                <ActivityIndicator
                  size="large"
                  color={colors.primary}
                  style={{ marginTop: 50 }}
                />
              ) : (
                <View style={{ alignItems: "center", marginTop: 40 }}>
                  <Text style={{ color: colors.textSecondary }}>
                    No posts found
                  </Text>
                </View>
              )
            }
            ListFooterComponent={
              isFetching && postList.length > 0 ? (
                <ActivityIndicator
                  size="small"
                  color={colors.primary}
                  style={{ marginVertical: 16 }}
                />
              ) : null
            }
          />
</Animated.View>
          {/* --- TRENDING LIST --- */}
          <FlatList
            ref={trendingListRef}
            style={{ display: activeTab === "Trending" ? "flex" : "none" }}
            data={feed.trending.posts}
            renderItem={renderPost}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            onEndReached={loadMorePosts}
            onEndReachedThreshold={0.5}
         onScroll={Animated.event(
  [{ nativeEvent: { contentOffset: { y: scrollY } } }],
  {
    useNativeDriver: false,
    listener: (e) => {
      trendingOffsetRef.current = e.nativeEvent.contentOffset.y;
    },
  }
)}
  scrollEventThrottle={16}
            contentContainerStyle={{ paddingBottom: 65 }}
          />

          {/* --- NEWS LIST --- */}
          <FlatList
            ref={newsListRef}
            style={{ display: activeTab === "News" ? "flex" : "none" }}
            data={news}
            renderItem={renderNews}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            onEndReached={loadMoreNews}
            onEndReachedThreshold={0.5}
            showsVerticalScrollIndicator={false}
            pagingEnabled
            snapToInterval={PAGE_HEIGHT}
            snapToAlignment="start"
            decelerationRate="fast"
            disableIntervalMomentum={true}
            onScroll={Animated.event(
  [{ nativeEvent: { contentOffset: { y: scrollY } } }],
  {
    useNativeDriver: false,
    listener: (e) => {
      newsOffsetRef.current = e.nativeEvent.contentOffset.y;
    },
  }
)}
  scrollEventThrottle={16}
          />
        </View>

        {activeTab === "Post" && (
          <FAB
            icon="pencil"
            onPress={() => navigation.navigate("AddPost")}
            style={[styles.fab, { backgroundColor: colors.primary }]}
            color="#fff"
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  postCard: { margin: 6, marginHorizontal: 12, padding: 12, borderRadius: 8 },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  userInfo: { flexDirection: "row", alignItems: "center" },
  userDetails: { marginLeft: 10 },
  userName: { fontWeight: "600", fontSize: 16 },
  userTagline: { fontWeight: "400", fontSize: 12 },
  timeAgo: { fontWeight: "400", fontSize: 12 },
  postContent: {
    marginVertical: 8,
    fontFamily: "Inter-Variable",
    fontWeight: "700",
    fontSize: 15,
    lineHeight: 21,
  },
  readMoreText: { color: "#1e88e5", fontWeight: "500", marginTop: 4 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  actionsRow: { flexDirection: "row", alignItems: "center" },
  actionItem: { flexDirection: "row", alignItems: "center", marginRight: 18 },
  statsText: { fontWeight: "500", fontSize: 13, marginLeft: 6 },
  fab: {
    position: "absolute",
    bottom: 80,
    right: 20,
    elevation: 6,
    zIndex: 1000,
  },
});

export default HomeScreenUser;
