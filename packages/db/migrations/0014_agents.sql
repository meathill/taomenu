CREATE TABLE agents (
  id TEXT PRIMARY KEY NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX agents_code_unique ON agents(code);
CREATE UNIQUE INDEX agents_email_unique ON agents(email);

-- user_id 作主键即首触保证：一个用户只可能有一条归因，重复归因被主键挡掉
CREATE TABLE agent_referrals (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL REFERENCES agents(id),
  ref_code TEXT NOT NULL,
  attributed_at INTEGER NOT NULL
);

CREATE INDEX agent_referrals_agent_idx ON agent_referrals(agent_id);

-- day 为 UTC 'YYYY-MM-DD'，visitor_hash = sha256(ip|ua|day|code)，不存原始 IP / UA
CREATE TABLE agent_link_clicks (
  id TEXT PRIMARY KEY NOT NULL,
  agent_id TEXT NOT NULL REFERENCES agents(id),
  source TEXT NOT NULL,
  day TEXT NOT NULL,
  visitor_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX agent_link_clicks_dedupe_unique
  ON agent_link_clicks(agent_id, day, visitor_hash);

-- store_id / user_id 刻意不加外键：流水是审计记录，门店注销后仍需留痕
CREATE TABLE agent_revenue_events (
  id TEXT PRIMARY KEY NOT NULL,
  agent_id TEXT NOT NULL REFERENCES agents(id),
  store_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  stripe_invoice_id TEXT NOT NULL,
  amount_minor INTEGER NOT NULL,
  currency TEXT NOT NULL,
  kind TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX agent_revenue_events_invoice_unique
  ON agent_revenue_events(stripe_invoice_id);
CREATE INDEX agent_revenue_events_agent_idx ON agent_revenue_events(agent_id);
