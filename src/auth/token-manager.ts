import type {
  AuthenticatedSession,
  FetchLike,
  SiroCredentials
} from "../types/public.js";
import { authSessionWireSchema, authCredentialsSchema } from "../schemas/auth.js";
import { mapAuthSession } from "../mappers/index.js";
import {
  SiroPagosAuthError,
  SiroPagosHttpError,
  SiroPagosRequestError,
  SiroPagosResponseValidationError,
  SiroPagosValidationError
} from "../errors/index.js";
import { headersToObject } from "../schemas/common.js";

interface TokenManagerConfig {
  baseUrl: string;
  endpoint: string;
  credentials: SiroCredentials;
  fetch: FetchLike;
  timeoutMs: number;
  refreshSkewMs: number;
}

export class TokenManager {
  private readonly baseUrl: string;
  private readonly endpoint: string;
  private readonly credentials: SiroCredentials;
  private readonly fetchImpl: FetchLike;
  private readonly timeoutMs: number;
  private readonly refreshSkewMs: number;
  private currentSession: AuthenticatedSession | null = null;
  private pendingAuthentication: Promise<AuthenticatedSession> | null = null;

  constructor(config: TokenManagerConfig) {
    const parsedCredentials = authCredentialsSchema.safeParse(config.credentials);

    if (!parsedCredentials.success) {
      throw new SiroPagosValidationError("Invalid SIRO credentials.", {
        issues: parsedCredentials.error.issues
      });
    }

    this.baseUrl = config.baseUrl;
    this.endpoint = config.endpoint;
    this.credentials = parsedCredentials.data;
    this.fetchImpl = config.fetch;
    this.timeoutMs = config.timeoutMs;
    this.refreshSkewMs = config.refreshSkewMs;
  }

  async authenticate(forceRefresh = false): Promise<AuthenticatedSession> {
    if (!forceRefresh && this.currentSession && this.isSessionUsable(this.currentSession)) {
      return this.currentSession;
    }

    if (this.pendingAuthentication) {
      return this.pendingAuthentication;
    }

    this.pendingAuthentication = this.performAuthentication();

    try {
      this.currentSession = await this.pendingAuthentication;
      return this.currentSession;
    } finally {
      this.pendingAuthentication = null;
    }
  }

  private isSessionUsable(session: AuthenticatedSession): boolean {
    return session.expiresAt.getTime() - Date.now() > this.refreshSkewMs;
  }

  private async performAuthentication(): Promise<AuthenticatedSession> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const endpoint = `${this.baseUrl}${this.endpoint}`;

    try {
      const response = await this.fetchImpl(endpoint, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          Usuario: this.credentials.username,
          Password: this.credentials.password
        }),
        signal: controller.signal
      });

      const rawBody = await response.text();
      const parsedBody = rawBody ? tryParseJson(rawBody) : null;

      if (!response.ok) {
        const ErrorType =
          response.status === 401 ? SiroPagosAuthError : SiroPagosHttpError;
        throw new ErrorType("Failed to authenticate with SIRO Pagos.", {
          endpoint,
          statusCode: response.status,
          responseBody: parsedBody ?? rawBody,
          responseHeaders: headersToObject(response.headers)
        });
      }

      const parsedSession = authSessionWireSchema.safeParse(parsedBody);

      if (!parsedSession.success) {
        throw new SiroPagosResponseValidationError(
          "Authentication response did not match the documented schema.",
          {
            endpoint,
            statusCode: response.status,
            responseBody: parsedBody,
            responseHeaders: headersToObject(response.headers),
            issues: parsedSession.error.issues
          }
        );
      }

      return mapAuthSession(parsedSession.data);
    } catch (error) {
      if (
        error instanceof SiroPagosAuthError ||
        error instanceof SiroPagosHttpError ||
        error instanceof SiroPagosResponseValidationError
      ) {
        throw error;
      }

      if (controller.signal.aborted) {
        throw new SiroPagosRequestError("Authentication request timed out.", {
          endpoint,
          cause: error
        });
      }

      throw new SiroPagosRequestError("Authentication request failed.", {
        endpoint,
        cause: error
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}

function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
