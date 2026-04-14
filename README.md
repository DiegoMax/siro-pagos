# `@diegomax/siro-pagos`

Cliente TypeScript para la API de [SIRO Pagos](https://onlinesiro.com.ar/) usando `fetch` nativo de Node 22.

Documentacion oficial de la API de SIRO Pagos:
https://siropagos.bancoroela.com.ar/swagger/ui/index

## Caracteristicas

- Solo para Node 22+, paquete ESM-only
- Transporte con `fetch` nativo y timeouts mediante `AbortController`
- Manejo de tokens de sesion de SIRO con renovacion automatica antes del vencimiento
- Validacion estricta en runtime para inputs publicos y respuestas documentadas de SIRO
- API de TypeScript comoda de usar sin perder los payloads crudos de SIRO en las respuestas
- Cobertura con unit tests offline y smoke tests condicionados por variables de entorno para el sandbox de SIRO

## Instalacion

```bash
npm install @diegomax/siro-pagos
```

## Inicio Rapido

```ts
import { createSiroPagosClient } from "@diegomax/siro-pagos";

const client = createSiroPagosClient({
  environment: "sandbox",
  credentials: {
    username: process.env.SIRO_PAGOS_USERNAME ?? "",
    password: process.env.SIRO_PAGOS_PASSWORD ?? ""
  }
});

const payment = await client.createPayment({
  concept: "Invoice payment",
  details: [
    { description: "Water", amount: 25 },
    { description: "Gas", amount: 25 }
  ],
  amount: 50,
  expirationDate: new Date("2025-02-20T18:55:27.829Z"),
  successUrl: "https://example.com/ok",
  errorUrl: "https://example.com/error",
  receiptNumber: "12345678911111112502",
  operationReferenceId: "invoice-123",
  companyClientNumber: "0428544445150058293"
});

console.log(payment.paymentUrl, payment.hash);
```

## Configuracion Del Cliente

```ts
const client = createSiroPagosClient({
  environment: "sandbox",
  credentials: {
    username: "your-user",
    password: "your-password"
  },
  authBaseUrl: "https://apisesionh.bancoroela.com.ar",
  apiBaseUrl: "https://siropagosh.bancoroela.com.ar",
  timeoutMs: 10_000,
  tokenRefreshSkewMs: 30_000
});
```

## API

### `client.authenticate()`

Devuelve la sesion SIRO mapeada y refresca la cache interna del token.

### `client.createPayment(input)`

Crea una intencion de pago y devuelve:

```ts
{
  paymentUrl: string;
  hash: string;
  raw: {
    Url: string;
    Hash: string;
  };
}
```

### `client.createPaymentQrString(input)`

Crea un string QR de pago y devuelve:

```ts
{
  qrString: string;
  hash: string | null;
  raw: {
    StringQR: string;
    Hash?: string;
  };
}
```

### `client.createVoucherPayment(input)`

Crea una intencion de pago a partir de un comprobante o registro de deuda existente.

### `client.createStaticQrString(input)`

Obtiene el string QR estatico documentado para una terminal.

### `client.createStaticQrPayment(input)`

Crea un pago usando el flujo de QR estatico. La implementacion apunta a `/api/QREstatico`, en linea con los ejemplos ejecutables del PDF de SIRO.

### `client.getPaymentResult({ hash, resultId })`

Obtiene el resultado final del pago asociado al redirect de SIRO.

### `client.searchPayments(input)`

Consulta intentos de pago entre `fromDate` y `toDate`, opcionalmente filtrados por estado de SIRO o `reference id`.

### `client.createOfflineQrString(input)`

Soporta los dos modos documentados de QR offline:

```ts
await client.createOfflineQrString({
  mode: "due-dates",
  companyClientNumber: "0428544445150058293",
  receiptNumber: "01234567228910121315",
  installments: [
    { dueDate: "2025-03-31T23:56:52.663Z", amount: 10 },
    { dueDate: "2025-04-05T23:56:52.663Z", amount: 20 },
    { dueDate: "2025-04-10T23:56:52.663Z", amount: 30 }
  ]
});

await client.createOfflineQrString({
  mode: "debt-base",
  companyClientNumber: "0489564755150058293",
  receiptNumber: "96018          96022"
});
```

## Errores

El cliente lanza errores tipados:

- `SiroPagosValidationError`
- `SiroPagosAuthError`
- `SiroPagosHttpError`
- `SiroPagosResponseValidationError`
- `SiroPagosRequestError`

Los errores relacionados con HTTP y schemas conservan, cuando esta disponible, el detalle del endpoint, el codigo de estado, el body de la respuesta y los headers.

## Desarrollo

```bash
npm install
npm run build
npm run typecheck
npm test
```

## Smoke Tests

Los smoke tests son opt-in y estan condicionados por variables de entorno.

Smoke de autenticacion solamente:

```bash
SIRO_PAGOS_USERNAME=... \
SIRO_PAGOS_PASSWORD=... \
npm run test:smoke
```

Smoke de busqueda en modo solo lectura:

```bash
SIRO_PAGOS_USERNAME=... \
SIRO_PAGOS_PASSWORD=... \
SIRO_PAGOS_REFERENCE_ID=existing-reference \
npm run test:smoke
```

Los smoke tests que mutan estado quedan deshabilitados salvo que esten definidas todas estas variables:

```bash
SIRO_PAGOS_USERNAME=... \
SIRO_PAGOS_PASSWORD=... \
SIRO_PAGOS_RUN_MUTATING_SMOKE=true \
SIRO_PAGOS_MUTATING_REFERENCE_ID=unique-reference \
SIRO_PAGOS_COMPANY_CLIENT_NUMBER=company-client-number \
npm run test:smoke
```
