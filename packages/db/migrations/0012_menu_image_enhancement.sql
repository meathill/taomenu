CREATE TABLE menu_image_enhancement_jobs (
  id TEXT PRIMARY KEY NOT NULL,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued',
  source_image_key TEXT NOT NULL,
  preview_image_key TEXT,
  error_code TEXT,
  usage_json TEXT,
  created_by_user_id TEXT NOT NULL REFERENCES user(id) ON DELETE RESTRICT,
  created_at INTEGER NOT NULL,
  started_at INTEGER,
  completed_at INTEGER
);

CREATE INDEX menu_image_enhancement_jobs_store_created_idx
  ON menu_image_enhancement_jobs(store_id, created_at);

CREATE INDEX menu_image_enhancement_jobs_item_created_idx
  ON menu_image_enhancement_jobs(store_id, item_id, created_at);
