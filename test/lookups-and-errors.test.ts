import { describe, expect, it } from "vitest";
import {
  SiroPagosHttpError,
  SiroPagosRequestError,
  SiroPagosResponseValidationError,
  SiroPagosValidationError,
  createSiroPagosClient
} from "../src/index.js";
import {
  createQueuedFetch,
  jsonResponse,
  readJsonBody,
  textResponse
} from "./helpers.js";

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

describe("lookup endpoints", () => {
  it("gets a payment result using the hash/result id path", async () => {
    const { client, fetchMock } = authenticatedClient(() =>
      jsonResponse({
        Rendicion: null,
        PagoExitoso: true,
        MensajeResultado: "Pago exitoso",
        FechaOperacion: "2025-02-21T14:59:31.51",
        FechaRegistro: "2025-02-21T14:55:05.98",
        IdOperacion: "1d3a8828-b575-45e6-853c-00b4dfa7e6b2",
        Estado: "PROCESADA",
        idReferenciaOperacion: "Ejemplo Documentacion",
        Request: {
          Concepto: "API BOTON DE PAGOS",
          Detalle: [
            { Importe: 25, Descripcion: "Agua" },
            { Importe: 25, Descripcion: "Gas" }
          ],
          FechaExpiracion: null,
          Importe: 50,
          URL_OK: "https://www.google.com/",
          nro_comprobante: "12345678911111112502",
          URL_ERROR: "https://www.google.com/",
          IdReferenciaOperacion: "Ejemplo Documentacion",
          nro_cliente_empresa: "0428544445150058293"
        }
      })
    );

    const result = await client.getPaymentResult({
      hash: "hash-1",
      resultId: "result-1"
    });

    expect(result.paymentSuccessful).toBe(true);
    expect(result.state).toBe("PROCESADA");
    expect(result.request?.details).toHaveLength(2);
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "https://siropagosh.bancoroela.com.ar/api/Pago/hash-1/result-1"
    );
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe("GET");
  });

  it("searches payments and maps the documented filters", async () => {
    const { client, fetchMock } = authenticatedClient(() =>
      jsonResponse([
        {
          Rendicion: null,
          PagoExitoso: true,
          MensajeResultado: "Pago exitoso",
          FechaOperacion: "2025-02-21T14:59:31.51",
          FechaRegistro: "2025-02-21T14:55:05.98",
          IdOperacion: "op-1",
          Estado: "PROCESADA",
          idReferenciaOperacion: "ref-1"
        },
        {
          Rendicion: null,
          PagoExitoso: false,
          MensajeResultado: "Pago rechazado",
          FechaOperacion: "2025-02-22T14:59:31.51",
          FechaRegistro: "2025-02-22T14:55:05.98",
          IdOperacion: "op-2",
          Estado: "RECHAZADA",
          idReferenciaOperacion: "ref-2"
        }
      ])
    );

    const result = await client.searchPayments({
      fromDate: "2025-02-20T19:09:30.367Z",
      toDate: "2025-02-24T19:09:30.367Z",
      operationReferenceId: "ref-1",
      state: "PROCESADA"
    });

    expect(result).toHaveLength(2);
    expect(result[1]?.state).toBe("RECHAZADA");
    expect(readJsonBody(fetchMock.mock.calls[1]?.[1])).toEqual({
      FechaDesde: "2025-02-20T19:09:30.367Z",
      FechaHasta: "2025-02-24T19:09:30.367Z",
      idReferenciaOperacion: "ref-1",
      estado: "PROCESADA"
    });
  });

  it("rejects payment searches whose date range is inverted", async () => {
    const { client } = authenticatedClient(() => jsonResponse([]));

    await expect(
      client.searchPayments({
        fromDate: "2025-02-24T19:09:30.367Z",
        toDate: "2025-02-20T19:09:30.367Z"
      })
    ).rejects.toBeInstanceOf(SiroPagosValidationError);
  });
});

describe("error handling", () => {
  it("surfaces SIRO HTTP failures with status and body details", async () => {
    const { client } = authenticatedClient(() =>
      jsonResponse(
        {
          MensajeResultado: "Solicitud incorrecta"
        },
        { status: 400 }
      )
    );

    await expect(
      client.createPayment({
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
      })
    ).rejects.toMatchObject<SiroPagosHttpError>({
      name: "SiroPagosHttpError",
      statusCode: 400
    });
  });

  it("fails when SIRO returns a success body that does not match the schema", async () => {
    const { client } = authenticatedClient(() =>
      jsonResponse({
        not: "the documented shape"
      })
    );

    await expect(
      client.createPayment({
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
      })
    ).rejects.toBeInstanceOf(SiroPagosResponseValidationError);
  });

  it("fails when the response is not valid JSON", async () => {
    const { client } = authenticatedClient(() => textResponse("not-json"));

    await expect(
      client.createPayment({
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
      })
    ).rejects.toBeInstanceOf(SiroPagosResponseValidationError);
  });

  it("times out long-running requests", async () => {
    const fetchMock = createQueuedFetch(
      () =>
        jsonResponse({
          access_token: "token-1",
          token_type: "bearer",
          expires_in: 3600
        }),
      (_input, init) =>
        new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        })
    );

    const client = createSiroPagosClient({
      environment: "sandbox",
      credentials: {
        username: "user",
        password: "secret"
      },
      timeoutMs: 5,
      fetch: fetchMock
    });

    await expect(
      client.createPayment({
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
      })
    ).rejects.toBeInstanceOf(SiroPagosRequestError);
  });
});
