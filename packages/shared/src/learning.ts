import * as z from "zod";
import { dataResponseSchema, utcTimestampSchema, uuidSchema } from "./common.js";
import { masteryStatusSchema } from "./quiz.js";

export const learnerSkillItemSchema = z.strictObject({
  skillId: uuidSchema,
  skillKey: z.string().min(1),
  name: z.string().min(1),
  status: masteryStatusSchema,
  updatedAt: utcTimestampSchema,
});

export const learnerStateSchema = z.strictObject({
  courseId: uuidSchema,
  modelType: z.literal("rule_based"),
  modelVersion: z.string().min(1),
  skills: z.array(learnerSkillItemSchema),
});
export const learnerStateResponseSchema = dataResponseSchema(learnerStateSchema);

export const policyActionSchema = z.enum([
  "review_skill", "practice_skill", "next_lesson",
  "mini_pretest", "continue_learning",
]);

export const policyDecisionSchema = z.strictObject({
  id: uuidSchema,
  courseId: uuidSchema,
  action: policyActionSchema,
  targetSkillId: uuidSchema.nullable(),
  reasonCode: z.string().min(1),
  message: z.string(),
  policyVersion: z.string().min(1),
  createdAt: utcTimestampSchema,
});

/** GET /next-action trả data: null nếu chưa có quyết định. */
export const nextActionResponseSchema = dataResponseSchema(policyDecisionSchema.nullable());

// Shared KHÔNG tính trạng thái mastery hoặc ra quyết định học tập.
export type LearnerSkillItemDTO = z.infer<typeof learnerSkillItemSchema>;
export type LearnerStateDTO = z.infer<typeof learnerStateSchema>;
export type PolicyAction = z.infer<typeof policyActionSchema>;
export type PolicyDecisionDTO = z.infer<typeof policyDecisionSchema>;
