import * as z from "zod";
import { dataResponseSchema, utcTimestampSchema, uuidSchema } from "./common.js";

/** Chốt enum 3 cấp độ thay cho draft chỉ có beginner. */
export const targetLevelSchema = z.enum(["beginner", "intermediate", "advanced"]);

export const generationRequestSchema = z.strictObject({
  learningGoal: z.string().trim().min(1).max(2000),
  targetLevel: targetLevelSchema,
  lessonCount: z.number().int().min(1).max(20),
});

export const generationJobStatusSchema = z.enum([
  "queued", "running", "succeeded", "failed", "cancelled",
]);

/** GEN-01: HTTP 202, Job mới được queue, Course đang generating. */
export const generationAcceptedSchema = z.strictObject({
  courseId: uuidSchema,
  jobId: uuidSchema,
  jobStatus: z.literal("queued"),
  courseStatus: z.literal("generating"),
});
export const generationAcceptedResponseSchema = dataResponseSchema(generationAcceptedSchema);

/** GEN-02: progress/finishedAt có thể null hoặc vắng mặt khi job chưa xong. */
export const generationJobPublicSchema = z.strictObject({
  jobId: uuidSchema,
  courseId: uuidSchema,
  status: generationJobStatusSchema,
  progress: z.number().int().min(0).max(100).nullable().optional(),
  finishedAt: utcTimestampSchema.nullable().optional(),
});
export const generationJobResponseSchema = dataResponseSchema(generationJobPublicSchema);

/** GEN-03: Chỉ backend có quyền chuyển Course sang ready. */
export const courseApprovalResultSchema = z.strictObject({
  courseId: uuidSchema,
  status: z.literal("ready"),
  approvedMappingVersionId: uuidSchema,
});
export const courseApprovalResponseSchema = dataResponseSchema(courseApprovalResultSchema);

export type TargetLevel = z.infer<typeof targetLevelSchema>;
export type GenerationRequest = z.infer<typeof generationRequestSchema>;
export type GenerationJobStatus = z.infer<typeof generationJobStatusSchema>;
export type GenerationAcceptedDTO = z.infer<typeof generationAcceptedSchema>;
export type GenerationJobPublicDTO = z.infer<typeof generationJobPublicSchema>;
export type CourseApprovalResultDTO = z.infer<typeof courseApprovalResultSchema>;
