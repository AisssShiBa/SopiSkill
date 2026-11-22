import * as z from "zod";
import { dataResponseSchema, uuidSchema } from "./common.js";

export const skillPublicSchema = z.strictObject({
  id: uuidSchema,
  skillKey: z.string().min(1),
  name: z.string().min(1),
});

/** skillId cần prerequisiteSkillId trước khi học. */
export const prerequisiteEdgeSchema = z.strictObject({
  skillId: uuidSchema,
  prerequisiteSkillId: uuidSchema,
});

export const courseSkillGraphSchema = z.strictObject({
  courseId: uuidSchema,
  mappingVersionId: uuidSchema,
  mappingVersionNumber: z.number().int().min(1),
  skills: z.array(skillPublicSchema),
  prerequisites: z.array(prerequisiteEdgeSchema),
});
export const courseSkillGraphResponseSchema = dataResponseSchema(courseSkillGraphSchema);

// Chỉ validate SHAPE. Kiểm tra DAG cycle, cùng course, mapping approved
// là trách nhiệm của Backend / algorithms, không phải packages/shared.
export type SkillPublicDTO = z.infer<typeof skillPublicSchema>;
export type PrerequisiteEdgeDTO = z.infer<typeof prerequisiteEdgeSchema>;
export type CourseSkillGraphDTO = z.infer<typeof courseSkillGraphSchema>;
