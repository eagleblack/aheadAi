import React, { useEffect, useState } from "react";
import { StatusBar, Dimensions, ActivityIndicator, View, Easing } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { CardStyleInterpolators, createStackNavigator } from "@react-navigation/stack";
import auth from "@react-native-firebase/auth";
import { Provider, useDispatch, useSelector } from "react-redux";
import { store } from "./src/store/store";
import { Provider as PaperProvider } from "react-native-paper";
import { JobThemeProvider } from "./src/context/JobThemeContext";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import TabNavigator from "./src/navigation/TabNavigator";
import CustomDrawer from "./src/navigation/CustomDrawer";

import Loginpage from "./src/screens/Loginpage";
import OTPVerificationPage from "./src/screens/OTPVerificationPage";
import ProfessionSelectPage from "./src/screens/ProfessionSelectPage";
import UserDetailsPage from "./src/screens/UserDetailsPage";
import CompanyVerificationPage from "./src/screens/CompanyVerificationPage";
import CreatePostScreen from "./src/screens/AddPost";
import ChatScreen from "./src/screens/ChatScreen";
import EditProfileScreen from "./src/screens/EditProfileScreen";
import EditCompProfileScreen from "./src/screens/EditCompanyProfileScreen";

import CommentScreen from "./src/screens/Comment";
import MessageScreen from "./src/screens/MessageScreen";
import GroupChatScreen from "./src/screens/GroupChatScreen";
import BookmarkScreen from "./src/screens/BookmarksScreen";
import ExpertonScreen from "./src/screens/ExpertOnboard";
import PostJobScreen from "./src/screens/PostJobScreen";
import MindGrow from "./src/screens/MindGrow";
import StudyScreen from "./src/screens/StudyScreen";
import ProfileScreen from "./src/screens/Profile";
import ThemeScreen from "./src/context/ThemeScreen";
import AcceptRequestScreen from "./src/screens/AcceptRequestScreen";
import Settings from "./src/screens/Settings";
import OtherProfilePage from "./src/screens/OtherProfilePage";
import BookServiceScreen from "./src/screens/BookServiceScreen";
import BookingScreen from "./src/screens/Bookings";
import SupportScreen from "./src/screens/Support";
import FAQ from "./src/screens/FAQScreen";
import About from "./src/screens/About";
import FollowingScreen from "./src/screens/FollowingScreen";  
import AppliedJobsScreen from "./src/screens/AppliedJobsScreen";  
import AllGroupScreen from "./src/screens/AllGroupScreen";  
import CandidatesScreen from "./src/screens/CandidatesScreen";  










import SplashScreen from "react-native-splash-screen";





import { clearUser, listenToUser } from "./src/store/userSlice";
import { listenToUserPosts, setUserPosts } from "./src/store/userPostsSlice";
import { SafeAreaView } from "react-native-safe-area-context";
import { clearSelectionListener, listenToSelectionOptions } from "./src/store/selectionSlice";
import { listenToNotifications } from "./src/store/notificationsSlice";
import { listenToUnreadCount } from "./src/services/chatService";
import { navigationRef, navigate } from "./src/utils/navigationService";
import NotificationsScreen from "./src/screens/NotificationScreen";

const Drawer = createDrawerNavigator();
const Stack = createStackNavigator();
const { width: screenWidth } = Dimensions.get("window");

// ---------------- Main Drawer + Tabs ----------------
const MainDrawer = () => {
  const { colors } = useTheme();

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawer {...props} />}
      screenOptions={{
        headerShown: false,
        swipeEnabled: false,
        drawerType: "front",
        overlayColor: "rgba(0,0,0,0.5)",
        drawerStyle: {
          width: screenWidth * 0.72,
          backgroundColor: colors.surface,
        },
      }}
    >
      <Drawer.Screen name="MainTabs" component={TabNavigator} />
    </Drawer.Navigator>
  );
};

// ---------------- Authenticated Flow ----------------
const AppStack = ({ userData }) => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      gestureEnabled: false,
      transitionSpec: {
        open: { animation: "timing", config: { duration: 320, easing: Easing.out(Easing.poly(5)) } },
        close: { animation: "timing", config: { duration: 300, easing: Easing.in(Easing.poly(4)) } },
      },
      cardStyleInterpolator: CardStyleInterpolators.forFadeFromBottomAndroid,
    }}
  >
    {userData?.hasChecked ? (
      <Stack.Screen name="MainApp" component={MainDrawer} />
    ) : (
      <>
        <Stack.Screen name="ProfessionSelectPage" component={ProfessionSelectPage} />
        <Stack.Screen name="UserDetailsPage" component={UserDetailsPage} />
        <Stack.Screen name="CompanyVerificationPage" component={CompanyVerificationPage} />
        <Stack.Screen name="MainApp" component={MainDrawer} />
      </>
    )}

    {/* Other screens accessible after login */}
    <Stack.Screen name="AddPost" component={CreatePostScreen} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="MindGrow" component={MindGrow} />
    <Stack.Screen name="StudyScreen" component={StudyScreen} />
    <Stack.Screen name="ChatScreen" component={ChatScreen} />
    <Stack.Screen name="EditProfilePage" component={EditProfileScreen} />
    <Stack.Screen name="EditCompProfilePage" component={EditCompProfileScreen} />


    
    <Stack.Screen name="Comments" component={CommentScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />

    <Stack.Screen name="GroupChats" component={GroupChatScreen} />
    <Stack.Screen name="Bookmark" component={BookmarkScreen} />
    <Stack.Screen name="ExpertonScreen" component={ExpertonScreen} />
    <Stack.Screen name="JobPost" component={PostJobScreen} />
    <Stack.Screen name="Message" component={MessageScreen} />
    <Stack.Screen name="ThemeSelect" component={ThemeScreen} />
    <Stack.Screen name="AcceptRequest" component={AcceptRequestScreen} />
    <Stack.Screen name="Settings" component={Settings} />
    <Stack.Screen name="OtherProfile" component={OtherProfilePage} />
    <Stack.Screen name="CompanyVerificationPageNew" component={CompanyVerificationPage} />
    <Stack.Screen name="BookServiceScreen" component={BookServiceScreen} />
    <Stack.Screen name="Bookings" component={BookingScreen} />
    <Stack.Screen name="Support" component={SupportScreen} />
    <Stack.Screen name="FAQ" component={FAQ} />
    <Stack.Screen name="About" component={About} />
    <Stack.Screen name="Following" component={FollowingScreen} />
    <Stack.Screen name="Applied" component={AppliedJobsScreen} />
    <Stack.Screen name="AllGroupScreen" component={AllGroupScreen} />

    <Stack.Screen name="Candidates" component={CandidatesScreen} />


    





    






  </Stack.Navigator>
);

// ---------------- Unauthenticated Flow ----------------
const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
  
    <Stack.Screen name="Loginpage" component={Loginpage} />
    <Stack.Screen name="OTPVerificationPage" component={OTPVerificationPage} />
  </Stack.Navigator>
);

// ---------------- App Wrapper ----------------
const AppWrapper = () => {
  const { isDark } = useTheme();
  const [initializing, setInitializing] = useState(true);
  const [authUser, setAuthUser] = useState(null);
  const dispatch = useDispatch();
  const { user: userData, loading: userLoading } = useSelector((state) => state.user);
  /**
   * 
   * useEffect(() => {
  const uid = auth().currentUser?.uid;
  if (!uid) return;

  testUserBatchQuery(["someId1", "someId2"]);
  testLikesQuery(uid);
  testBookmarksQuery(uid);
}, []);
   */
  
useEffect(() => {
  // Only preload on devices that support Play Services
  dispatch(listenToSelectionOptions());
  
      return () => dispatch(clearSelectionListener());

}, []);
  useEffect(() => {
    if (!authUser) return;
    const unsubscribe = listenToUnreadCount(authUser?.uid, dispatch);
    return () => unsubscribe && unsubscribe();
  }, [authUser]);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((user) => {
      setAuthUser(user);

      if (user) {
        dispatch(listenToUser());       // fetch user profile
        dispatch(listenToUserPosts());  // fetch posts
        dispatch(listenToNotifications(user.uid));

      } else {
        dispatch(clearUser());
        dispatch(setUserPosts([]));
      }

      setInitializing(false); // auth state determined
    });
// "C:\Program Files\Java\jdk-17\bin\keytool.exe" -genkey -v -keystore ahead-keytool.jks -alias ahead-key-alias -keyalg RSA -keysize 2048 -validity 10000
// "C:\Program Files\Java\jdk-17\bin\keytool.exe" -list -v -keystore ahead-keytool.jks -alias ahead-key-alias
    return () => unsubscribe();
  }, [dispatch]);

  // Show loader until auth + user slice is fully loaded
  const isAppReady = !initializing && (!authUser || (authUser && userData));
  useEffect(() => {
    if (isAppReady) {
      SplashScreen.hide();
    }
  }, [isAppReady]);

  if (!isAppReady || (authUser && userLoading)) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <NavigationContainer ref={navigationRef}>
        {authUser ? <AppStack userData={userData} /> : <AuthStack />}
      </NavigationContainer>
    </>
  );
};

export default AppWrapper