import express from "express";
import helmet from "helmet";

import { errorHandler, notFoundHandler } from "./middlewares/error-handler.js";
import { requestIdMiddleware } from "./middlewares/request-id.js";
import { authRouter } from "./routes/auth.routes.js";
import { courseRouter } from "./routes/course.routes.js";
import { healthRouter } from "./routes/health.routes.js";
import { lessonQuestionRouter } from "./routes/lesson-question.routes.js";

export const app = express();

// Request tracing ID (UUID v4)
app.use(requestIdMiddleware);

// Security headers
app.use(helmet());

// Parse JSON request body
app.use(express.json({ limit: "1mb" }));

// Health routes
app.use("/api/v1/health", healthRouter);

// Authentication routes
app.use("/api/v1/auth", authRouter);

// Course routes
app.use("/api/v1/courses", courseRouter);
app.use("/api/v1/lessons", lessonQuestionRouter);

// Standardized 404 & error responses
app.use(notFoundHandler);
app.use(errorHandler);
