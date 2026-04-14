import type { ZodIssue } from "zod";

export interface SiroErrorContext {
  endpoint?: string;
  statusCode?: number;
  responseBody?: unknown;
  responseHeaders?: Record<string, string>;
  issues?: ZodIssue[];
  cause?: unknown;
}

export class SiroPagosError extends Error {
  readonly endpoint?: string;
  readonly statusCode?: number;
  readonly responseBody?: unknown;
  readonly responseHeaders?: Record<string, string>;
  readonly issues?: ZodIssue[];

  constructor(message: string, context: SiroErrorContext = {}) {
    super(message, context.cause ? { cause: context.cause } : undefined);
    this.name = new.target.name;
    this.endpoint = context.endpoint;
    this.statusCode = context.statusCode;
    this.responseBody = context.responseBody;
    this.responseHeaders = context.responseHeaders;
    this.issues = context.issues;
  }
}

export class SiroPagosValidationError extends SiroPagosError {}

export class SiroPagosAuthError extends SiroPagosError {}

export class SiroPagosHttpError extends SiroPagosError {}

export class SiroPagosResponseValidationError extends SiroPagosError {}

export class SiroPagosRequestError extends SiroPagosError {}
