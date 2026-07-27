# Exemplo React Native

App mínimo usando `@notifique/push-react-native@0.1.0`.

```ts
import { NotifiquePush } from '@notifique/push-react-native';

await NotifiquePush.init({
  appId: 'clxxapp...',
  packageName: 'com.example.app', // Android
  // bundleId: 'com.example.app', // iOS
  messaging: myMessagingAdapter,
});
```

Veja o [README do pacote](../../packages/react-native/README.md) e a [doc React Native](https://docs.notifique.dev/push-api/integracao/react-native).
