import type { ZodType } from "zod";
import type { AuthenticatedSession, FetchLike } from "../types/public.js";
import {
  SiroPagosHttpError,
  SiroPagosRequestError,
  SiroPagosResponseValidationError
} from "../errors/index.js";
import { headersToObject } from "../schemas/common.js";

export interface SendRequestOptions<TResponse> {
  endpoint: string;
  method?: "GET" | "POST";
  authSession?: AuthenticatedSession;
  body?: unknown;
  responseSchema: ZodType<TResponse>;
}

export class SiroHttpClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;
  private readonly timeoutMs: number;

  constructor(config: { baseUrl: string; fetch: FetchLike; timeoutMs: number }) {
    this.baseUrl = config.baseUrl;
    this.fetchImpl = config.fetch;
    this.timeoutMs = config.timeoutMs;
  }

  async send<TResponse>({
    endpoint,
    method = "POST",
    authSession,
    body,
    responseSchema
  }: SendRequestOptions<TResponse>): Promise<TResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await this.fetchImpl(url, {
        method,
        headers: {
          accept: "application/json",
          ...(body !== undefined ? { "content-type": "application/json" } : {}),
          ...(authSession
            ? { authorization: `Bearer ${authSession.accessToken}` }
            : {})
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });

      const text = await response.text();
      const parsedBody = text ? tryParseJson(text) : null;

      if (!response.ok) {
        throw new SiroPagosHttpError(buildHttpErrorMessage(response.status, endpoint), {
          endpoint: url,
          statusCode: response.status,
          responseBody: parsedBody ?? text,
          responseHeaders: headersToObject(response.headers)
        });
      }

      const parsedResponse = responseSchema.safeParse(parsedBody);

      if (!parsedResponse.success) {
        throw new SiroPagosResponseValidationError(
          `SIRO response for ${endpoint} did not match the documented schema.`,
          {
            endpoint: url,
            statusCode: response.status,
            responseBody: parsedBody,
            responseHeaders: headersToObject(response.headers),
            issues: parsedResponse.error.issues
          }
        );
      }

      return parsedResponse.data;
    } catch (error) {
      if (
        error instanceof SiroPagosHttpError ||
        error instanceof SiroPagosResponseValidationError
      ) {
        throw error;
      }

      if (controller.signal.aborted) {
        throw new SiroPagosRequestError(`Request to ${endpoint} timed out.`, {
          endpoint: url,
          cause: error
        });
      }

      throw new SiroPagosRequestError(`Request to ${endpoint} failed.`, {
        endpoint: url,
        cause: error
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}

function buildHttpErrorMessage(statusCode: number, endpoint: string): string {
  return `SIRO returned HTTP ${statusCode} for ${endpoint}.`;
}

function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
