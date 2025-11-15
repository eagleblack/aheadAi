import React, { useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import PushNotification from "react-native-push-notification";
import messaging from "@react-native-firebase/messaging";
import { Provider } from "react-redux";
import { PaperProvider } from "react-native-paper";
import { store } from "./src/store/store";
import { ThemeProvider } from "./src/context/ThemeContext";
import { JobThemeProvider } from "./src/context/JobThemeContext";
import AppWrapper from "./AppWrapper"; // 🔹 Move AppWrapper to a separate file
import { navigationRef, navigate } from "./src/utils/navigationService";

export default function App() {

  useEffect(() => {
    // 1️⃣ Create a notification channel
    PushNotification.createChannel(
      {
        channelId: "default-channel",
        channelName: "Default Channel",
        importance: 4,
        vibrate: true,
      },
      (created) => console.log("Channel created:", created)
    );

    // 2️⃣ Handle notification clicks
    PushNotification.configure({
      onNotification: function (notification) {
        console.log("Notification clicked:", notification);

        if (notification.userInteraction && notification.data?.screen) {
          handleNotificationNavigation(notification.data);
        }
      },
      requestPermissions: true,
    });

    // 3️⃣ Foreground message handler
    const unsubscribeForeground = messaging().onMessage(async (remoteMessage) => {
      console.log("Foreground FCM:", remoteMessage);

      PushNotification.localNotification({
        channelId: "default-channel",
        title: remoteMessage.notification?.title || "New Notification",
        message: remoteMessage.notification?.body || "You have a new message",
        bigText: remoteMessage.notification?.body,
        playSound: true,
        soundName: "default",
        importance: "high",
        priority: "high",
        userInfo: remoteMessage.data,
      });
    });

    // 4️⃣ Handle app open from quit/background state
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log("Opened app from quit state:", remoteMessage);
          handleNotificationNavigation(remoteMessage.data);
        }
      });

    return () => {
      unsubscribeForeground();
    };
  }, []);

  const handleNotificationNavigation = (data) => {
    // 👇 You can add as many route conditions as needed
    if (data.screen === "Message") {
      navigate("Message", {   otherUserId: data?.senderId,
            otherUserName: data?.senderUsername,
            otherUserAvatar:"", });
    } else {
      return;
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
      <Provider store={store}>
        <PaperProvider>
          <ThemeProvider>
            <JobThemeProvider>
              <AppWrapper navigationRef={navigationRef} />
            </JobThemeProvider>
          </ThemeProvider>
        </PaperProvider>
      </Provider>
    </SafeAreaView>
  );
}
