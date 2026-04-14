import { describe, expect, it } from "vitest";
import {
  SiroPagosAuthError,
  createSiroPagosClient
} from "../src/index.js";
import { createQueuedFetch, jsonResponse } from "./helpers.js";

describe("authentication lifecycle", () => {
  it("authenticates and returns the mapped session", async () => {
    const fetchMock = createQueuedFetch(() =>
      jsonResponse({
        access_token: "token-1",
        token_type: "bearer",
        expires_in: 3600
      })
    );

    const client = createSiroPagosClient({
      environment: "sandbox",
      credentials: {
        username: "user",
        password: "secret"
      },
      fetch: fetchMock
    });

    const session = await client.authenticate();

    expect(session.accessToken).toBe("token-1");
    expect(session.tokenType).toBe("bearer");
    expect(session.expiresIn).toBe(3600);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://apisesionh.bancoroela.com.ar/auth/Sesion"
    );
  });

  it("reuses the cached token across authenticated requests", async () => {
    const fetchMock = createQueuedFetch(
      () =>
        jsonResponse({
          access_token: "token-1",
          token_type: "bearer",
          expires_in: 3600
        }),
      () =>
        jsonResponse({
          Url: "https://siropagos.bancoroela.com.ar/Home/Pago/hash-1",
          Hash: "hash-1"
        }),
      () =>
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
          }
        ])
    );

    const client = createSiroPagosClient({
      environment: "sandbox",
      credentials: {
        username: "user",
        password: "secret"
      },
      fetch: fetchMock
    });

    await client.createPayment({
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

    await client.searchPayments({
      fromDate: "2025-02-20T19:09:30.367Z",
      toDate: "2025-02-24T19:09:30.367Z",
      operationReferenceId: "ref-1"
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1]?.[1]?.headers).toMatchObject({
      authorization: "Bearer token-1"
    });
    expect(fetchMock.mock.calls[2]?.[1]?.headers).toMatchObject({
      authorization: "Bearer token-1"
    });
  });

  it("refreshes the token when it is within the configured skew window", async () => {
    const fetchMock = createQueuedFetch(
      () =>
        jsonResponse({
          access_token: "token-1",
          token_type: "bearer",
          expires_in: 1
        }),
      () =>
        jsonResponse({
          Url: "https://siropagos.bancoroela.com.ar/Home/Pago/hash-1",
          Hash: "hash-1"
        }),
      () =>
        jsonResponse({
          access_token: "token-2",
          token_type: "bearer",
          expires_in: 3600
        }),
      () =>
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
          }
        ])
    );

    const client = createSiroPagosClient({
      environment: "sandbox",
      credentials: {
        username: "user",
        password: "secret"
      },
      tokenRefreshSkewMs: 5_000,
      fetch: fetchMock
    });

    await client.createPayment({
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

    await client.searchPayments({
      fromDate: "2025-02-20T19:09:30.367Z",
      toDate: "2025-02-24T19:09:30.367Z",
      operationReferenceId: "ref-1"
    });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[3]?.[1]?.headers).toMatchObject({
      authorization: "Bearer token-2"
    });
  });

  it("raises an auth error when the SIRO session endpoint rejects credentials", async () => {
    const fetchMock = createQueuedFetch(() =>
      jsonResponse(
        {
          MensajeResultado: "Acceso no autorizado"
        },
        {
          status: 401
        }
      )
    );

    const client = createSiroPagosClient({
      environment: "sandbox",
      credentials: {
        username: "user",
        password: "wrong"
      },
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
    ).rejects.toBeInstanceOf(SiroPagosAuthError);
  });
});
