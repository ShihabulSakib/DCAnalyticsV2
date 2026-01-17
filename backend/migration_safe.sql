-- Safe Migration Script (Run this in Neon Console)
-- This adds new columns to your existing tables without deleting data.

-- 1. Update Students Table
ALTER TABLE students ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS section TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE students ADD COLUMN IF NOT EXISTS group_name TEXT; 

-- 2. Update Results Table
ALTER TABLE results ADD COLUMN IF NOT EXISTS original_pdf_url TEXT;

-- 3. Create Subjects Table (Only if it doesn't exist)
CREATE TABLE IF NOT EXISTS subjects (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    group_id INTEGER
);

-- 4. Create Indexes (Safe to run multiple times)
CREATE INDEX IF NOT EXISTS idx_students_roll ON students(roll);
CREATE INDEX IF NOT EXISTS idx_results_student_id ON results(student_id);
