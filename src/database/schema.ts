const schema = `
  CREATE TABLE IF NOT EXISTS heartbeats (
    id TEXT PRIMARY KEY,
    timestamp INTEGER NOT NULL,
    filePath TEXT NOT NULL,
    language TEXT NOT NULL,
    project TEXT,
    editor TEXT NOT NULL,
    branch TEXT,
    os TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('human', 'ai', 'debugging'))
);

  CREATE INDEX IF NOT EXISTS idx_heartbeats_timestamp
    ON heartbeats(timestamp);
`;

export default schema;
