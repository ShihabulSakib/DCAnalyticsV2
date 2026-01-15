
import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables from .env file in the project root
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise Exception("DATABASE_URL environment variable not set!")

def get_conn():
    """Establishes a connection to the PostgreSQL database."""
    return psycopg2.connect(DATABASE_URL)

def init_db():
    """Initializes the database schema for PostgreSQL."""
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute('''
                CREATE TABLE IF NOT EXISTS students (
                    id SERIAL PRIMARY KEY,
                    roll TEXT UNIQUE NOT NULL,
                    name TEXT,
                    student_group TEXT,
                    session TEXT,
                    image_url TEXT
                )
            ''')

            # Attempt to add the image_url column if it doesn't exist, for existing tables.
            try:
                cur.execute('ALTER TABLE students ADD COLUMN image_url TEXT')
            except psycopg2.errors.DuplicateColumn:
                pass # Column already exists, do nothing.

            cur.execute('''
                CREATE TABLE IF NOT EXISTS exams (
                    id SERIAL PRIMARY KEY,
                    exam_id_text TEXT UNIQUE NOT NULL,
                    name TEXT
                )
            ''')
            
            cur.execute('''
                CREATE TABLE IF NOT EXISTS results (
                    id SERIAL PRIMARY KEY,
                    student_id INTEGER NOT NULL,
                    exam_id INTEGER NOT NULL,
                    gpa FLOAT,
                    total_marks FLOAT,
                    status TEXT,
                    FOREIGN KEY(student_id) REFERENCES students(id),
                    FOREIGN KEY(exam_id) REFERENCES exams(id),
                    UNIQUE(student_id, exam_id)
                )
            ''')

            cur.execute('''
                CREATE TABLE IF NOT EXISTS subjects (
                    id SERIAL PRIMARY KEY,
                    name TEXT UNIQUE NOT NULL
                )
            ''')

            cur.execute('''
                CREATE TABLE IF NOT EXISTS student_marks (
                    id SERIAL PRIMARY KEY,
                    result_id INTEGER NOT NULL,
                    subject_id INTEGER NOT NULL,
                    cq FLOAT,
                    mcq FLOAT,
                    practical FLOAT,
                    total FLOAT,
                    grade TEXT,
                    gp FLOAT,
                    FOREIGN KEY(result_id) REFERENCES results(id),
                    FOREIGN KEY(subject_id) REFERENCES subjects(id)
                )
            ''')

            cur.execute('''
                CREATE TABLE IF NOT EXISTS access_logs (
                    id SERIAL PRIMARY KEY,
                    roll TEXT,
                    accessor_roll TEXT,
                    action TEXT,
                    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    ip_address TEXT,
                    status TEXT
                )
            ''')
            
        conn.commit()
    finally:
        conn.close()

def get_or_create_student_id(roll, name, group, session_year):
    """Saves a student if they don't exist and returns their primary key ID."""
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM students WHERE roll = %s", (roll,))
            student_id = cur.fetchone()
            if student_id:
                return student_id[0]
            else:
                cur.execute(
                    "INSERT INTO students (roll, name, student_group, session) VALUES (%s, %s, %s, %s) RETURNING id",
                    (roll, name, group, session_year)
                )
                student_id = cur.fetchone()[0]
                conn.commit()
                return student_id
    finally:
        conn.close()

def update_student_image_url(roll, image_url):
    """Updates the student's record with the URL of their profile image."""
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE students SET image_url = %s WHERE roll = %s",
                (image_url, roll)
            )
            conn.commit()
            print(f"Updated image URL for roll {roll}.")
    except Exception as e:
        conn.rollback()
        print(f"Failed to update image URL for roll {roll}: {e}")
    finally:
        conn.close()

def get_or_create_exam_id(exam_id_text, exam_name):
    """Saves an exam if it doesn't exist and returns its primary key ID."""
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM exams WHERE exam_id_text = %s", (exam_id_text,))
            exam_id = cur.fetchone()
            if exam_id:
                return exam_id[0]
            else:
                cur.execute(
                    "INSERT INTO exams (exam_id_text, name) VALUES (%s, %s) RETURNING id",
                    (exam_id_text, exam_name)
                )
                exam_id = cur.fetchone()[0]
                conn.commit()
                return exam_id
    finally:
        conn.close()

def get_or_create_subject_id(subject_name):
    """Saves a subject if it doesn't exist and returns its primary key ID."""
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM subjects WHERE name = %s", (subject_name,))
            subject_id = cur.fetchone()
            if subject_id:
                return subject_id[0]
            else:
                cur.execute(
                    "INSERT INTO subjects (name) VALUES (%s) RETURNING id",
                    (subject_name,)
                )
                subject_id = cur.fetchone()[0]
                conn.commit()
                return subject_id
    finally:
        conn.close()


def save_result_and_marks(student_id, exam_id, data):
    """Saves the overall result and the detailed subject marks for a student's exam."""
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            # Use ON CONFLICT to handle cases where a result might be re-scraped.
            # This will update the existing record instead of creating a new one.
            cur.execute('''
                INSERT INTO results (student_id, exam_id, gpa, total_marks, status)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (student_id, exam_id) DO UPDATE SET
                    gpa = EXCLUDED.gpa,
                    total_marks = EXCLUDED.total_marks,
                    status = EXCLUDED.status
                RETURNING id
            ''', (student_id, exam_id, data.get('gpa', 0.0), data.get('total_marks', 0), data.get('status', 'Unknown')))
            
            result_id = cur.fetchone()[0]

            # Clear old subject marks for this result to prevent duplication on re-scrape
            cur.execute('DELETE FROM student_marks WHERE result_id = %s', (result_id,))

            # Insert new subject marks
            for subj in data.get('subjects', []):
                # Get the subject's primary key
                subject_id = get_or_create_subject_id(subj['name'])
                
                cur.execute('''
                    INSERT INTO student_marks (result_id, subject_id, cq, mcq, practical, total, grade, gp)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ''', (
                    result_id, subject_id, subj.get('cq', 0), subj.get('mcq', 0), 
                    subj.get('prac', 0), subj['total'], subj['grade'], subj['gp']
                ))
        
        conn.commit()
        print(f"Successfully saved result for student_id {student_id} in exam_id {exam_id}")
    except Exception as e:
        conn.rollback()
        print(f"Error saving result for student_id {student_id}: {e}")
    finally:
        conn.close()

if __name__ == '__main__':
    print("Initializing database schema...")
    # This will create the tables in your Neon database.
    # You should run this script once locally to set up the tables before deploying.
    init_db()
    print("Database schema initialized.")
