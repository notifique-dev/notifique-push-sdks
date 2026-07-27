# @notifique/push

Official **Web Push** SDK for [Notifique](https://notifique.dev).

## Install

```bash
npm install @notifique/push
```

## Usage

1. Configure **allowed domains** on the Push App in the dashboard.
2. Serve `sw-loader.js` as `/sw.js` (download from the dashboard).
3. Initialize:

```ts
import { NotifiquePush } from '@notifique/push';

await NotifiquePush.init({
  appId: 'YOUR_PUSH_APP_ID',
  swPath: '/sw.js',
});

// Or with a custom button:
document.getElementById('enable')?.addEventListener('click', () => {
  NotifiquePush.requestPermissionAndRegister();
});
```

CDN / script tag (IIFE build): use the npm package build or the hosted script at `https://api.notifique.dev/v1/push/scripts/notifique-push.js`.

## Security

Never put API Keys in the browser. Link CRM `contactId` from your backend with `sk_live_...`.

Docs: https://docs.notifique.dev/push-api/integracao
