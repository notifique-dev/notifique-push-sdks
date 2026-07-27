# Web example

```bash
npm install @notifique/push
```

```html
<script type="module">
  import { NotifiquePush } from '@notifique/push';
  await NotifiquePush.init({ appId: 'YOUR_APP_ID', swPath: '/sw.js' });
</script>
```

Serve `sw.js` from the Notifique dashboard download (`sw-loader.js`).
