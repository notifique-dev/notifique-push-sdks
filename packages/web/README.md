# @notifique/push

Official **Web Push** SDK for [Notifique](https://notifique.dev). Paridade com o script hospedado `notifique-push.js`.

## Install

```bash
npm install @notifique/push
```

## Usage

```ts
import { NotifiquePush } from '@notifique/push';

await NotifiquePush.init({ appId: 'YOUR_PUSH_APP_ID', swPath: '/sw.js' });

document.getElementById('enable')?.addEventListener('click', () => {
  NotifiquePush.requestPermissionAndRegister();
});
```

### Sem `sw.js` no domínio

```ts
await NotifiquePush.init({ appId: 'YOUR_APP_ID' });
// fallback automático: SW embutido ou popup subscribe
await NotifiquePush.openSubscribePopup();
```

### API pública

| Método | Descrição |
|--------|-----------|
| `init` | Config + `promptConfig` do painel |
| `requestPermissionAndRegister` | Permissão + registro |
| `getAppConfig` | VAPID + prompt |
| `isSubscribed` | Estado local |
| `reportClick` / `reportDelivered` | Eventos públicos |
| `parsePushPayload` | Parse de payload recebido |
| `openSubscribePopup` | Wix / Shopify |

CDN alternativa: `https://api.notifique.dev/v1/push/scripts/notifique-push.js`

Docs: https://docs.notifique.dev/push-api/integracao/credenciais-web
