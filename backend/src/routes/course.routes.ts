import { Router } from "express";

import {
    createCourseHandler,
    getCourseDetailHandler,
    listCoursesHandler,
} from "../controllers/course.controller.js";
import { getCourseSkillGraphHandler } from "../controllers/knowledge.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

export const courseRouter = Router();

courseRouter.use(requireAuth);

// COURSE-01: POST /api/v1/courses
courseRouter.post("/", createCourseHandler);

// COURSE-02: GET /api/v1/courses?page=1&limit=20
courseRouter.get("/", listCoursesHandler);

// COURSE-03: GET /api/v1/courses/:courseId
courseRouter.get("/:courseId", getCourseDetailHandler);

// KC-01: GET /api/v1/courses/:courseId/skills
courseRouter.get("/:courseId/skills", getCourseSkillGraphHandler);
