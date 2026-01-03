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
            sent INTEGER DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_sent ON heartbeats(sent);
`;

export default schema;