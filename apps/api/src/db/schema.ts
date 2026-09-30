export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin', 'contributor', 'viewer')),
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS iocs (
  id             TEXT PRIMARY KEY,
  type           TEXT NOT NULL CHECK (type IN ('ip', 'domain', 'url', 'hash')),
  value          TEXT NOT NULL,
  malware_family TEXT NOT NULL DEFAULT 'Unknown',
  category       TEXT NOT NULL CHECK (category IN ('stealer', 'loader', 'phishing', 'network')),
  severity       TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  confidence     TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  first_seen     TEXT NOT NULL,
  last_seen      TEXT NOT NULL,
  tags           TEXT NOT NULL DEFAULT '[]',
  source         TEXT NOT NULL DEFAULT '',
  description    TEXT NOT NULL DEFAULT '',
  created_by     TEXT,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  UNIQUE (type, value)
);

CREATE INDEX IF NOT EXISTS idx_iocs_family   ON iocs (malware_family);
CREATE INDEX IF NOT EXISTS idx_iocs_severity ON iocs (severity);
CREATE INDEX IF NOT EXISTS idx_iocs_last     ON iocs (last_seen);
CREATE INDEX IF NOT EXISTS idx_iocs_type     ON iocs (type);

CREATE TABLE IF NOT EXISTS hunts (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  query       TEXT NOT NULL,
  language    TEXT NOT NULL CHECK (language IN ('kql', 'spl', 'sigma', 'yara', 'powershell')),
  difficulty  TEXT NOT NULL DEFAULT 'intermediate' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  tactics     TEXT NOT NULL DEFAULT '[]',
  techniques  TEXT NOT NULL DEFAULT '[]',
  tags        TEXT NOT NULL DEFAULT '[]',
  author      TEXT NOT NULL DEFAULT 'PKC',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS articles (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  slug         TEXT NOT NULL UNIQUE,
  excerpt      TEXT NOT NULL DEFAULT '',
  content      TEXT NOT NULL,
  category     TEXT NOT NULL DEFAULT 'research',
  tags         TEXT NOT NULL DEFAULT '[]',
  author       TEXT NOT NULL DEFAULT 'PKC',
  read_time    INTEGER NOT NULL DEFAULT 5,
  published_at TEXT NOT NULL,
  created_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tools (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category    TEXT NOT NULL CHECK (category IN ('web-security', 'windows', 'azure-kql', 'phishing-analysis', 'reverse-engineering', 'hashing')),
  language    TEXT NOT NULL DEFAULT 'python',
  script_path TEXT NOT NULL DEFAULT '',
  usage       TEXT NOT NULL DEFAULT '',
  tags        TEXT NOT NULL DEFAULT '[]',
  stars       INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS resources (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category    TEXT NOT NULL CHECK (category IN ('analyst-tools', 'c2-reference', 'lolbins', 'siem', 'packet-analysis', 'certifications', 'reporting', 'osint')),
  url         TEXT NOT NULL DEFAULT '',
  tags        TEXT NOT NULL DEFAULT '[]',
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reports (
  id                 TEXT PRIMARY KEY,
  title              TEXT NOT NULL,
  client             TEXT NOT NULL DEFAULT '',
  scope              TEXT NOT NULL DEFAULT '',
  executive_summary  TEXT NOT NULL DEFAULT '',
  methodology        TEXT NOT NULL DEFAULT '',
  findings           TEXT NOT NULL DEFAULT '[]',
  status             TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in-review', 'final')),
  created_by         TEXT,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS submissions (
  id           TEXT PRIMARY KEY,
  kind         TEXT NOT NULL CHECK (kind IN ('ioc', 'hunt', 'article', 'tool', 'resource')),
  title        TEXT NOT NULL,
  body         TEXT NOT NULL DEFAULT '',
  payload      TEXT NOT NULL DEFAULT '{}',
  submitter    TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewer     TEXT,
  review_note  TEXT,
  created_at   TEXT NOT NULL,
  reviewed_at  TEXT
);

CREATE TABLE IF NOT EXISTS activity (
  id           TEXT PRIMARY KEY,
  actor        TEXT NOT NULL,
  action       TEXT NOT NULL,
  subject_type TEXT NOT NULL,
  subject_id   TEXT NOT NULL,
  detail       TEXT NOT NULL DEFAULT '{}',
  created_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_activity_created ON activity (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions (status);
`;
