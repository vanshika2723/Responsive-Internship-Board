PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS internships (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    domain TEXT NOT NULL,
    mode TEXT NOT NULL,
    location TEXT NOT NULL,
    stipend TEXT NOT NULL DEFAULT 'Not specified',
    duration TEXT NOT NULL,
    skills TEXT NOT NULL DEFAULT '[]',
    openings INTEGER NOT NULL DEFAULT 1
        CHECK (openings >= 0),
    applications_open INTEGER NOT NULL DEFAULT 1
        CHECK (applications_open IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    internship_id TEXT NOT NULL,
    applicant_name TEXT NOT NULL,
    applicant_email TEXT NOT NULL,
    portfolio_url TEXT,
    cover_message TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (internship_id)
        REFERENCES internships(id)
        ON DELETE CASCADE,

    UNIQUE (internship_id, applicant_email)
);