-- Videos table
CREATE TABLE IF NOT EXISTS videos (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    series TEXT NOT NULL,
    description TEXT,
    path TEXT,
    status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('archive', 'ready'))
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    category TEXT NOT NULL UNIQUE
);

-- Music table
CREATE TABLE IF NOT EXISTS music (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('music', 'podcast')),
    title TEXT NOT NULL,
    category TEXT,
    description TEXT
);
