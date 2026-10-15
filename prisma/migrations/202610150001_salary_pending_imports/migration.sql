-- Forward-only expansion. Existing employee pay and immutable history stay unchanged.
BEGIN;

ALTER TYPE "EmploymentType" ADD VALUE IF NOT EXISTS 'INTERN';
ALTER TYPE "Currency" ADD VALUE IF NOT EXISTS 'BRL';

ALTER TABLE "employee" ALTER COLUMN "salary" DROP NOT NULL;
ALTER TABLE "salary_history" ALTER COLUMN "previous_salary" DROP NOT NULL;

ALTER TABLE "employee" DROP CONSTRAINT "employee_country_supported";
ALTER TABLE "employee" ADD CONSTRAINT "employee_country_supported"
  CHECK ("country" IN ('AU', 'BR', 'CA', 'DE', 'FR', 'GB', 'IN', 'JP', 'SG', 'US'));

ALTER TABLE "employee" DROP CONSTRAINT "employee_salary_range";
ALTER TABLE "employee" ADD CONSTRAINT "employee_salary_range"
  CHECK ("salary" IS NULL OR ("salary" > 0 AND "salary" <= 999999999999.99));
ALTER TABLE "employee" DROP CONSTRAINT "employee_jpy_precision";
ALTER TABLE "employee" ADD CONSTRAINT "employee_jpy_precision"
  CHECK ("salary" IS NULL OR "currency" <> 'JPY' OR "salary" = trunc("salary"));

ALTER TABLE "salary_history" DROP CONSTRAINT "salary_history_amounts_positive";
ALTER TABLE "salary_history" ADD CONSTRAINT "salary_history_amounts_positive"
  CHECK (("previous_salary" IS NULL OR "previous_salary" > 0) AND "salary" > 0);
ALTER TABLE "salary_history" DROP CONSTRAINT "salary_history_amount_range";
ALTER TABLE "salary_history" ADD CONSTRAINT "salary_history_amount_range"
  CHECK (("previous_salary" IS NULL OR "previous_salary" <= 999999999999.99) AND "salary" <= 999999999999.99);
ALTER TABLE "salary_history" DROP CONSTRAINT "salary_history_jpy_precision";
ALTER TABLE "salary_history" ADD CONSTRAINT "salary_history_jpy_precision" CHECK (
  ("previous_salary" IS NULL OR "previous_currency" <> 'JPY' OR "previous_salary" = trunc("previous_salary")) AND
  ("currency" <> 'JPY' OR "salary" = trunc("salary"))
);

-- Keep the original FX coverage constraint: immutable older snapshots lack BRL.
-- Read-time validation requires a fresh complete snapshot before USD reporting.
COMMIT;
