
import express from "express";
import helmet from "helmet";

import { healthRouter } from "./routes/health.routes.js";

export const app = express();

// Security headers
app.use(helmet());

// Parse JSON request body
app.use(express.json({ limit: "1mb" }));

// Health routes
app.use("/api/v1/health", healthRouter);
