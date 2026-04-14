export type SiroEnvironment = "sandbox" | "production";

export type FetchLike = typeof fetch;

export interface SiroCredentials {
  username: string;
  password: string;
}

export interface SiroPagosClientConfig {
  environment: SiroEnvironment;
  credentials: SiroCredentials;
  authBaseUrl?: string;
  apiBaseUrl?: string;
  fetch?: FetchLike;
  timeoutMs?: number;
  tokenRefreshSkewMs?: number;
}

export interface PaymentDetailInput {
  description: string;
  amount: number;
}

export interface PaymentDetailWire {
  Descripcion: string;
  Importe: number;
}

export interface PaymentRequestWire {
  Concepto: string;
  Detalle: PaymentDetailWire[];
  FechaExpiracion?: string | null;
  Importe: number;
  URL_OK: string;
  nro_comprobante: string;
  URL_ERROR: string;
  IdReferenciaOperacion: string;
  nro_cliente_empresa: string;
}

export interface CreatePaymentInput {
  concept: string;
  details: PaymentDetailInput[];
  expirationDate?: Date | string | null;
  amount: number;
  successUrl: string;
  errorUrl: string;
  receiptNumber: string;
  operationReferenceId: string;
  companyClientNumber: string;
}

export interface CreatePaymentQrStringInput {
  concept: string;
  details: PaymentDetailInput[];
  amount: number;
  successUrl: string;
  errorUrl: string;
  receiptNumber: string;
  operationReferenceId: string;
  companyClientNumber: string;
}

export interface CreateVoucherPaymentInput {
  companyClientNumber: string;
  receiptNumber: string;
  successUrl: string;
  errorUrl: string;
  operationReferenceId: string;
  useVoucherDueDates: boolean;
}

export interface CreateStaticQrStringInput {
  companyNumber: string;
  terminalNumber: string;
}

export interface CreateStaticQrPaymentInput {
  terminalNumber: string;
  amount: number;
  successUrl: string;
  errorUrl: string;
  receiptNumber: string;
  operationReferenceId: string;
  companyClientNumber: string;
}

export interface OfflineQrInstallmentInput {
  dueDate: Date | string;
  amount: number;
}

export interface CreateOfflineQrStringWithDueDatesInput {
  mode: "due-dates";
  companyClientNumber: string;
  receiptNumber: string;
  installments: [
    OfflineQrInstallmentInput,
    OfflineQrInstallmentInput,
    OfflineQrInstallmentInput
  ];
}

export interface CreateOfflineQrStringFromDebtBaseInput {
  mode: "debt-base";
  companyClientNumber: string;
  receiptNumber: string;
}

export type CreateOfflineQrStringInput =
  | CreateOfflineQrStringWithDueDatesInput
  | CreateOfflineQrStringFromDebtBaseInput;

export interface GetPaymentResultInput {
  hash: string;
  resultId: string;
}

export type PaymentState =
  | "PROCESADA"
  | "CANCELADA"
  | "ERROR"
  | "RECHAZADA"
  | (string & {});

export interface SearchPaymentsInput {
  fromDate: Date | string;
  toDate: Date | string;
  operationReferenceId?: string;
  state?: PaymentState;
}

export interface AuthSessionWire {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthenticatedSession {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  expiresAt: Date;
  raw: AuthSessionWire;
}

export interface PaymentIntentWire {
  Url: string;
  Hash: string;
}

export interface PaymentQrStringWire {
  StringQR: string;
  Hash?: string;
}

export interface StaticQrStringWire {
  StringQREstatico: string;
}

export interface StaticQrPaymentWire {
  Url?: string;
  Hash: string;
}

export interface PaymentIntentResponse<TWire = PaymentIntentWire> {
  paymentUrl: string;
  hash: string;
  raw: TWire;
}

export interface PaymentQrStringResponse {
  qrString: string;
  hash: string | null;
  raw: PaymentQrStringWire;
}

export interface StaticQrStringResponse {
  qrString: string;
  raw: StaticQrStringWire;
}

export interface StaticQrPaymentResponse {
  hash: string;
  paymentUrl: string | null;
  raw: StaticQrPaymentWire;
}

export interface PaymentRequestSnapshot {
  concept: string;
  details: PaymentDetailInput[];
  expirationDate: string | null;
  amount: number;
  successUrl: string;
  errorUrl: string;
  receiptNumber: string;
  operationReferenceId: string;
  companyClientNumber: string;
  raw: PaymentRequestWire;
}

export interface PaymentResultWire {
  Rendicion?: unknown | null;
  PagoExitoso: boolean;
  MensajeResultado: string;
  FechaOperacion: string | null;
  FechaRegistro: string | null;
  IdOperacion: string;
  Estado: string;
  idReferenciaOperacion?: string | null;
  Request?: PaymentRequestWire;
}

export interface PaymentResult {
  settlement: unknown | null;
  paymentSuccessful: boolean;
  resultMessage: string;
  operationDate: string | null;
  recordDate: string | null;
  operationId: string;
  state: PaymentState;
  operationReferenceId: string | null;
  request: PaymentRequestSnapshot | null;
  raw: PaymentResultWire;
}

export interface SiroPagosClient {
  authenticate(): Promise<AuthenticatedSession>;
  createPayment(input: CreatePaymentInput): Promise<PaymentIntentResponse>;
  createPaymentQrString(
    input: CreatePaymentQrStringInput
  ): Promise<PaymentQrStringResponse>;
  createVoucherPayment(
    input: CreateVoucherPaymentInput
  ): Promise<PaymentIntentResponse>;
  createStaticQrString(
    input: CreateStaticQrStringInput
  ): Promise<StaticQrStringResponse>;
  createStaticQrPayment(
    input: CreateStaticQrPaymentInput
  ): Promise<StaticQrPaymentResponse>;
  getPaymentResult(input: GetPaymentResultInput): Promise<PaymentResult>;
  searchPayments(input: SearchPaymentsInput): Promise<PaymentResult[]>;
  createOfflineQrString(
    input: CreateOfflineQrStringInput
  ): Promise<PaymentQrStringResponse>;
}
