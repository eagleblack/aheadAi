import { Alert, PermissionsAndroid, Platform, StyleSheet, Text, View } from 'react-native'
import React, { useEffect } from 'react'
import { useSelector } from 'react-redux';
import HomeScreenUser  from './HomeScreenUser'
import HomeScreenComp from './HomeScreenComp'
import auth from '@react-native-firebase/auth';
import { saveFcmToken } from '../utils/saveFcmToken';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HomeScreen = () => {
  const { user: userData } = useSelector((state) => state.user);
 useEffect(() => {
    const checkNotificationPermission = async () => {
      if (Platform.OS !== 'android') return;
      const user = auth().currentUser;
      if (!user) return;

      try {
        let granted = true;

        if (Platform.Version >= 33) {
          const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          granted = result === PermissionsAndroid.RESULTS.GRANTED;
        }

        if (granted) {
          await saveFcmToken(user.uid);
        } else {
          let attempts = parseInt(
            await AsyncStorage.getItem(NOTIFICATION_ATTEMPTS_KEY),
            10
          );
          if (isNaN(attempts)) attempts = 0;

          if (attempts === 0 || attempts % 10 === 0) {
            showNotificationPrompt(user.uid);
          }

          await AsyncStorage.setItem(
            NOTIFICATION_ATTEMPTS_KEY,
            (attempts + 1).toString()
          );
        }
      } catch (err) {
        console.log('Error handling notification attempts:', err);
      }
    };

    const showNotificationPrompt = (userId) => {
      Alert.alert(
        'Enable Notifications',
        'Turn on notifications to get instant updates when new cars are approved.',
        [
          { text: 'Not now', style: 'cancel' },
          {
            text: 'Enable',
            onPress: async () => {
              try {
                const result = await PermissionsAndroid.request(
                  PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
                );
                if (result === PermissionsAndroid.RESULTS.GRANTED) {
                  await saveFcmToken(userId);
                }
              } catch (e) {
                console.log('Notification permission denied:', e);
              }
            },
          },
        ]
      );
    };

    checkNotificationPermission();
  }, []);
  return (
   <>
   {userData?.userType=="company"?<HomeScreenComp />:
   <HomeScreenUser />}
   </>
  )
}

export default HomeScreen

const styles = StyleSheet.create({})