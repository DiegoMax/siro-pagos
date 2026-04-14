import { z } from "zod";
import {
  amountSchema,
  dateLikeSchema,
  nonEmptyStringSchema,
  terminalNumberSchema,
  urlSchema
} from "./common.js";

const paymentDetailInputSchema = z
  .object({
    description: nonEmptyStringSchema,
    amount: amountSchema
  })
  .strict();

export const createPaymentInputSchema = z
  .object({
    concept: nonEmptyStringSchema,
    details: z.array(paymentDetailInputSchema).min(1),
    expirationDate: dateLikeSchema.nullish(),
    amount: amountSchema,
    successUrl: urlSchema,
    errorUrl: urlSchema,
    receiptNumber: nonEmptyStringSchema,
    operationReferenceId: nonEmptyStringSchema,
    companyClientNumber: nonEmptyStringSchema
  })
  .strict()
  .superRefine((value, ctx) => {
    const detailTotal = value.details.reduce((sum, detail) => sum + detail.amount, 0);
    if (Math.abs(detailTotal - value.amount) > 0.000001) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Amount must match the sum of all detail line items.",
        path: ["amount"]
      });
    }
  });

export const createPaymentQrStringInputSchema = z
  .object({
    concept: nonEmptyStringSchema,
    details: z.array(paymentDetailInputSchema).min(1),
    amount: amountSchema,
    successUrl: urlSchema,
    errorUrl: urlSchema,
    receiptNumber: nonEmptyStringSchema,
    operationReferenceId: nonEmptyStringSchema,
    companyClientNumber: nonEmptyStringSchema
  })
  .strict()
  .superRefine((value, ctx) => {
    const detailTotal = value.details.reduce((sum, detail) => sum + detail.amount, 0);
    if (Math.abs(detailTotal - value.amount) > 0.000001) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Amount must match the sum of all detail line items.",
        path: ["amount"]
      });
    }
  });

export const createVoucherPaymentInputSchema = z
  .object({
    companyClientNumber: nonEmptyStringSchema,
    receiptNumber: nonEmptyStringSchema,
    successUrl: urlSchema,
    errorUrl: urlSchema,
    operationReferenceId: nonEmptyStringSchema,
    useVoucherDueDates: z.boolean()
  })
  .strict();

export const createStaticQrStringInputSchema = z
  .object({
    companyNumber: nonEmptyStringSchema,
    terminalNumber: terminalNumberSchema
  })
  .strict();

export const createStaticQrPaymentInputSchema = z
  .object({
    terminalNumber: terminalNumberSchema,
    amount: amountSchema,
    successUrl: urlSchema,
    errorUrl: urlSchema,
    receiptNumber: nonEmptyStringSchema,
    operationReferenceId: nonEmptyStringSchema,
    companyClientNumber: nonEmptyStringSchema
  })
  .strict();

const offlineQrInstallmentSchema = z
  .object({
    dueDate: dateLikeSchema,
    amount: amountSchema
  })
  .strict();

const createOfflineQrStringWithDueDatesInputSchema = z
  .object({
    mode: z.literal("due-dates"),
    companyClientNumber: nonEmptyStringSchema,
    receiptNumber: nonEmptyStringSchema,
    installments: z.tuple([
      offlineQrInstallmentSchema,
      offlineQrInstallmentSchema,
      offlineQrInstallmentSchema
    ])
  })
  .strict();

const createOfflineQrStringFromDebtBaseInputSchema = z
  .object({
    mode: z.literal("debt-base"),
    companyClientNumber: nonEmptyStringSchema,
    receiptNumber: nonEmptyStringSchema
  })
  .strict();

export const createOfflineQrStringInputSchema = z
  .union([
    createOfflineQrStringWithDueDatesInputSchema,
    createOfflineQrStringFromDebtBaseInputSchema
  ])
  .superRefine((value, ctx) => {
    if (value.mode !== "due-dates") {
      return;
    }

    const [first, second, third] = value.installments;
    const firstTimestamp = new Date(first!.dueDate).valueOf();
    const secondTimestamp = new Date(second!.dueDate).valueOf();
    const thirdTimestamp = new Date(third!.dueDate).valueOf();

    if (!(firstTimestamp < secondTimestamp && secondTimestamp < thirdTimestamp)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Installment due dates must be strictly increasing.",
        path: ["installments"]
      });
    }
  });

export const getPaymentResultInputSchema = z
  .object({
    hash: nonEmptyStringSchema,
    resultId: nonEmptyStringSchema
  })
  .strict();

export const searchPaymentsInputSchema = z
  .object({
    fromDate: dateLikeSchema,
    toDate: dateLikeSchema,
    operationReferenceId: nonEmptyStringSchema.optional(),
    state: nonEmptyStringSchema.optional()
  })
  .strict()
  .superRefine((value, ctx) => {
    const from = new Date(value.fromDate).valueOf();
    const to = new Date(value.toDate).valueOf();
    if (from > to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "fromDate must be before or equal to toDate.",
        path: ["fromDate"]
      });
    }
  });

const paymentDetailWireSchema = z
  .object({
    Descripcion: z.string(),
    Importe: z.number()
  })
  .strict();

export const paymentRequestWireSchema = z
  .object({
    Concepto: z.string(),
    Detalle: z.array(paymentDetailWireSchema),
    FechaExpiracion: z.string().nullable().optional(),
    Importe: z.number(),
    URL_OK: z.string(),
    nro_comprobante: z.string(),
    URL_ERROR: z.string(),
    IdReferenciaOperacion: z.string(),
    nro_cliente_empresa: z.string()
  })
  .strict();

export const paymentIntentWireSchema = z
  .object({
    Url: z.string().url(),
    Hash: z.string().min(1)
  })
  .strict();

export const paymentQrStringWireSchema = z
  .object({
    StringQR: z.string().min(1),
    Hash: z.string().min(1).optional()
  })
  .strict();

export const staticQrStringWireSchema = z
  .object({
    StringQREstatico: z.string().min(1)
  })
  .strict();

export const staticQrPaymentWireSchema = z
  .union([
    paymentIntentWireSchema,
    z
      .object({
        Hash: z.string().min(1)
      })
      .strict()
  ])
  .transform((value) => ({
    Hash: value.Hash,
    Url: "Url" in value ? value.Url : undefined
  }));

export const paymentResultWireSchema = z
  .object({
    Rendicion: z.unknown().nullable().optional(),
    PagoExitoso: z.boolean(),
    MensajeResultado: z.string(),
    FechaOperacion: z.string().nullable(),
    FechaRegistro: z.string().nullable(),
    IdOperacion: z.string(),
    Estado: z.string(),
    idReferenciaOperacion: z.string().nullable().optional(),
    Request: paymentRequestWireSchema.optional()
  })
  .strict();

export const searchPaymentsWireSchema = z.array(paymentResultWireSchema);
