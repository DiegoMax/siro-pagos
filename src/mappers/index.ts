import type {
  AuthSessionWire,
  AuthenticatedSession,
  CreateOfflineQrStringInput,
  CreatePaymentInput,
  CreatePaymentQrStringInput,
  CreateStaticQrPaymentInput,
  CreateStaticQrStringInput,
  CreateVoucherPaymentInput,
  PaymentIntentResponse,
  PaymentIntentWire,
  PaymentQrStringResponse,
  PaymentQrStringWire,
  PaymentRequestSnapshot,
  PaymentRequestWire,
  PaymentResult,
  PaymentResultWire,
  SearchPaymentsInput,
  StaticQrPaymentResponse,
  StaticQrPaymentWire,
  StaticQrStringResponse,
  StaticQrStringWire
} from "../types/public.js";
import { toIsoDate } from "../schemas/common.js";

export function mapAuthSession(
  session: AuthSessionWire,
  now: number = Date.now()
): AuthenticatedSession {
  return {
    accessToken: session.access_token,
    tokenType: session.token_type,
    expiresIn: session.expires_in,
    expiresAt: new Date(now + session.expires_in * 1000),
    raw: session
  };
}

export function mapCreatePaymentInput(input: CreatePaymentInput): Record<string, unknown> {
  return {
    Concepto: input.concept,
    Detalle: input.details.map((detail) => ({
      Descripcion: detail.description,
      Importe: detail.amount
    })),
    FechaExpiracion: toIsoDate(input.expirationDate),
    Importe: input.amount,
    URL_OK: input.successUrl,
    nro_comprobante: input.receiptNumber,
    URL_ERROR: input.errorUrl,
    IdReferenciaOperacion: input.operationReferenceId,
    nro_cliente_empresa: input.companyClientNumber
  };
}

export function mapCreatePaymentQrStringInput(
  input: CreatePaymentQrStringInput
): Record<string, unknown> {
  return {
    Concepto: input.concept,
    Detalle: input.details.map((detail) => ({
      Descripcion: detail.description,
      Importe: detail.amount
    })),
    Importe: input.amount,
    URL_OK: input.successUrl,
    nro_comprobante: input.receiptNumber,
    URL_ERROR: input.errorUrl,
    IdReferenciaOperacion: input.operationReferenceId,
    nro_cliente_empresa: input.companyClientNumber
  };
}

export function mapCreateVoucherPaymentInput(
  input: CreateVoucherPaymentInput
): Record<string, unknown> {
  return {
    nro_cliente_empresa: input.companyClientNumber,
    nro_comprobante: input.receiptNumber,
    URL_OK: input.successUrl,
    URL_ERROR: input.errorUrl,
    IdReferenciaOperacion: input.operationReferenceId,
    UsarVencimientosComprobante: input.useVoucherDueDates
  };
}

export function mapCreateStaticQrStringInput(
  input: CreateStaticQrStringInput
): Record<string, unknown> {
  return {
    nro_empresa: input.companyNumber,
    nro_terminal: input.terminalNumber
  };
}

export function mapCreateStaticQrPaymentInput(
  input: CreateStaticQrPaymentInput
): Record<string, unknown> {
  return {
    nro_terminal: input.terminalNumber,
    Importe: input.amount,
    URL_OK: input.successUrl,
    nro_comprobante: input.receiptNumber,
    URL_ERROR: input.errorUrl,
    IdReferenciaOperacion: input.operationReferenceId,
    nro_cliente_empresa: input.companyClientNumber
  };
}

export function mapCreateOfflineQrStringInput(
  input: CreateOfflineQrStringInput
): Record<string, unknown> {
  if (input.mode === "debt-base") {
    return {
      nro_cliente_empresa: input.companyClientNumber,
      nro_comprobante: input.receiptNumber
    };
  }

  const [first, second, third] = input.installments;

  return {
    vto_1: toIsoDate(first.dueDate),
    importe_1: first.amount,
    vto_2: toIsoDate(second.dueDate),
    importe_2: second.amount,
    vto_3: toIsoDate(third.dueDate),
    importe_3: third.amount,
    nro_cliente_empresa: input.companyClientNumber,
    nro_comprobante: input.receiptNumber
  };
}

export function mapSearchPaymentsInput(
  input: SearchPaymentsInput
): Record<string, unknown> {
  return {
    FechaDesde: toIsoDate(input.fromDate),
    FechaHasta: toIsoDate(input.toDate),
    idReferenciaOperacion: input.operationReferenceId,
    estado: input.state
  };
}

export function mapPaymentIntentResponse<TWire extends PaymentIntentWire>(
  wire: TWire
): PaymentIntentResponse<TWire> {
  return {
    paymentUrl: wire.Url,
    hash: wire.Hash,
    raw: wire
  };
}

export function mapPaymentQrStringResponse(
  wire: PaymentQrStringWire
): PaymentQrStringResponse {
  return {
    qrString: wire.StringQR,
    hash: wire.Hash ?? null,
    raw: wire
  };
}

export function mapStaticQrStringResponse(
  wire: StaticQrStringWire
): StaticQrStringResponse {
  return {
    qrString: wire.StringQREstatico,
    raw: wire
  };
}

export function mapStaticQrPaymentResponse(
  wire: StaticQrPaymentWire
): StaticQrPaymentResponse {
  return {
    hash: wire.Hash,
    paymentUrl: wire.Url ?? null,
    raw: wire
  };
}

export function mapPaymentRequestSnapshot(
  wire: PaymentRequestWire
): PaymentRequestSnapshot {
  return {
    concept: wire.Concepto,
    details: wire.Detalle.map((detail) => ({
      description: detail.Descripcion,
      amount: detail.Importe
    })),
    expirationDate: wire.FechaExpiracion ?? null,
    amount: wire.Importe,
    successUrl: wire.URL_OK,
    errorUrl: wire.URL_ERROR,
    receiptNumber: wire.nro_comprobante,
    operationReferenceId: wire.IdReferenciaOperacion,
    companyClientNumber: wire.nro_cliente_empresa,
    raw: wire
  };
}

export function mapPaymentResult(wire: PaymentResultWire): PaymentResult {
  return {
    settlement: wire.Rendicion ?? null,
    paymentSuccessful: wire.PagoExitoso,
    resultMessage: wire.MensajeResultado,
    operationDate: wire.FechaOperacion,
    recordDate: wire.FechaRegistro,
    operationId: wire.IdOperacion,
    state: wire.Estado,
    operationReferenceId: wire.idReferenciaOperacion ?? null,
    request: wire.Request ? mapPaymentRequestSnapshot(wire.Request) : null,
    raw: wire
  };
}
