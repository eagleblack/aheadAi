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

const HEADER_MAX = 50;
const TABS_HEIGHT = 50;

const HomeScreenUser = () => {
const navigation = useNavigation();
const { colors } = useTheme();
const dispatch = useDispatch();

const scrollY = useRef(new Animated.Value(0)).current;
const lastScrollY = useRef(0);
const headerAnim = useRef(new Animated.Value(0)).current; // 0 = shown, 1 = hidden
// HEADER COLLAPSE ANIMATION
const headerTranslateY = headerAnim.interpolate({
inputRange: [0, 1],
outputRange: [0, -HEADER_MAX],
});
const headerOpacity = headerAnim.interpolate({
inputRange: [0, 1],
outputRange: [1, 0],
});

const feed = useSelector((state) => state.feed);
const { news, loadingInitial: isFetchingNews, hasMore } = useSelector(
(state) => state.news
);
const { user: userData } = useSelector((state) => state.user);

const [refreshing, setRefreshing] = useState(false);
const [activeTab, setActiveTab] = useState("Post");

const recentListRef = useRef(null);
const trendingListRef = useRef(null);
const newsListRef = useRef(null);

const recentOffsetRef = useRef(0);
const trendingOffsetRef = useRef(0);
const newsOffsetRef = useRef(0);
const scrollPositions = useRef({
Post: 0,
Trending: 0,
News: 0,
});
// Initial fetch
useEffect(() => {
dispatch(fetchRecentPosts());
dispatch(fetchTrendingPosts());
dispatch(fetchInitialNews());
return () => dispatch(clearNews());
}, []);

const onRefresh = async () => {
setRefreshing(true);
if (activeTab === "News") await dispatch(refreshNews());
else if (activeTab === "Trending") await dispatch(fetchTrendingPosts());
else await dispatch(fetchRecentPosts());
setRefreshing(false);
};
Text.render = (function (render) {
  return function (...args) {
    let originText = render.apply(this, args);
    console.log("Font Family used:", originText.props.style?.fontFamily);
    return originText;
  };
})(Text.render);
// Pagination
const loadMorePosts = () => {
const data = activeTab === "Trending" ? feed.trending : feed.recent;
if (!data.isFetching && !data.isLastPage) {
dispatch(
activeTab === "Trending"
? fetchTrendingPosts({ loadMore: true })
: fetchRecentPosts({ loadMore: true })
);
}
};
useEffect(() => {
const targetOffset = scrollPositions.current[activeTab] || 0;

// Scroll list to saved position
if (activeTab === "Post" && recentListRef.current) {
recentListRef.current.scrollToOffset({
offset: targetOffset,
animated: false,
});
}

if (activeTab === "Trending" && trendingListRef.current) {
trendingListRef.current.scrollToOffset({
offset: targetOffset,
animated: false,
});
}

if (activeTab === "News" && newsListRef.current) {
newsListRef.current.scrollToOffset({
offset: targetOffset,
animated: false,
});
}

// Reset scrollY so header reappears correctly
scrollY.setValue(targetOffset);

}, [activeTab]);
const loadMoreNews = () => {
if (!isFetchingNews && hasMore) dispatch(fetchMoreNews());
};

const renderNews = ({ item }) => <NewsCard item={item} colors={colors} />;
const [expanded, setExpanded] = useState({});
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
const renderPost = useCallback(
({ item }) => {
const isExpanded = expanded[item.id] || false;
const contentPreview =
item.content?.length > 120 && !isExpanded
? item.content.slice(0, 120) + "..."
: item.content;

return (
<View style={[styles.tweetContainer,{ borderBottomColor: colors.text,}]}>

{/* Left Thread Line */}
<TouchableOpacity
style={styles.threadColumn}
onPress={() =>
item?.user.uid === userData.uid
? navigation.navigate("Profile")
: navigation.navigate("OtherProfile", { uid: item?.user.uid })
}
>
<Image source={{ uri: item.user.avatar }} style={styles.tweetAvatar} />
<View style={[styles.threadLine,{borderColor:colors.text}]} />
</TouchableOpacity>

{/* Right Content */}
<View style={styles.tweetContentSection}>

{/* Header */}
<TouchableOpacity
style={styles.tweetHeader}
onPress={() =>
item?.user.uid === userData.uid
? navigation.navigate("Profile")
: navigation.navigate("OtherProfile", { uid: item?.user.uid })
}
>
<Text style={[styles.tweetName, { color: colors.text }]}>
{item.user.name}
</Text>
<Text style={[styles.tweetTime, { color: colors.textSecondary }]}>
· {timeAgo(item.createdAt)}
</Text>
</TouchableOpacity>

{/* Tagline */}
<Text
style={[styles.tweetTagline, { color: colors.textSecondary }]}
>
{item.user?.tagline ?? "New on Ahead"}
</Text>

{/* Content + Links */}
{item.content && (
<Hyperlink
linkStyle={{ color: colors.link, textDecorationLine: "underline" }}
onPress={(url) => Linking.openURL(url)}
>
<Text style={[styles.tweetText, { color: colors.text }]}>
{contentPreview}
</Text>
</Hyperlink>
)}

{/* Read more */}
{item.content?.length > 120 && (
<TouchableOpacity
onPress={() =>
setExpanded((prev) => ({ ...prev, [item.id]: !isExpanded }))
}
>
<Text style={[styles.readMore, { color: colors.primary }]}>
{isExpanded ? "Read less" : "Read more"}
</Text>
</TouchableOpacity>
)}

{/* Image */}
{item.imageUrl && (
<FullWidthImage uri={item.imageUrl} resizeMode="contain" />
)}

{/* Actions */}
<View style={styles.tweetActionsRow}>
{/* Like */}
<TouchableOpacity
style={styles.tweetAction}
onPress={() => handleLike(item)}
>
<Icon
name={item.likedByCurrentUser ? "favorite" : "favorite-border"}
size={24}
color={
item.likedByCurrentUser ? colors.primary : colors.textSecondary
}
/>
<Text style={[styles.tweetActionText, { color: colors.text }]}>
{item.totalLikes || 0}
</Text>
</TouchableOpacity>

{/* Comment */}
<TouchableOpacity
style={styles.tweetAction}
onPress={() =>
navigation.navigate("Comments", {
postId: item.id,
creatorId: item.userId,
})
}
>
<Icon
name="chat-bubble-outline"
size={24}
color={colors.textSecondary}
/>
<Text style={[styles.tweetActionText, { color: colors.text }]}>
{item.totalComments || 0}
</Text>
</TouchableOpacity>

{/* Share */}
<Icon
name="share"
size={24}
color={colors.textSecondary}
style={{ marginLeft: 10 }}
/>

{/* Bookmark (Right aligned) */}
<TouchableOpacity
style={{ marginLeft: "auto" }}
onPress={() => handleBookmark(item)}
>
<Icon
name={
item.bookmarkedByCurrentUser ? "bookmark" : "bookmark-border"
}
size={24}
color={
item.bookmarkedByCurrentUser
? colors.primary
: colors.textSecondary
}
/>
</TouchableOpacity>
</View>
</View>
</View>
);
},
[colors, expanded, handleBookmark, handleLike, navigation, userData.uid]
);

return (
<SafeAreaView style={{ flex: 1, backgroundColor: colors.background,paddingHorizontal:6 }}>
{/* COLLAPSIBLE HEADER CONTAINER */}
<Animated.View
style={[
styles.headerContainer,
{ transform: [{ translateY: headerTranslateY },] },
{ backgroundColor: colors.background}
]}
>
{/* HEADER */}
<Animated.View style={{ opacity: headerOpacity, height: HEADER_MAX }}>
<CustomHeader activeTab={activeTab} setActiveTab={setActiveTab} />
</Animated.View>

{/* TABS - always visible, never collapses */}
<View style={{ height: TABS_HEIGHT }}>
<CustomHeaderTabs
tabs={["Post", "News", "Trending"]}
activeTab={activeTab}
setActiveTab={setActiveTab}
colors={colors}
/>
</View>
</Animated.View>

{/* MAIN CONTENT */}
<View style={{ flex: 1 }}>
{/* POST LIST */}
<Animated.View
style={{ flex: 1, display: activeTab === "Post" ? "flex" : "none" }}
>
<FlatList
ref={recentListRef}
data={feed.recent.posts}
keyExtractor={(item) => item.id}
contentContainerStyle={{
paddingTop: HEADER_MAX + TABS_HEIGHT,
paddingBottom: 60,
}}
refreshControl={
<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
}
onEndReached={loadMorePosts}
onScroll={Animated.event(
[{ nativeEvent: { contentOffset: { y: scrollY } } }],
{
useNativeDriver: false,
listener: (event) => {
const currentY = event.nativeEvent.contentOffset.y;

scrollPositions.current[activeTab] = currentY;

const diff = currentY - lastScrollY.current;

// User scrolls DOWN → hide header
if (diff > 10 && currentY >0) {
Animated.timing(headerAnim, {
toValue: 1,
duration: 10,
useNativeDriver: true,
}).start();
}

// User scrolls UP → show header
if (diff < -30) {
Animated.timing(headerAnim, {
toValue: 0,
duration: 10,
useNativeDriver: true,
}).start();
}

lastScrollY.current = currentY;
},
}
)}  
scrollEventThrottle={16}
renderItem={renderPost}
showsVerticalScrollIndicator={false}
/>
</Animated.View>

{/* TRENDING LIST */}
<Animated.View
style={{ flex: 1, display: activeTab === "Trending" ? "flex" : "none" }}
>
<FlatList
ref={trendingListRef}
data={feed.trending.posts}
keyExtractor={(item) => item.id}
contentContainerStyle={{
paddingTop: HEADER_MAX + TABS_HEIGHT,
paddingBottom: 60,
}}
onEndReached={loadMorePosts}
onScroll={Animated.event(
[{ nativeEvent: { contentOffset: { y: scrollY } } }],
{
useNativeDriver: false,
listener: (event) => {
const currentY = event.nativeEvent.contentOffset.y;

scrollPositions.current[activeTab] = currentY;

const diff = currentY - lastScrollY.current;

// User scrolls DOWN → hide header
if (diff > 15 && currentY > 0) {
Animated.timing(headerAnim, {
toValue: 1,
duration: 10,
useNativeDriver: true,
}).start();
}

// User scrolls UP → show header
if (diff < -30) {
Animated.timing(headerAnim, {
toValue: 0,
duration: 10,
useNativeDriver: true,
}).start();
}

lastScrollY.current = currentY;
},
}
)}
showsVerticalScrollIndicator={false}
scrollEventThrottle={16}
renderItem={renderPost}  
/>
</Animated.View>

{/* NEWS LIST */}
<Animated.View
style={{ flex: 1, display: activeTab === "News" ? "flex" : "none" }}
>
<FlatList
ref={newsListRef}
data={news}
keyExtractor={(item) => item.id}
renderItem={renderNews}
contentContainerStyle={{
paddingTop: HEADER_MAX + TABS_HEIGHT/2,
}}
onEndReached={loadMoreNews}
onScroll={Animated.event(
[{ nativeEvent: { contentOffset: { y: scrollY } } }],
{
useNativeDriver: false,
listener: (event) => {
const currentY = event.nativeEvent.contentOffset.y;

scrollPositions.current[activeTab] = currentY;

const diff = currentY - lastScrollY.current;

// User scrolls DOWN → hide header
if (diff > 5 && currentY > 50) {
Animated.timing(headerAnim, {
toValue: 1,
duration: 150,
useNativeDriver: true,
}).start();
}

// User scrolls UP → show header
if (diff < -5) {
Animated.timing(headerAnim, {
toValue: 0,
duration: 150,
useNativeDriver: true,
}).start();
}

lastScrollY.current = currentY;
},
}
)}
showsVerticalScrollIndicator={false}
scrollEventThrottle={16}
pagingEnabled
snapToInterval={PAGE_HEIGHT}
snapToAlignment="start"
decelerationRate="fast"
disableIntervalMomentum={true}
/>
</Animated.View>
</View>


{/* FAB */}
{activeTab === "Post" && (
<FAB
icon="pencil"
style={[styles.fab, { backgroundColor: colors.primary }]}
onPress={() => navigation.navigate("AddPost")}
color="#fff"
/>
)}
</SafeAreaView>
);
};

const styles = StyleSheet.create({
headerContainer: {
  position: "absolute",
  left: 0,
  right: 0,
  top: 0,
  zIndex: 20,
 
},
tweetContainer: {
flexDirection: "row",   
paddingVertical: 8,
paddingRight: 6,
marginVertical: 6,
marginHorizontal:8,
borderBottomWidth: 0.2,
paddingHorizontal:8,


},

/* LEFT COLUMN (avatar + thread line) */
threadColumn: {
width: 50,
alignItems: "center",
},

tweetAvatar: {
width: 36,
height: 36,
borderRadius: 18,
marginBottom: 4,
},

threadLine: {
width: 1,
flex: 1,
borderWidth:0,

marginTop: 4,
marginBottom:4
},

/* RIGHT CONTENT */
tweetContentSection: {
flex: 1,
marginLeft:4
},

tweetHeader: {
flexDirection: "row",
alignItems: "center",
},

tweetName: {
fontWeight: "700",
fontSize: 15,
},

tweetTime: {
marginLeft: 6,
fontSize: 13,
fontWeight: "400",
},

tweetTagline: {
fontSize: 12,
marginTop: -2,
marginBottom: 4,
},

tweetText: {
marginTop: 4,
fontSize: 16,
lineHeight:22,
fontWeight: "600",
fontFamily: "Inter",

},
postContent: {
marginVertical: 8,

fontWeight: "700",
fontSize: 15,
lineHeight: 21,
},
readMore: {
marginTop: 4,
fontSize: 13,
fontWeight: "600",
},

/* ACTION ROW */
tweetActionsRow: {
flexDirection: "row",
alignItems: "center",
marginTop: 12,
},

tweetAction: {
flexDirection: "row",
alignItems: "center", 
marginRight: 18,
},

tweetActionText: {
marginLeft: 6,
fontSize: 16,
fontWeight: "600",
},

fab: {
position: "absolute",  
bottom: 100,
right: 20,
zIndex: 100,
},
});

export default HomeScreenUser;
