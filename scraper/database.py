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
                    name TEXT NOT NULL,
                    student_group TEXT,
                    session TEXT,
                    image_url TEXT
                )
            ''')

            # Check if image_url column exists before attempting to add it
            cur.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='students' AND column_name='image_url';
            """)
            if not cur.fetchone():
                cur.execute('ALTER TABLE students ADD COLUMN image_url TEXT')

            # Check if academic_year column exists
            cur.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='students' AND column_name='academic_year';
            """)
            if not cur.fetchone():
                cur.execute('ALTER TABLE students ADD COLUMN academic_year TEXT')

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

            # Check if transcript_url column exists
            cur.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='results' AND column_name='transcript_url';
            """)
            if not cur.fetchone():
                cur.execute('ALTER TABLE results ADD COLUMN transcript_url TEXT')

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
                INSERT INTO results (student_id, exam_id, gpa, total_marks, status, transcript_url)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (student_id, exam_id) DO UPDATE SET
                    gpa = EXCLUDED.gpa,
                    total_marks = EXCLUDED.total_marks,
                    status = EXCLUDED.status,
                    transcript_url = EXCLUDED.transcript_url
                RETURNING id
            ''', (
                student_id, exam_id, 
                data.get('gpa', 0.0), 
                data.get('total_marks', 0), 
                data.get('status', 'Unknown'),
                data.get('transcript_url')
            ))
            
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

def save_batch_results(results_batch):
    """
    Saves a batch of student results in a single transaction.
    """
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            # Cache for subject IDs to avoid repeated lookups within the batch
            subject_cache = {}

            for data in results_batch:
                # 1. Get or Create Student
                cur.execute("SELECT id FROM students WHERE roll = %s", (data['roll'],))
                res = cur.fetchone()
                if res:
                    student_id = res[0]
                else:
                    cur.execute(
                        "INSERT INTO students (roll, name, student_group, session) VALUES (%s, %s, %s, %s) RETURNING id",
                        (data['roll'], data.get('name'), data.get('student_group'), data.get('session'))
                    )
                    student_id = cur.fetchone()[0]

                # 2. Get or Create Exam
                cur.execute("SELECT id FROM exams WHERE exam_id_text = %s", (data['exam_id_text'],))
                res = cur.fetchone()
                if res:
                    exam_id_db = res[0]
                    # Self-healing: If exam exists but session/group is NULL, update it
                    cur.execute("""
                        UPDATE exams 
                        SET target_session = COALESCE(target_session, %s),
                            target_group = COALESCE(target_group, %s)
                        WHERE id = %s
                    """, (data.get('session'), data.get('student_group'), exam_id_db))
                else:
                    cur.execute(
                        "INSERT INTO exams (exam_id_text, name, target_session, target_group) VALUES (%s, %s, %s, %s) RETURNING id",
                        (data['exam_id_text'], data['exam_name'], data.get('session'), data.get('student_group'))
                    )
                    exam_id_db = cur.fetchone()[0]

                # 3. Insert or Update Result
                cur.execute('''
                    INSERT INTO results (student_id, exam_id, gpa, total_marks, status, transcript_url)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (student_id, exam_id) DO UPDATE SET
                        gpa = EXCLUDED.gpa,
                        total_marks = EXCLUDED.total_marks,
                        status = EXCLUDED.status,
                        transcript_url = EXCLUDED.transcript_url
                    RETURNING id
                ''', (
                    student_id, exam_id_db, 
                    data.get('gpa', 0.0), 
                    data.get('total_marks', 0), 
                    data.get('status', 'Unknown'),
                    data.get('transcript_url')
                ))
                result_id = cur.fetchone()[0]

                # 4. Clear old marks for this result
                cur.execute('DELETE FROM student_marks WHERE result_id = %s', (result_id,))

                # 5. Insert Marks
                for subj in data.get('subjects', []):
                    subj_name = subj['name']
                    
                    # Check cache first
                    if subj_name in subject_cache:
                        subject_id = subject_cache[subj_name]
                    else:
                        # Check DB
                        cur.execute("SELECT id FROM subjects WHERE name = %s", (subj_name,))
                        res = cur.fetchone()
                        if res:
                            subject_id = res[0]
                        else:
                            cur.execute("INSERT INTO subjects (name) VALUES (%s) RETURNING id", (subj_name,))
                            subject_id = cur.fetchone()[0]
                        subject_cache[subj_name] = subject_id
                    
                    cur.execute('''
                        INSERT INTO student_marks (result_id, subject_id, cq, mcq, practical, total, grade, gp)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ''', (
                        result_id, subject_id, 
                        subj.get('cq', 0), subj.get('mcq', 0), 
                        subj.get('practical', 0), subj['total'], 
                        subj['grade'], subj['gp']
                    ))

        conn.commit()
        print(f"Successfully saved batch of {len(results_batch)} records.")
        return True
    except Exception as e:
        conn.rollback()
        import traceback
        traceback.print_exc()
        print(f"Error saving batch: {e}")
        return False
    finally:
        conn.close()

def get_scraped_exam_ids():
    """Fetches all existing exam_id_text from the database."""
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT exam_id_text FROM exams")
            # Use a set for efficient 'in' checks
            return {row[0] for row in cur.fetchall()}
    finally:
        conn.close()

def get_roll_range_for_group(session_year, group_name):
    """
    Determines the min and max roll for a given session and group.
    Returns (min_roll, max_roll) or (None, None).
    """
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            # We must cast roll to a numeric type for MIN/MAX to work correctly
            cur.execute("""
                SELECT MIN(CAST(roll AS BIGINT)), MAX(CAST(roll AS BIGINT))
                FROM students
                WHERE session = %s AND student_group = %s
            """, (session_year, group_name))
            res = cur.fetchone()
            # res will be (None, None) if no records match
            if res and res[0] is not None:
                return res
            return None, None
    except (psycopg2.errors.UndefinedFunction, psycopg2.errors.InvalidTextRepresentation) as e:
        # This can happen if some rolls are not purely numeric.
        # In this case, we can't determine a range.
        print(f"Warning: Could not determine roll range for {session_year}/{group_name}. Rolls may not be numeric. Error: {e}")
        return None, None
    finally:
        conn.close()


def save_batch_profiles(profiles_batch):
    """
    Saves a batch of student profiles in a single transaction.
    Enriches the students table with name, group, session, image_url, etc.
    """
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            for data in profiles_batch:
                cur.execute('''
                    INSERT INTO students (roll, name, student_group, session, image_url, academic_year)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (roll) DO UPDATE SET
                        name = COALESCE(EXCLUDED.name, students.name),
                        student_group = COALESCE(EXCLUDED.student_group, students.student_group),
                        session = COALESCE(EXCLUDED.session, students.session),
                        image_url = COALESCE(EXCLUDED.image_url, students.image_url),
                        academic_year = COALESCE(EXCLUDED.academic_year, students.academic_year)
                ''', (
                    data['roll'],
                    data.get('name'),
                    data.get('group_name'),
                    data.get('session'),
                    data.get('photo_url'),
                    data.get('academic_year')
                ))
        conn.commit()
        print(f"Successfully saved batch of {len(profiles_batch)} profiles.")
        return True
    except Exception as e:
        conn.rollback()
        import traceback
        traceback.print_exc()
        print(f"Error saving profile batch: {e}")
        return False
    finally:
        conn.close()