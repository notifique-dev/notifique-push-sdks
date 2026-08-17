# React Native example

```bash
npm install @notifique/push-react-native @react-native-firebase/app @react-native-firebase/messaging
```

```ts
import messaging from '@react-native-firebase/messaging';
import { NotifiquePush } from '@notifique/push-react-native';

await NotifiquePush.init({
  appId: 'YOUR_APP_ID',
  packageName: 'com.example.app', // Android
  bundleId: 'com.example.app',  // iOS
  messaging: {
    requestPermission: async () => (await messaging().requestPermission()) === 1 ? 'granted' : 'denied',
    getPermissionStatus: async () => 'granted',
    getToken: () => messaging().getToken(),
    onTokenRefresh: (cb) => messaging().onTokenRefresh(cb),
  },
});

NotifiquePush.attachNotificationOpenHandler(messaging());
```
