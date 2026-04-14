import type { SiroEnvironment } from "../types/public.js";

export interface ResolvedBaseUrls {
  authBaseUrl: string;
  apiBaseUrl: string;
}

const DEFAULT_BASE_URLS: Record<SiroEnvironment, ResolvedBaseUrls> = {
  sandbox: {
    authBaseUrl: "https://apisesionh.bancoroela.com.ar",
    apiBaseUrl: "https://siropagosh.bancoroela.com.ar"
  },
  production: {
    authBaseUrl: "https://apisesion.bancoroela.com.ar",
    apiBaseUrl: "https://siropagos.bancoroela.com.ar"
  }
};

export function resolveBaseUrls(
  environment: SiroEnvironment,
  authBaseUrl?: string,
  apiBaseUrl?: string
): ResolvedBaseUrls {
  const defaults = DEFAULT_BASE_URLS[environment];

  return {
    authBaseUrl: authBaseUrl ?? defaults.authBaseUrl,
    apiBaseUrl: apiBaseUrl ?? defaults.apiBaseUrl
  };
}

export const ENDPOINTS = {
  authenticate: "/auth/Sesion",
  createPayment: "/api/Pago",
  createPaymentQrString: "/api/Pago/StringQR",
  createVoucherPayment: "/api/Pago/Comprobante",
  createStaticQrString: "/api/Pago/StringQREstatico",
  createStaticQrPayment: "/api/QREstatico",
  getPaymentResult: (hash: string, resultId: string) =>
    `/api/Pago/${encodeURIComponent(hash)}/${encodeURIComponent(resultId)}`,
  searchPayments: "/api/Pago/Consulta",
  createOfflineQrString: "/api/Pago/StringQROffline"
} as const;
