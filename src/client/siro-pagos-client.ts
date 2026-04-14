import { TokenManager } from "../auth/token-manager.js";
import { SiroHttpClient } from "./http-client.js";
import { ENDPOINTS, resolveBaseUrls } from "../endpoints/constants.js";
import {
  mapCreateOfflineQrStringInput,
  mapCreatePaymentInput,
  mapCreatePaymentQrStringInput,
  mapCreateStaticQrPaymentInput,
  mapCreateStaticQrStringInput,
  mapCreateVoucherPaymentInput,
  mapPaymentIntentResponse,
  mapPaymentQrStringResponse,
  mapPaymentResult,
  mapSearchPaymentsInput,
  mapStaticQrPaymentResponse,
  mapStaticQrStringResponse
} from "../mappers/index.js";
import {
  createOfflineQrStringInputSchema,
  createPaymentInputSchema,
  createPaymentQrStringInputSchema,
  createStaticQrPaymentInputSchema,
  createStaticQrStringInputSchema,
  createVoucherPaymentInputSchema,
  getPaymentResultInputSchema,
  paymentIntentWireSchema,
  paymentQrStringWireSchema,
  paymentResultWireSchema,
  searchPaymentsInputSchema,
  searchPaymentsWireSchema,
  staticQrPaymentWireSchema,
  staticQrStringWireSchema
} from "../schemas/payment.js";
import {
  SiroPagosValidationError
} from "../errors/index.js";
import type {
  AuthenticatedSession,
  CreateOfflineQrStringInput,
  CreatePaymentInput,
  CreatePaymentQrStringInput,
  CreateStaticQrPaymentInput,
  CreateStaticQrStringInput,
  CreateVoucherPaymentInput,
  GetPaymentResultInput,
  PaymentIntentResponse,
  PaymentQrStringResponse,
  PaymentResult,
  SearchPaymentsInput,
  SiroPagosClient,
  SiroPagosClientConfig,
  StaticQrPaymentResponse,
  StaticQrStringResponse
} from "../types/public.js";

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_REFRESH_SKEW_MS = 30_000;

export function createSiroPagosClient(
  config: SiroPagosClientConfig
): SiroPagosClient {
  const baseUrls = resolveBaseUrls(
    config.environment,
    config.authBaseUrl,
    config.apiBaseUrl
  );
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const tokenRefreshSkewMs = config.tokenRefreshSkewMs ?? DEFAULT_REFRESH_SKEW_MS;
  const fetchImpl = config.fetch ?? globalThis.fetch;

  const tokenManager = new TokenManager({
    baseUrl: baseUrls.authBaseUrl,
    endpoint: ENDPOINTS.authenticate,
    credentials: config.credentials,
    fetch: fetchImpl,
    timeoutMs,
    refreshSkewMs: tokenRefreshSkewMs
  });

  const httpClient = new SiroHttpClient({
    baseUrl: baseUrls.apiBaseUrl,
    fetch: fetchImpl,
    timeoutMs
  });

  async function withSession<T>(
    callback: (session: AuthenticatedSession) => Promise<T>
  ): Promise<T> {
    const session = await tokenManager.authenticate();
    return callback(session);
  }

  return {
    authenticate: () => tokenManager.authenticate(true),

    async createPayment(input): Promise<PaymentIntentResponse> {
      const parsedInput = parseOrThrow(
        createPaymentInputSchema,
        input,
        "Invalid createPayment input."
      );

      return withSession(async (session) => {
        const response = await httpClient.send({
          endpoint: ENDPOINTS.createPayment,
          authSession: session,
          body: mapCreatePaymentInput(parsedInput),
          responseSchema: paymentIntentWireSchema
        });

        return mapPaymentIntentResponse(response);
      });
    },

    async createPaymentQrString(
      input
    ): Promise<PaymentQrStringResponse> {
      const parsedInput = parseOrThrow(
        createPaymentQrStringInputSchema,
        input,
        "Invalid createPaymentQrString input."
      );

      return withSession(async (session) => {
        const response = await httpClient.send({
          endpoint: ENDPOINTS.createPaymentQrString,
          authSession: session,
          body: mapCreatePaymentQrStringInput(parsedInput),
          responseSchema: paymentQrStringWireSchema
        });

        return mapPaymentQrStringResponse(response);
      });
    },

    async createVoucherPayment(input): Promise<PaymentIntentResponse> {
      const parsedInput = parseOrThrow(
        createVoucherPaymentInputSchema,
        input,
        "Invalid createVoucherPayment input."
      );

      return withSession(async (session) => {
        const response = await httpClient.send({
          endpoint: ENDPOINTS.createVoucherPayment,
          authSession: session,
          body: mapCreateVoucherPaymentInput(parsedInput),
          responseSchema: paymentIntentWireSchema
        });

        return mapPaymentIntentResponse(response);
      });
    },

    async createStaticQrString(
      input
    ): Promise<StaticQrStringResponse> {
      const parsedInput = parseOrThrow(
        createStaticQrStringInputSchema,
        input,
        "Invalid createStaticQrString input."
      );

      return withSession(async (session) => {
        const response = await httpClient.send({
          endpoint: ENDPOINTS.createStaticQrString,
          authSession: session,
          body: mapCreateStaticQrStringInput(parsedInput),
          responseSchema: staticQrStringWireSchema
        });

        return mapStaticQrStringResponse(response);
      });
    },

    async createStaticQrPayment(
      input
    ): Promise<StaticQrPaymentResponse> {
      const parsedInput = parseOrThrow(
        createStaticQrPaymentInputSchema,
        input,
        "Invalid createStaticQrPayment input."
      );

      return withSession(async (session) => {
        const response = await httpClient.send({
          endpoint: ENDPOINTS.createStaticQrPayment,
          authSession: session,
          body: mapCreateStaticQrPaymentInput(parsedInput),
          responseSchema: staticQrPaymentWireSchema
        });

        return mapStaticQrPaymentResponse(response);
      });
    },

    async getPaymentResult(input): Promise<PaymentResult> {
      const parsedInput = parseOrThrow(
        getPaymentResultInputSchema,
        input,
        "Invalid getPaymentResult input."
      );

      return withSession(async (session) => {
        const response = await httpClient.send({
          endpoint: ENDPOINTS.getPaymentResult(
            parsedInput.hash,
            parsedInput.resultId
          ),
          method: "GET",
          authSession: session,
          responseSchema: paymentResultWireSchema
        });

        return mapPaymentResult(response);
      });
    },

    async searchPayments(input): Promise<PaymentResult[]> {
      const parsedInput = parseOrThrow(
        searchPaymentsInputSchema,
        input,
        "Invalid searchPayments input."
      );

      return withSession(async (session) => {
        const response = await httpClient.send({
          endpoint: ENDPOINTS.searchPayments,
          authSession: session,
          body: mapSearchPaymentsInput(parsedInput),
          responseSchema: searchPaymentsWireSchema
        });

        return response.map(mapPaymentResult);
      });
    },

    async createOfflineQrString(
      input
    ): Promise<PaymentQrStringResponse> {
      const parsedInput = parseOrThrow(
        createOfflineQrStringInputSchema,
        input,
        "Invalid createOfflineQrString input."
      );

      return withSession(async (session) => {
        const response = await httpClient.send({
          endpoint: ENDPOINTS.createOfflineQrString,
          authSession: session,
          body: mapCreateOfflineQrStringInput(parsedInput),
          responseSchema: paymentQrStringWireSchema
        });

        return mapPaymentQrStringResponse(response);
      });
    }
  };
}

function parseOrThrow<T>(
  schema: { safeParse(value: unknown): { success: true; data: T } | { success: false; error: { issues: import("zod").ZodIssue[] } } },
  input: unknown,
  message: string
): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new SiroPagosValidationError(message, {
      issues: result.error.issues
    });
  }

  return result.data;
}
