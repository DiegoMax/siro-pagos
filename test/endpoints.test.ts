import { describe, expect, it } from "vitest";
import {
  SiroPagosValidationError,
  createSiroPagosClient
} from "../src/index.js";
import { createQueuedFetch, jsonResponse, readJsonBody } from "./helpers.js";

function authenticatedClient(...handlers: Parameters<typeof createQueuedFetch>) {
  const fetchMock = createQueuedFetch(
    () =>
      jsonResponse({
        access_token: "token-1",
        token_type: "bearer",
        expires_in: 3600
      }),
    ...handlers
  );

  const client = createSiroPagosClient({
    environment: "sandbox",
    credentials: {
      username: "user",
      password: "secret"
    },
    fetch: fetchMock
  });

  return { client, fetchMock };
}

describe("endpoint mappings", () => {
  it("creates a payment and maps the response", async () => {
    const { client, fetchMock } = authenticatedClient(() =>
      jsonResponse({
        Url: "https://siropagos.bancoroela.com.ar/Home/Pago/hash-1",
        Hash: "hash-1"
      })
    );

    const response = await client.createPayment({
      concept: "Utilities",
      details: [
        { description: "Water", amount: 25 },
        { description: "Gas", amount: 25 }
      ],
      amount: 50,
      expirationDate: "2025-02-20T18:55:27.829Z",
      successUrl: "https://example.com/ok",
      errorUrl: "https://example.com/error",
      receiptNumber: "123",
      operationReferenceId: "ref-1",
      companyClientNumber: "0428544445150058293"
    });

    expect(response.paymentUrl).toContain("/Home/Pago/");
    expect(response.hash).toBe("hash-1");
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "https://siropagosh.bancoroela.com.ar/api/Pago"
    );
    expect(readJsonBody(fetchMock.mock.calls[1]?.[1])).toEqual({
      Concepto: "Utilities",
      Detalle: [
        { Descripcion: "Water", Importe: 25 },
        { Descripcion: "Gas", Importe: 25 }
      ],
      FechaExpiracion: "2025-02-20T18:55:27.829Z",
      Importe: 50,
      URL_OK: "https://example.com/ok",
      nro_comprobante: "123",
      URL_ERROR: "https://example.com/error",
      IdReferenciaOperacion: "ref-1",
      nro_cliente_empresa: "0428544445150058293"
    });
  });

  it("creates a payment QR string and preserves the SIRO hash", async () => {
    const { client, fetchMock } = authenticatedClient(() =>
      jsonResponse({
        StringQR: "qr-value",
        Hash: "hash-qr"
      })
    );

    const response = await client.createPaymentQrString({
      concept: "Utilities",
      details: [
        { description: "Water", amount: 25 },
        { description: "Gas", amount: 25 }
      ],
      amount: 50,
      successUrl: "https://example.com/ok",
      errorUrl: "https://example.com/error",
      receiptNumber: "123",
      operationReferenceId: "ref-1",
      companyClientNumber: "0428544445150058293"
    });

    expect(response.qrString).toBe("qr-value");
    expect(response.hash).toBe("hash-qr");
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "https://siropagosh.bancoroela.com.ar/api/Pago/StringQR"
    );
  });

  it("creates a voucher payment", async () => {
    const { client, fetchMock } = authenticatedClient(() =>
      jsonResponse({
        Url: "https://siropagos.bancoroela.com.ar/Home/Pago/hash-2",
        Hash: "hash-2"
      })
    );

    const response = await client.createVoucherPayment({
      companyClientNumber: "0489564755150058293",
      receiptNumber: "96018          9602",
      successUrl: "https://example.com/ok",
      errorUrl: "https://example.com/error",
      operationReferenceId: "ref-2",
      useVoucherDueDates: true
    });

    expect(response.hash).toBe("hash-2");
    expect(readJsonBody(fetchMock.mock.calls[1]?.[1])).toEqual({
      nro_cliente_empresa: "0489564755150058293",
      nro_comprobante: "96018          9602",
      URL_OK: "https://example.com/ok",
      URL_ERROR: "https://example.com/error",
      IdReferenciaOperacion: "ref-2",
      UsarVencimientosComprobante: true
    });
  });

  it("creates a static QR string", async () => {
    const { client, fetchMock } = authenticatedClient(() =>
      jsonResponse({
        StringQREstatico: "static-qr"
      })
    );

    const response = await client.createStaticQrString({
      companyNumber: "5150058293",
      terminalNumber: "TERMINAL 1"
    });

    expect(response.qrString).toBe("static-qr");
    expect(readJsonBody(fetchMock.mock.calls[1]?.[1])).toEqual({
      nro_empresa: "5150058293",
      nro_terminal: "TERMINAL 1"
    });
  });

  it("creates a static QR payment against /api/QREstatico", async () => {
    const { client, fetchMock } = authenticatedClient(() =>
      jsonResponse({
        Url: "https://siropagos.bancoroela.com.ar/Home/Pago/hash-static",
        Hash: "hash-static"
      })
    );

    const response = await client.createStaticQrPayment({
      terminalNumber: "TERMINAL 1",
      amount: 100,
      successUrl: "https://example.com/ok",
      errorUrl: "https://example.com/error",
      receiptNumber: "01234567891112143144",
      operationReferenceId: "123456",
      companyClientNumber: "0428544445150058293"
    });

    expect(response.hash).toBe("hash-static");
    expect(response.paymentUrl).toContain("/Home/Pago/");
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "https://siropagosh.bancoroela.com.ar/api/QREstatico"
    );
  });

  it("creates an offline QR string in due-date mode", async () => {
    const { client, fetchMock } = authenticatedClient(() =>
      jsonResponse({
        StringQR: "offline-qr"
      })
    );

    const response = await client.createOfflineQrString({
      mode: "due-dates",
      companyClientNumber: "0428544445150058293",
      receiptNumber: "01234567228910121315",
      installments: [
        { dueDate: "2025-03-31T23:56:52.663Z", amount: 10 },
        { dueDate: "2025-04-05T23:56:52.663Z", amount: 20 },
        { dueDate: "2025-04-10T23:56:52.663Z", amount: 30 }
      ]
    });

    expect(response.qrString).toBe("offline-qr");
    expect(readJsonBody(fetchMock.mock.calls[1]?.[1])).toEqual({
      vto_1: "2025-03-31T23:56:52.663Z",
      importe_1: 10,
      vto_2: "2025-04-05T23:56:52.663Z",
      importe_2: 20,
      vto_3: "2025-04-10T23:56:52.663Z",
      importe_3: 30,
      nro_cliente_empresa: "0428544445150058293",
      nro_comprobante: "01234567228910121315"
    });
  });

  it("creates an offline QR string in debt-base mode", async () => {
    const { client, fetchMock } = authenticatedClient(() =>
      jsonResponse({
        StringQR: "offline-qr-debt"
      })
    );

    const response = await client.createOfflineQrString({
      mode: "debt-base",
      companyClientNumber: "0489564755150058293",
      receiptNumber: "96018          96022"
    });

    expect(response.qrString).toBe("offline-qr-debt");
    expect(readJsonBody(fetchMock.mock.calls[1]?.[1])).toEqual({
      nro_cliente_empresa: "0489564755150058293",
      nro_comprobante: "96018          96022"
    });
  });
});

describe("input validation", () => {
  it("rejects payment requests whose amount does not match the detail total", async () => {
    const { client } = authenticatedClient(() =>
      jsonResponse({
        Url: "https://siropagos.bancoroela.com.ar/Home/Pago/hash-1",
        Hash: "hash-1"
      })
    );

    await expect(
      client.createPayment({
        concept: "Utilities",
        details: [
          { description: "Water", amount: 25 },
          { description: "Gas", amount: 15 }
        ],
        amount: 50,
        expirationDate: "2025-02-20T18:55:27.829Z",
        successUrl: "https://example.com/ok",
        errorUrl: "https://example.com/error",
        receiptNumber: "123",
        operationReferenceId: "ref-1",
        companyClientNumber: "0428544445150058293"
      })
    ).rejects.toBeInstanceOf(SiroPagosValidationError);
  });

  it("rejects static QR terminals that do not match the documented length", async () => {
    const { client } = authenticatedClient(() =>
      jsonResponse({
        StringQREstatico: "static-qr"
      })
    );

    await expect(
      client.createStaticQrString({
        companyNumber: "5150058293",
        terminalNumber: "TERMINAL 12"
      })
    ).rejects.toBeInstanceOf(SiroPagosValidationError);
  });

  it("rejects offline QR installments whose due dates are not strictly increasing", async () => {
    const { client } = authenticatedClient(() =>
      jsonResponse({
        StringQR: "offline-qr"
      })
    );

    await expect(
      client.createOfflineQrString({
        mode: "due-dates",
        companyClientNumber: "0428544445150058293",
        receiptNumber: "01234567228910121315",
        installments: [
          { dueDate: "2025-12-31T23:56:52.663Z", amount: 10 },
          { dueDate: "2026-01-10T23:56:52.663Z", amount: 20 },
          { dueDate: "2025-01-05T23:56:52.663Z", amount: 30 }
        ]
      })
    ).rejects.toBeInstanceOf(SiroPagosValidationError);
  });
});
