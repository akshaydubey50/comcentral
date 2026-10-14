CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT');
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "Currency" AS ENUM ('USD', 'INR', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'SGD');

CREATE TABLE "user" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "email_verified" BOOLEAN NOT NULL DEFAULT false,
  "image" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "user_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_email_lowercase" CHECK (length(btrim("email")) > 0 AND "email" = lower("email") AND "email" = btrim("email")),
  CONSTRAINT "user_name_present" CHECK (length(btrim("name")) > 0 AND "name" = btrim("name"))
);
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

CREATE TABLE "session" (
  "id" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "token" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "user_id" TEXT NOT NULL,
  CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");
CREATE INDEX "session_user_id_idx" ON "session"("user_id");

CREATE TABLE "account" (
  "id" TEXT NOT NULL,
  "account_id" TEXT NOT NULL,
  "provider_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "access_token" TEXT,
  "refresh_token" TEXT,
  "id_token" TEXT,
  "access_token_expires_at" TIMESTAMPTZ(3),
  "refresh_token_expires_at" TIMESTAMPTZ(3),
  "scope" TEXT,
  "password" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "account_user_id_idx" ON "account"("user_id");
CREATE UNIQUE INDEX "account_provider_id_account_id_key" ON "account"("provider_id", "account_id");

CREATE TABLE "verification" (
  "id" TEXT NOT NULL,
  "identifier" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

CREATE TABLE "rate_limit" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "count" INTEGER NOT NULL,
  "last_request" BIGINT NOT NULL,
  CONSTRAINT "rate_limit_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "rate_limit_key_key" ON "rate_limit"("key");

CREATE TABLE "seed_marker" (
  "id" TEXT NOT NULL,
  "employee_count" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "seed_marker_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "seed_marker_employee_count_positive" CHECK ("employee_count" > 0)
);

CREATE TABLE "employee" (
  "id" TEXT NOT NULL,
  "employee_code" VARCHAR(40) NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "email" VARCHAR(254) NOT NULL,
  "country" CHAR(2) NOT NULL,
  "department" VARCHAR(100) NOT NULL,
  "job_role" VARCHAR(100) NOT NULL,
  "employment_type" "EmploymentType" NOT NULL,
  "joining_date" DATE NOT NULL,
  "salary" DECIMAL(14,2) NOT NULL,
  "currency" "Currency" NOT NULL,
  "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
  "version" INTEGER NOT NULL DEFAULT 1,
  "seed_batch" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "employee_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "employee_salary_range" CHECK ("salary" > 0 AND "salary" <= 999999999999.99),
  CONSTRAINT "employee_jpy_precision" CHECK ("currency" <> 'JPY' OR "salary" = trunc("salary")),
  CONSTRAINT "employee_joining_date_not_future" CHECK ("joining_date" <= CURRENT_DATE),
  CONSTRAINT "employee_version_positive" CHECK ("version" > 0),
  CONSTRAINT "employee_email_lowercase" CHECK ("email" = lower("email") AND "email" = btrim("email")),
  CONSTRAINT "employee_country_supported" CHECK ("country" IN ('AU', 'CA', 'DE', 'GB', 'IN', 'JP', 'SG', 'US')),
  CONSTRAINT "employee_code_shape" CHECK ("employee_code" = btrim("employee_code") AND "employee_code" ~ '^[A-Za-z0-9][A-Za-z0-9._-]*$'),
  CONSTRAINT "employee_text_trimmed" CHECK (
    length(btrim("name")) > 0 AND "name" = btrim("name") AND
    length(btrim("department")) > 0 AND "department" = btrim("department") AND
    length(btrim("job_role")) > 0 AND "job_role" = btrim("job_role")
  )
);
CREATE UNIQUE INDEX "employee_employee_code_key" ON "employee"("employee_code");
CREATE UNIQUE INDEX "employee_email_key" ON "employee"("email");
CREATE INDEX "employee_status_name_id_idx" ON "employee"("status", "name", "id");
CREATE INDEX "employee_country_status_idx" ON "employee"("country", "status");
CREATE INDEX "employee_department_status_idx" ON "employee"("department", "status");
CREATE INDEX "employee_job_role_status_idx" ON "employee"("job_role", "status");
CREATE INDEX "employee_employment_type_status_idx" ON "employee"("employment_type", "status");
CREATE INDEX "employee_seed_batch_idx" ON "employee"("seed_batch");

CREATE TABLE "salary_history" (
  "id" TEXT NOT NULL,
  "employee_id" TEXT NOT NULL,
  "previous_salary" DECIMAL(14,2) NOT NULL,
  "previous_currency" "Currency" NOT NULL,
  "salary" DECIMAL(14,2) NOT NULL,
  "currency" "Currency" NOT NULL,
  "reason" VARCHAR(500) NOT NULL,
  "actor_id" TEXT NOT NULL,
  "actor_name" TEXT NOT NULL,
  "actor_email" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "salary_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "salary_history_amounts_positive" CHECK ("previous_salary" > 0 AND "salary" > 0),
  CONSTRAINT "salary_history_reason_present" CHECK (length(btrim("reason")) > 0 AND "reason" = btrim("reason")),
  CONSTRAINT "salary_history_amount_range" CHECK ("previous_salary" <= 999999999999.99 AND "salary" <= 999999999999.99),
  CONSTRAINT "salary_history_jpy_precision" CHECK (
    ("previous_currency" <> 'JPY' OR "previous_salary" = trunc("previous_salary")) AND
    ("currency" <> 'JPY' OR "salary" = trunc("salary"))
  )
);
CREATE INDEX "salary_history_employee_id_created_at_id_idx" ON "salary_history"("employee_id", "created_at" DESC, "id");

CREATE TABLE "fx_snapshot" (
  "id" TEXT NOT NULL,
  "rate_date" DATE NOT NULL,
  "fetched_at" TIMESTAMPTZ(3) NOT NULL,
  "provider" VARCHAR(80) NOT NULL,
  "checksum" CHAR(64) NOT NULL,
  "rates" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fx_snapshot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fx_snapshot_not_future" CHECK ("rate_date" <= CURRENT_DATE),
  CONSTRAINT "fx_snapshot_provider_present" CHECK (length(btrim("provider")) > 0),
  CONSTRAINT "fx_snapshot_checksum_shape" CHECK ("checksum" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "fx_snapshot_rates_object" CHECK (jsonb_typeof("rates") = 'object' AND "rates" ?& ARRAY['USD','INR','EUR','GBP','JPY','CAD','AUD','SGD'])
);
CREATE UNIQUE INDEX "fx_snapshot_checksum_key" ON "fx_snapshot"("checksum");
CREATE INDEX "fx_snapshot_rate_date_fetched_at_idx" ON "fx_snapshot"("rate_date" DESC, "fetched_at" DESC);

CREATE TABLE "fx_refresh_attempt" (
  "id" TEXT NOT NULL,
  "attempted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "succeeded" BOOLEAN NOT NULL,
  "message" VARCHAR(240) NOT NULL,
  "snapshot_id" TEXT,
  CONSTRAINT "fx_refresh_attempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fx_refresh_attempt_message_present" CHECK (length(btrim("message")) > 0)
);
CREATE INDEX "fx_refresh_attempt_snapshot_id_idx" ON "fx_refresh_attempt"("snapshot_id");
CREATE INDEX "fx_refresh_attempt_attempted_at_idx" ON "fx_refresh_attempt"("attempted_at" DESC);

ALTER TABLE "session" ADD CONSTRAINT "session_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee" ADD CONSTRAINT "employee_seed_batch_fkey"
  FOREIGN KEY ("seed_batch") REFERENCES "seed_marker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "salary_history" ADD CONSTRAINT "salary_history_employee_id_fkey"
  FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "salary_history" ADD CONSTRAINT "salary_history_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fx_refresh_attempt" ADD CONSTRAINT "fx_refresh_attempt_snapshot_id_fkey"
  FOREIGN KEY ("snapshot_id") REFERENCES "fx_snapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION prevent_immutable_audit_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'immutable audit records cannot be changed';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER salary_history_immutable
  BEFORE UPDATE OR DELETE ON "salary_history"
  FOR EACH ROW EXECUTE FUNCTION prevent_immutable_audit_change();
CREATE TRIGGER fx_snapshot_immutable
  BEFORE UPDATE OR DELETE ON "fx_snapshot"
  FOR EACH ROW EXECUTE FUNCTION prevent_immutable_audit_change();
