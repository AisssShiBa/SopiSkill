import * as z from "zod";
import { dataResponseSchema, utcTimestampSchema, uuidSchema } from "./common.js";

/** Chuẩn hóa email trước khi validate. */
export const emailSchema = z.string().trim().toLowerCase().pipe(z.email());

/** Bcrypt chỉ dùng tối đa 72 byte UTF-8 của mật khẩu. */
export const passwordSchema = z
  .string()
  .min(8)
  .refine((password) => new TextEncoder().encode(password).length <= 72, {
    message: "Mật khẩu không được vượt quá 72 byte UTF-8",
  });

/** AUTH-01 và AUTH-02 có cùng shape request ở MVP. */
export const authCredentialsSchema = z.strictObject({
  email: emailSchema,
  password: passwordSchema,
});

export const userPublicSchema = z.strictObject({
  id: uuidSchema,
  email: z.email(),
  createdAt: utcTimestampSchema,
});

const authUserSummarySchema = userPublicSchema.pick({ id: true, email: true });

export const authRegisterResponseSchema = dataResponseSchema(
  z.strictObject({ user: userPublicSchema }),
);

export const authTokenDataSchema = z.strictObject({
  accessToken: z.string().min(1),
  tokenType: z.literal("Bearer"),
  expiresIn: z.number().int().positive(),
});

export const authLoginResponseSchema = dataResponseSchema(
  authTokenDataSchema.extend({ user: authUserSummarySchema }),
);

export const authRefreshResponseSchema = dataResponseSchema(authTokenDataSchema);
export const authMeResponseSchema = dataResponseSchema(userPublicSchema);

// AUTH-04 logout trả HTTP 204; không định nghĩa JSON body cho endpoint này.
// Refresh Token không xuất hiện trong bất kỳ response JSON nào.
export type AuthCredentials = z.infer<typeof authCredentialsSchema>;
export type UserPublicDTO = z.infer<typeof userPublicSchema>;
export type AuthRegisterResponse = z.infer<typeof authRegisterResponseSchema>;
export type AuthLoginResponse = z.infer<typeof authLoginResponseSchema>;
export type AuthRefreshResponse = z.infer<typeof authRefreshResponseSchema>;
