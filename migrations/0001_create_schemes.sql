CREATE TABLE schemes (
  id TEXT PRIMARY KEY,
  data BLOB NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX schemes_updated_at ON schemes (updated_at);
