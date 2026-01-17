-- DCAnalytics Database Schema Refactor (v2)
-- Goal: Decouple Student Identity from Exam Results

-- 1. Students Table (Source of Truth)
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    roll INTEGER UNIQUE NOT NULL,
    name TEXT, -- Can be NULL initially, filled by Profile Scraper
    photo_url TEXT, -- New: Stores the URL of the student's image
    session TEXT, -- e.g., '2024-2025'
    group_name TEXT, -- e.g., 'Science' (Renamed from 'group' to avoid reserved keyword issues)
    section TEXT, -- e.g., 'A', 'B' (Derived via heuristic)
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Subjects Table (Normalized)
-- Pre-fill this table to avoid "Biology" vs "Biology 1st" duplicates
CREATE TABLE IF NOT EXISTS subjects (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL, -- Standardized name
    group_id INTEGER -- Optional: Link to a groups table if we had one, or just semantically used
);

-- 3. Results Table
CREATE TABLE IF NOT EXISTS results (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    exam_id INTEGER, -- Assuming we have an exams table or just an ID from the scraper
    gpa DOUBLE PRECISION,
    total_marks DOUBLE PRECISION,
    grade TEXT,
    original_pdf_url TEXT, -- New: Phase 3 requirement (Patch)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_result_per_exam UNIQUE (student_id, exam_id)
);

-- 4. Student Marks Table
CREATE TABLE IF NOT EXISTS student_marks (
    id SERIAL PRIMARY KEY,
    result_id INTEGER REFERENCES results(id) ON DELETE CASCADE,
    subject_id INTEGER REFERENCES subjects(id), -- Linked to normalized subjects
    mark DOUBLE PRECISION,
    grade TEXT,
    grade_point DOUBLE PRECISION
);

-- Indexing for Performance
CREATE INDEX IF NOT EXISTS idx_students_roll ON students(roll);
CREATE INDEX IF NOT EXISTS idx_results_student_id ON results(student_id);
