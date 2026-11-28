import { Router } from "express";

import { listLessonQuestionsHandler } from "../controllers/lesson-question.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

export const lessonQuestionRouter = Router();

// QUIZ-01: GET /api/v1/lessons/:lessonId/questions
lessonQuestionRouter.get("/:lessonId/questions", requireAuth, listLessonQuestionsHandler);
