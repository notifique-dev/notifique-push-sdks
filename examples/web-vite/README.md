# Web example

```bash
npm install @notifique/push
```

## Com Service Worker no domínio (recomendado)

```html
<script type="module">
  import { NotifiquePush } from '@notifique/push';

  await NotifiquePush.init({ appId: 'YOUR_APP_ID', swPath: '/sw.js' });

  document.getElementById('enable')?.addEventListener('click', () => {
    NotifiquePush.requestPermissionAndRegister();
  });
</script>
```

Serve `sw.js` from the Notifique dashboard (`sw-loader`).

## Sem SW no domínio (Wix / Shopify)

O SDK usa SW embutido ou popup `/v1/push/subscribe` automaticamente:

```ts
await NotifiquePush.init({ appId: 'YOUR_APP_ID' });
// ou manualmente:
await NotifiquePush.openSubscribePopup();
```

## Clique em notificação (fora do SW)

```ts
import { parsePushPayload, reportClick } from '@notifique/push';

const payload = parsePushPayload(event.data);
await reportClick({ logId: payload.logId, clickReportUrl: payload.clickReportUrl });
```
