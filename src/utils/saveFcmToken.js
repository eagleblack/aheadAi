// utils/saveFcmToken.js
import firestore from '@react-native-firebase/firestore';
import messaging from '@react-native-firebase/messaging';

export async function saveFcmToken(userId) {
  await messaging().registerDeviceForRemoteMessages();
  const token = await messaging().getToken();

  await firestore()
    .collection('users')
    .doc(userId)
    .set({ fcmToken: token }, { merge: true });

  messaging().onTokenRefresh(async newToken => {
    await firestore().collection('users').doc(userId).update({ fcmToken: newToken });
  });
}
