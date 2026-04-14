import { describe, expect, it } from "vitest";
import { createSiroPagosClient } from "../../src/index.js";

const username = process.env.SIRO_PAGOS_USERNAME;
const password = process.env.SIRO_PAGOS_PASSWORD;
const environment = (process.env.SIRO_PAGOS_ENVIRONMENT as
  | "sandbox"
  | "production"
  | undefined) ?? "sandbox";
const authBaseUrl = process.env.SIRO_PAGOS_AUTH_BASE_URL;
const apiBaseUrl = process.env.SIRO_PAGOS_API_BASE_URL;
const runMutatingSmoke = process.env.SIRO_PAGOS_RUN_MUTATING_SMOKE === "true";

const canRunSmoke = Boolean(username && password);
const canRunMutatingSmoke =
  canRunSmoke && runMutatingSmoke && Boolean(process.env.SIRO_PAGOS_MUTATING_REFERENCE_ID);

describe.skipIf(!canRunSmoke)("smoke", () => {
  it("authenticates against SIRO", async () => {
    const client = createSiroPagosClient({
      environment,
      credentials: {
        username: username ?? "",
        password: password ?? ""
      },
      authBaseUrl,
      apiBaseUrl
    });

    const session = await client.authenticate();
    expect(session.accessToken.length).toBeGreaterThan(0);
  });

  it("searches payments when a reference id is supplied", async () => {
    const referenceId = process.env.SIRO_PAGOS_REFERENCE_ID;

    if (!referenceId) {
      return;
    }

    const client = createSiroPagosClient({
      environment,
      credentials: {
        username: username ?? "",
        password: password ?? ""
      },
      authBaseUrl,
      apiBaseUrl
    });

    const toDate = new Date();
    const fromDate = new Date(toDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    const result = await client.searchPayments({
      fromDate,
      toDate,
      operationReferenceId: referenceId
    });

    expect(Array.isArray(result)).toBe(true);
  });
});

describe.skipIf(!canRunMutatingSmoke)("mutating smoke", () => {
  it("creates a payment intent when explicit opt-in is enabled", async () => {
    const client = createSiroPagosClient({
      environment,
      credentials: {
        username: username ?? "",
        password: password ?? ""
      },
      authBaseUrl,
      apiBaseUrl
    });

    const uniqueRef = process.env.SIRO_PAGOS_MUTATING_REFERENCE_ID ?? `smoke-${Date.now()}`;

    const response = await client.createPayment({
      concept: "Smoke test",
      details: [{ description: "Smoke", amount: 1 }],
      amount: 1,
      expirationDate: new Date(Date.now() + 15 * 60 * 1000),
      successUrl: "https://example.com/ok",
      errorUrl: "https://example.com/error",
      receiptNumber: `smoke-${Date.now()}`,
      operationReferenceId: uniqueRef,
      companyClientNumber: process.env.SIRO_PAGOS_COMPANY_CLIENT_NUMBER ?? ""
    });

    expect(response.hash.length).toBeGreaterThan(0);
  });
});
