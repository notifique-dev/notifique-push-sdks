# @notifique/push-react-native

SDK React Native oficial da Notifique para push (Android + iOS).

**Versão:** `0.1.0`

## Instalação

```bash
npm install @notifique/push-react-native
# + messaging do app, ex.:
npm install @react-native-firebase/messaging
```

## Uso

```ts
import { NotifiquePush } from '@notifique/push-react-native';
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';

await NotifiquePush.init({
  appId: 'clxxapp...',
  autoRequestPermission: true,
  packageName: Platform.OS === 'android' ? 'com.example.app' : undefined,
  bundleId: Platform.OS === 'ios' ? 'com.example.app' : undefined,
  messaging: {
    requestPermission: async () => {
      const auth = await messaging().requestPermission();
      return auth ? 'granted' : 'denied';
    },
    getPermissionStatus: async () => 'granted',
    getToken: () => messaging().getToken(),
    onTokenRefresh: (cb) => messaging().onTokenRefresh(cb),
  },
});

await NotifiquePush.setExternalUserId('user-123'); // opcional
const deviceId = NotifiquePush.getDeviceId();
```

Em testes, injete `messaging` + `fetch` + `getPlatform`.

## API

| Método | Descrição |
|--------|-----------|
| `init(...)` | `appId`, `apiBase?`, `autoRequestPermission?`, `messaging?` |
| `requestPermission()` | Solicita permissão e registra o token |
| `getPermissionStatus()` | Status atual |
| `getDeviceId()` | ID retornado por `POST /v1/push/devices` |
| `setExternalUserId(id?)` | Associa usuário externo |
| `unregister()` | Limpa estado local |
| `addEventListener` | Eventos de registro / permissão / erro |
| `register(token)` | `POST` público (`packageName` / `bundleId`) |

O SDK **nunca** envia `contactId` nem API Key.

## Testes

```bash
npm test
```

## Ver também

- [README do monorepo](../../README.md)
- [Configurar React Native](https://docs.notifique.dev/push-api/integracao/react-native)
