import * as z from "zod";

/** Tất cả ID nghiệp vụ công khai sử dụng UUID v4. */
export const uuidSchema = z.uuid({ version: "v4" });

/** Chuỗi UTC theo ISO 8601, có đúng 3 chữ số mili-giây. */
export const utcTimestampSchema = z.iso.datetime({ precision: 3 });

/** Header Idempotency-Key là UUID v4, kiểm tra tách khỏi JSON body. */
export const idempotencyKeySchema = uuidSchema;

export const paginationQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const paginationMetaSchema = z.strictObject({
  page: z.number().int().min(1),
  limit: z.number().int().min(1).max(100),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});

export const errorResponseSchema = z.strictObject({
  error: z.strictObject({
    code: z.string().min(1),
    message: z.string().min(1),
    details: z.unknown().nullable(),
    requestId: uuidSchema,
  }),
});

/** Bộ tạo response wrapper cho API có JSON: { data: ... }. */
export function dataResponseSchema<T extends z.ZodType>(dataSchema: T) {
  return z.strictObject({ data: dataSchema });
}

/** Dùng cho endpoint danh sách có phân trang. */
export function paginatedResponseSchema<T extends z.ZodType>(itemSchema: T) {
  return z.strictObject({
    data: z.array(itemSchema),
    meta: paginationMetaSchema,
  });
}

export type UUID = z.infer<typeof uuidSchema>;
export type UtcTimestamp = z.infer<typeof utcTimestampSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type PaginationMeta = z.infer<typeof paginationMetaSchema>;
export type ApiErrorResponse = z.infer<typeof errorResponseSchema>;
