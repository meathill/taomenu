CREATE TABLE menu_translation_jobs (
  id TEXT PRIMARY KEY NOT NULL,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued',
  source_locale TEXT NOT NULL,
  target_locale TEXT NOT NULL,
  input_json TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  error_code TEXT,
  usage_json TEXT,
  created_by_user_id TEXT NOT NULL REFERENCES user(id) ON DELETE RESTRICT,
  created_at INTEGER NOT NULL,
  started_at INTEGER,
  completed_at INTEGER
);

CREATE INDEX menu_translation_jobs_store_created_idx
  ON menu_translation_jobs(store_id, created_at);

CREATE TABLE menu_translation_suggestions (
  id TEXT PRIMARY KEY NOT NULL,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL REFERENCES menu_translation_jobs(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_description TEXT,
  suggested_name TEXT NOT NULL,
  suggested_description TEXT,
  decision TEXT NOT NULL DEFAULT 'pending',
  decided_by_user_id TEXT REFERENCES user(id) ON DELETE SET NULL,
  decided_at INTEGER
);

CREATE INDEX menu_translation_suggestions_job_idx
  ON menu_translation_suggestions(store_id, job_id);
