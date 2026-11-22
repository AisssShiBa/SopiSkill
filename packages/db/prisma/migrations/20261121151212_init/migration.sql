-- CreateEnum
CREATE TYPE "course_status" AS ENUM ('draft', 'awaiting_approval', 'generating', 'ready', 'failed', 'archived');

-- CreateEnum
CREATE TYPE "question_status" AS ENUM ('draft', 'active', 'archived');

-- CreateEnum
CREATE TYPE "question_type" AS ENUM ('single_choice');

-- CreateEnum
CREATE TYPE "mapping_status" AS ENUM ('draft', 'approved', 'retired');

-- CreateEnum
CREATE TYPE "mastery_status" AS ENUM ('insufficient_data', 'learning', 'proficient', 'needs_review');

-- CreateEnum
CREATE TYPE "policy_action" AS ENUM ('review_skill', 'practice_skill', 'next_lesson', 'mini_pretest', 'continue_learning');

-- CreateEnum
CREATE TYPE "generation_job_status" AS ENUM ('queued', 'running', 'succeeded', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "target_level" AS ENUM ('beginner', 'intermediate', 'advanced');

-- CreateEnum
CREATE TYPE "tutor_role" AS ENUM ('user', 'assistant', 'system');

-- CreateEnum
CREATE TYPE "tutor_message_kind" AS ENUM ('chat', 'hint');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(128) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "rotated_at" TIMESTAMPTZ(3),

    CONSTRAINT "refresh_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "status" "course_status" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "position" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "status" "question_status" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_versions" (
    "id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "type" "question_type" NOT NULL DEFAULT 'single_choice',
    "prompt" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "answer_key" VARCHAR(128) NOT NULL,
    "explanation" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "skill_key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_mapping_versions" (
    "id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "status" "mapping_status" NOT NULL DEFAULT 'draft',
    "approved_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_mapping_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_prerequisites" (
    "id" UUID NOT NULL,
    "mapping_version_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "prerequisite_skill_id" UUID NOT NULL,

    CONSTRAINT "skill_prerequisites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_skills" (
    "id" UUID NOT NULL,
    "mapping_version_id" UUID NOT NULL,
    "question_version_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "question_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_attempts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "question_version_id" UUID NOT NULL,
    "mapping_version_id" UUID NOT NULL,
    "idempotency_key" UUID NOT NULL,
    "selected_option_id" VARCHAR(128) NOT NULL,
    "is_correct" BOOLEAN NOT NULL,
    "hints_used" INTEGER NOT NULL DEFAULT 0,
    "submitted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_events" (
    "id" UUID NOT NULL,
    "attempt_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "question_version_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "mapping_version_id" UUID NOT NULL,
    "is_correct" BOOLEAN NOT NULL,
    "hints_used" INTEGER NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learner_skill_states" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "status" "mastery_status" NOT NULL DEFAULT 'insufficient_data',
    "model_type" VARCHAR(50) NOT NULL DEFAULT 'rule_based',
    "model_version" VARCHAR(50) NOT NULL DEFAULT 'rule-v1',
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "learner_skill_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_decisions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "target_skill_id" UUID,
    "action" "policy_action" NOT NULL,
    "reason_code" VARCHAR(100) NOT NULL,
    "message" TEXT,
    "policy_version" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generation_jobs" (
    "id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "idempotency_key" UUID NOT NULL,
    "learning_goal" TEXT NOT NULL,
    "target_level" "target_level" NOT NULL,
    "lesson_count" INTEGER NOT NULL,
    "status" "generation_job_status" NOT NULL DEFAULT 'queued',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "error_code" VARCHAR(100),
    "provider" VARCHAR(100),
    "model_name" VARCHAR(100),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "started_at" TIMESTAMPTZ(3),
    "finished_at" TIMESTAMPTZ(3),

    CONSTRAINT "generation_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tutor_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "title" VARCHAR(200),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tutor_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tutor_messages" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "role" "tutor_role" NOT NULL,
    "kind" "tutor_message_kind" NOT NULL DEFAULT 'chat',
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tutor_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tutor_hint_events" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "message_id" UUID,
    "question_version_id" UUID,
    "skill_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tutor_hint_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_sessions_token_hash_key" ON "refresh_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_sessions_user_id_expires_at_idx" ON "refresh_sessions"("user_id", "expires_at");

-- CreateIndex
CREATE INDEX "courses_owner_id_created_at_idx" ON "courses"("owner_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "lessons_course_id_position_key" ON "lessons"("course_id", "position");

-- CreateIndex
CREATE INDEX "questions_lesson_id_idx" ON "questions"("lesson_id");

-- CreateIndex
CREATE UNIQUE INDEX "question_versions_question_id_version_number_key" ON "question_versions"("question_id", "version_number");

-- CreateIndex
CREATE UNIQUE INDEX "skills_course_id_skill_key_key" ON "skills"("course_id", "skill_key");

-- CreateIndex
CREATE UNIQUE INDEX "skill_mapping_versions_course_id_version_number_key" ON "skill_mapping_versions"("course_id", "version_number");

-- CreateIndex
CREATE INDEX "skill_prerequisites_skill_id_idx" ON "skill_prerequisites"("skill_id");

-- CreateIndex
CREATE INDEX "skill_prerequisites_prerequisite_skill_id_idx" ON "skill_prerequisites"("prerequisite_skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "skill_prerequisites_mapping_version_id_skill_id_prerequisit_key" ON "skill_prerequisites"("mapping_version_id", "skill_id", "prerequisite_skill_id");

-- CreateIndex
CREATE INDEX "question_skills_mapping_version_id_question_version_id_idx" ON "question_skills"("mapping_version_id", "question_version_id");

-- CreateIndex
CREATE INDEX "question_skills_skill_id_idx" ON "question_skills"("skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "question_skills_mapping_version_id_question_version_id_skil_key" ON "question_skills"("mapping_version_id", "question_version_id", "skill_id");

-- CreateIndex
CREATE INDEX "quiz_attempts_user_id_submitted_at_idx" ON "quiz_attempts"("user_id", "submitted_at" DESC);

-- CreateIndex
CREATE INDEX "quiz_attempts_question_version_id_idx" ON "quiz_attempts"("question_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_attempts_user_id_idempotency_key_key" ON "quiz_attempts"("user_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "learning_events_attempt_id_key" ON "learning_events"("attempt_id");

-- CreateIndex
CREATE INDEX "learning_events_user_id_skill_id_occurred_at_idx" ON "learning_events"("user_id", "skill_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "learning_events_mapping_version_id_idx" ON "learning_events"("mapping_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "learner_skill_states_user_id_skill_id_key" ON "learner_skill_states"("user_id", "skill_id");

-- CreateIndex
CREATE INDEX "policy_decisions_user_id_course_id_created_at_idx" ON "policy_decisions"("user_id", "course_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "policy_decisions_target_skill_id_idx" ON "policy_decisions"("target_skill_id");

-- CreateIndex
CREATE INDEX "generation_jobs_course_id_created_at_idx" ON "generation_jobs"("course_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "generation_jobs_status_created_at_idx" ON "generation_jobs"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "generation_jobs_user_id_idempotency_key_key" ON "generation_jobs"("user_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "tutor_sessions_user_id_course_id_created_at_idx" ON "tutor_sessions"("user_id", "course_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "tutor_messages_session_id_created_at_idx" ON "tutor_messages"("session_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "tutor_hint_events_message_id_key" ON "tutor_hint_events"("message_id");

-- CreateIndex
CREATE INDEX "tutor_hint_events_user_id_question_version_id_created_at_idx" ON "tutor_hint_events"("user_id", "question_version_id", "created_at");

-- AddForeignKey
ALTER TABLE "refresh_sessions" ADD CONSTRAINT "refresh_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_versions" ADD CONSTRAINT "question_versions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skills" ADD CONSTRAINT "skills_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_mapping_versions" ADD CONSTRAINT "skill_mapping_versions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_prerequisites" ADD CONSTRAINT "skill_prerequisites_mapping_version_id_fkey" FOREIGN KEY ("mapping_version_id") REFERENCES "skill_mapping_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_prerequisites" ADD CONSTRAINT "skill_prerequisites_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_prerequisites" ADD CONSTRAINT "skill_prerequisites_prerequisite_skill_id_fkey" FOREIGN KEY ("prerequisite_skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_skills" ADD CONSTRAINT "question_skills_mapping_version_id_fkey" FOREIGN KEY ("mapping_version_id") REFERENCES "skill_mapping_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_skills" ADD CONSTRAINT "question_skills_question_version_id_fkey" FOREIGN KEY ("question_version_id") REFERENCES "question_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_skills" ADD CONSTRAINT "question_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_question_version_id_fkey" FOREIGN KEY ("question_version_id") REFERENCES "question_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_mapping_version_id_fkey" FOREIGN KEY ("mapping_version_id") REFERENCES "skill_mapping_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_events" ADD CONSTRAINT "learning_events_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "quiz_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_events" ADD CONSTRAINT "learning_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_events" ADD CONSTRAINT "learning_events_question_version_id_fkey" FOREIGN KEY ("question_version_id") REFERENCES "question_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_events" ADD CONSTRAINT "learning_events_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_events" ADD CONSTRAINT "learning_events_mapping_version_id_fkey" FOREIGN KEY ("mapping_version_id") REFERENCES "skill_mapping_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learner_skill_states" ADD CONSTRAINT "learner_skill_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learner_skill_states" ADD CONSTRAINT "learner_skill_states_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_decisions" ADD CONSTRAINT "policy_decisions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_decisions" ADD CONSTRAINT "policy_decisions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_decisions" ADD CONSTRAINT "policy_decisions_target_skill_id_fkey" FOREIGN KEY ("target_skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutor_sessions" ADD CONSTRAINT "tutor_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutor_sessions" ADD CONSTRAINT "tutor_sessions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutor_messages" ADD CONSTRAINT "tutor_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "tutor_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutor_hint_events" ADD CONSTRAINT "tutor_hint_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "tutor_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutor_hint_events" ADD CONSTRAINT "tutor_hint_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutor_hint_events" ADD CONSTRAINT "tutor_hint_events_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "tutor_messages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutor_hint_events" ADD CONSTRAINT "tutor_hint_events_question_version_id_fkey" FOREIGN KEY ("question_version_id") REFERENCES "question_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutor_hint_events" ADD CONSTRAINT "tutor_hint_events_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
