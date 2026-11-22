import * as z from "zod";
import { dataResponseSchema, utcTimestampSchema, uuidSchema } from "./common.js";
import { skillPublicSchema } from "./knowledge.js";

export const questionTypeSchema = z.literal("single_choice");

export const optionPublicSchema = z.strictObject({
  id: z.string().min(1), // Ổn định trong một QuestionVersion, không bắt buộc UUID.
  text: z.string().min(1),
});

export const questionPublicSchema = z.strictObject({
  id: uuidSchema, // Question.id (định danh logic)
  questionVersionId: uuidSchema,
  versionNumber: z.number().int().min(1),
  type: questionTypeSchema,
  prompt: z.string().min(1),
  options: z.array(optionPublicSchema).min(2).refine(
    (options) => new Set(options.map((option) => option.id)).size === options.length,
    { message: "Option IDs must be unique within one question version" },
  ),
});
export const questionListResponseSchema = dataResponseSchema(z.array(questionPublicSchema));

/** QUIZ-02 body; Idempotency-Key được kiểm tra riêng ở header. */
export const submitAttemptRequestSchema = z.strictObject({
  questionVersionId: uuidSchema,
  selectedOptionId: z.string().min(1),
});

export const masteryStatusSchema = z.enum([
  "insufficient_data", "learning", "proficient", "needs_review",
]);

export const submitAttemptResultSchema = z.strictObject({
  attemptId: uuidSchema,
  questionId: uuidSchema,
  questionVersionId: uuidSchema,
  isCorrect: z.boolean(),
  feedback: z.string(),
  skill: skillPublicSchema,
  masteryStatus: masteryStatusSchema,
  submittedAt: utcTimestampSchema,
});
export const submitAttemptResponseSchema = dataResponseSchema(submitAttemptResultSchema);

// Không có answerKey, correctOptionId, isCorrect trong QuestionPublicDTO.
// Không có userId, hintsUsed, isCorrect trong SubmitAttemptRequest.
export type QuestionPublicDTO = z.infer<typeof questionPublicSchema>;
export type SubmitAttemptRequest = z.infer<typeof submitAttemptRequestSchema>;
export type SubmitAttemptResult = z.infer<typeof submitAttemptResultSchema>;
export type MasteryStatus = z.infer<typeof masteryStatusSchema>;
