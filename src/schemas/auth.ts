import { z } from "zod";
import { nonEmptyStringSchema } from "./common.js";

export const authCredentialsSchema = z
  .object({
    username: nonEmptyStringSchema,
    password: nonEmptyStringSchema
  })
  .strict();

export const authSessionWireSchema = z
  .object({
    access_token: z.string().min(1),
    token_type: z.string().min(1),
    expires_in: z.number().int().positive()
  })
  .strict();
