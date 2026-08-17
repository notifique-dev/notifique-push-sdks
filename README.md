# Notifique Push SDKs

SDKs oficiais da [Notifique](https://notifique.dev) para notificações push em **Web**, **Android**, **iOS**, **Flutter** e **React Native**, mais cliente **server-side** para envio.

Documentação de integração: [docs.notifique.dev/push-api/integracao](https://docs.notifique.dev/push-api/integracao)

## Pacotes

| Plataforma | Pacote | Instalação |
|------------|--------|------------|
| Web (cliente) | `@notifique/push` | `npm install @notifique/push` |
| Server (API completa) | `@notifique/push-server` | `npm install @notifique/push-server` |
| React Native | `@notifique/push-react-native` | `npm install @notifique/push-react-native` |
| Flutter | `notifique_push` | `flutter pub add notifique_push` |
| Android (Kotlin) | `dev.notifique:push` | Maven local ou SPM do monorepo — ver abaixo |
| iOS (Swift) | `NotifiquePush` | Swift Package Manager (tag GitHub) |

## Cliente — registro de dispositivo

```text
NotifiquePush.init({ appId })
  → permissão
  → token (FCM / APNs / Web Push)
  → POST /v1/push/devices (público, sem API Key)
```

- Use só o **`appId`** do Push App no cliente.
- **Nunca** coloque API Keys (`sk_live_...` / `sk_test_...`) no app ou no site.
- Android: `packageName` obrigatório. iOS: `bundleId` obrigatório.

## Server — envio canônico

```ts
import { PushClient } from "@notifique/push-server";

const push = new PushClient({ apiKey: process.env.NOTIFIQUE_API_KEY! });

await push.send({
  to: ["clxxdevice..."],
  type: "push",
  payload: { title: "Olá!", body: "Nova mensagem", url: "https://seusite.com" },
});
// → data.messageIds
```

O `@notifique/push-server` cobre **apps**, **devices** e **messages** da API Push (`listApps`, `send`, `listMessages`, etc.).

Contrato de envio: `to` + `type` + `payload` (não use `title`/`body` na raiz nem `pushIds`).

## Recebimento e clique

Todos os SDKs parseiam `log_id`, `url` e reportam clique em `POST /v1/push/events/click`.

| Plataforma | Abrir notificação |
|------------|-------------------|
| Web | SW embutido ou `sw.js` + `reportClick` |
| React Native | `attachNotificationOpenHandler(messaging)` |
| Flutter | `FirebasePushMessaging().attachOpenHandlers()` |
| Android | `handleNotificationOpen(data)` |
| iOS | `handleNotificationResponse(userInfo:)` |

Web também: `promptConfig` do painel, popup subscribe (Wix/Shopify), `openSubscribePopup()`.

## Exemplos

- [`examples/web-vite`](examples/web-vite)
- [`examples/android-app`](examples/android-app)
- [`examples/ios-app`](examples/ios-app)
- [`examples/flutter-app`](examples/flutter-app)
- [`examples/rn-app`](examples/rn-app)

## Publicar releases (maintainers)

1. Atualize versões em todos os pacotes (npm `0.2.0`, Flutter `pubspec.yaml`, Android `build.gradle.kts`, CHANGELOGs).
2. Commit em `main`.
3. Crie tag anotada: `git tag -a v0.2.0 -m "v0.2.0"` e `git push origin v0.2.0`.
4. **Flutter (pub.dev):** o workflow `publish-pubdev.yml` roda no push da tag. Antes, em [pub.dev](https://pub.dev) → pacote `notifique_push` → **Admin** → **Automated publishing** → habilitar o repositório `notifique-dev/notifique-push-sdks` (OIDC, sem token manual).
5. **npm:** GitHub → Actions → **Publish** → digite `PUBLISH` (com a tag `v0.2.0` checked out). Requer secret `NPM_TOKEN`.
6. **Android:** `./gradlew :push:publishToMavenLocal` ou publicação Maven Central (ainda manual).
7. **iOS:** consumidores apontam SPM à tag `v0.2.0` no GitHub (sem registry separado).

## Segurança

[SECURITY.md](SECURITY.md) · security@notifique.dev

## Changelog

[CHANGELOG.md](CHANGELOG.md)

## Contribuir

[CONTRIBUTING.md](CONTRIBUTING.md)
