CREATE TABLE "terminal_devices" (
  "id" text PRIMARY KEY NOT NULL,
  "store_id" text NOT NULL,
  "name" text NOT NULL,
  "credential_hash" text NOT NULL,
  "paired_by_user_id" text NOT NULL,
  "paired_at" integer NOT NULL,
  "last_seen_at" integer,
  "revoked_at" integer,
  "created_at" integer NOT NULL,
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE
);

CREATE INDEX "terminal_devices_store_active_idx" ON "terminal_devices" ("store_id", "revoked_at");

CREATE TABLE "terminal_pairing_codes" (
  "id" text PRIMARY KEY NOT NULL,
  "store_id" text NOT NULL,
  "created_by_user_id" text NOT NULL,
  "code_hint_hash" text NOT NULL,
  "code_hash" text NOT NULL,
  "expires_at" integer NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "used_at" integer,
  "created_at" integer NOT NULL,
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE
);

CREATE INDEX "terminal_pairing_codes_active_idx" ON "terminal_pairing_codes" ("store_id", "used_at", "expires_at");
