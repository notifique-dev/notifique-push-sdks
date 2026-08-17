# @notifique/push-server

Cliente **completo** da API Push Notifique para backends (`sk_live_...` / `sk_test_...`).

Cobre todos os endpoints autenticados do OpenAPI Push: **apps**, **devices**, **messages**.

## Instalação

```bash
npm install @notifique/push-server
```

## Envio canônico

```ts
import { PushClient } from "@notifique/push-server";

const push = new PushClient({ apiKey: process.env.NOTIFIQUE_API_KEY! });

const { data } = await push.send({
  to: ["clxxdevice..."],
  type: "push",
  payload: {
    title: "Olá!",
    body: "Nova mensagem",
    url: "https://seusite.com/inbox",
  },
});

console.log(data.messageIds);
```

## API completa

| Método | Endpoint | Escopo típico |
|--------|----------|---------------|
| `listApps` / `createApp` / `getApp` / `updateApp` / `deleteApp` | `/v1/push/apps` | `push:apps:*` |
| `listDevices` / `getDevice` / `registerDevice` / `deleteDevice` | `/v1/push/devices` | `push:devices:*`, `push:read` |
| `send` / `listMessages` / `getMessage` / `cancelMessage` | `/v1/push/messages` | `push:send`, `push:read`, `push:cancel` |

Autenticação: `Authorization: Bearer` (padrão) ou `x-api-key` (`useXApiKeyHeader: true`).

Documentação: [docs.notifique.dev/push-api](https://docs.notifique.dev/push-api/como-funciona/quick-start)
