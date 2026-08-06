ALTER TABLE "stores" ADD COLUMN "staff_seat_addons" integer DEFAULT 0 NOT NULL;
ALTER TABLE "stores" ADD COLUMN "stripe_customer_id" text;
ALTER TABLE "stores" ADD COLUMN "stripe_staff_seat_subscription_id" text;
ALTER TABLE "stores" ADD COLUMN "stripe_staff_seat_item_id" text;

ALTER TABLE "terminal_devices" ADD COLUMN "staff_user_id" text REFERENCES "user"("id") ON DELETE SET NULL;
CREATE INDEX "terminal_devices_staff_user_idx" ON "terminal_devices" ("store_id", "staff_user_id", "revoked_at");
CREATE UNIQUE INDEX "terminal_devices_store_staff_active_unique"
ON "terminal_devices" ("store_id", "staff_user_id")
WHERE "staff_user_id" IS NOT NULL AND "revoked_at" IS NULL;

-- Old pairings were created without a logged-in staff account. Force them through
-- the new QR + login flow instead of letting them consume seats or receive Push.
UPDATE "push_subscriptions"
SET "disabled_at" = COALESCE("disabled_at", "created_at")
WHERE "terminal_id" IN (
  SELECT "id" FROM "terminal_devices" WHERE "staff_user_id" IS NULL
);
UPDATE "terminal_devices"
SET "revoked_at" = COALESCE("revoked_at", "created_at")
WHERE "staff_user_id" IS NULL;
