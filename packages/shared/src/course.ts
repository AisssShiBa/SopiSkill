import * as z from "zod";
import {
  dataResponseSchema,
  paginatedResponseSchema,
  utcTimestampSchema,
  uuidSchema,
} from "./common.js";

export const courseStatusSchema = z.enum([
  "draft", "awaiting_approval", "generating", "ready", "failed", "archived",
]);

/** COURSE-01: ownerId, status và id KHÔNG được client gửi. */
export const createCourseRequestSchema = z.strictObject({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(2000).optional(),
});

export const courseCreatedSchema = z.strictObject({
  id: uuidSchema,
  title: z.string().min(1),
  description: z.string().nullable(),
  status: z.literal("draft"),
  createdAt: utcTimestampSchema,
});
export const createCourseResponseSchema = dataResponseSchema(courseCreatedSchema);

export const courseSummarySchema = z.strictObject({
  id: uuidSchema,
  title: z.string().min(1),
  status: courseStatusSchema,
  createdAt: utcTimestampSchema,
});
export const courseListResponseSchema = paginatedResponseSchema(courseSummarySchema);

export const courseDetailSchema = courseSummarySchema.extend({
  description: z.string().nullable(),
  lessonCount: z.number().int().min(0),
  updatedAt: utcTimestampSchema,
});
export const courseDetailResponseSchema = dataResponseSchema(courseDetailSchema);

export const lessonSummarySchema = z.strictObject({
  id: uuidSchema,
  courseId: uuidSchema,
  title: z.string().min(1),
  position: z.number().int().min(1),
});
export const lessonDetailSchema = lessonSummarySchema.extend({
  content: z.string(),
});
export const lessonListResponseSchema = dataResponseSchema(z.array(lessonSummarySchema));
export const lessonDetailResponseSchema = dataResponseSchema(lessonDetailSchema);

export type CourseStatus = z.infer<typeof courseStatusSchema>;
export type CreateCourseRequest = z.infer<typeof createCourseRequestSchema>;
export type CourseSummaryDTO = z.infer<typeof courseSummarySchema>;
export type CourseDetailDTO = z.infer<typeof courseDetailSchema>;
export type LessonSummaryDTO = z.infer<typeof lessonSummarySchema>;
export type LessonDetailDTO = z.infer<typeof lessonDetailSchema>;
