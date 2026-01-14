
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'results.db')

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Students table
    c.execute('''CREATE TABLE IF NOT EXISTS students (
        roll TEXT PRIMARY KEY,
        name TEXT,
        student_group TEXT,
        session TEXT
    )''')

    # Exams table (to track which exams we have exam metadata for)
    c.execute('''CREATE TABLE IF NOT EXISTS exams (
        id TEXT PRIMARY KEY,
        name TEXT
    )''')

    # Results table (Overall result for a student in an exam)
    c.execute('''CREATE TABLE IF NOT EXISTS results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_roll TEXT,
        exam_id TEXT,
        gpa REAL,
        grade TEXT,
        total_marks REAL,
        status TEXT,
        pdf_path TEXT,
        FOREIGN KEY(student_roll) REFERENCES students(roll),
        FOREIGN KEY(exam_id) REFERENCES exams(id),
        UNIQUE(student_roll, exam_id)
    )''')

    # Subject Results table (Detailed marks per subject)
    c.execute('''CREATE TABLE IF NOT EXISTS subject_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        result_id INTEGER,
        subject_name TEXT,
        cq REAL,
        mcq REAL,
        prac REAL,
        total REAL,
        grade TEXT,
        gp REAL,
        FOREIGN KEY(result_id) REFERENCES results(id)
    )''')

    conn.commit()
    conn.close()

def save_student(roll, name, group, session_year):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''INSERT OR IGNORE INTO students (roll, name, student_group, session)
                 VALUES (?, ?, ?, ?)''', (roll, name, group, session_year))
    conn.commit()
    conn.close()

def save_exam(exam_id, exam_name):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''INSERT OR IGNORE INTO exams (id, name) VALUES (?, ?)''', (exam_id, exam_name))
    conn.commit()
    conn.close()

def save_result(student_roll, exam_id, data, pdf_path):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Insert Result
    try:
        c.execute('''INSERT INTO results (student_roll, exam_id, gpa, grade, total_marks, status, pdf_path)
                     VALUES (?, ?, ?, ?, ?, ?, ?)
                     ON CONFLICT(student_roll, exam_id) DO UPDATE SET
                     gpa=excluded.gpa, grade=excluded.grade, total_marks=excluded.total_marks, 
                     status=excluded.status, pdf_path=excluded.pdf_path''',
                  (student_roll, exam_id, data.get('gpa', 0.0), data.get('grade', 'F'), 
                   data.get('total_marks', 0), data.get('status', 'Unknown'), pdf_path))
        
        result_id = c.lastrowid
        if result_id is None: # In case of update, get the ID
            c.execute('SELECT id FROM results WHERE student_roll=? AND exam_id=?', (student_roll, exam_id))
            result_id = c.fetchone()[0]

        # Clear old subject results for this result_id to avoid duplication on re-scrape
        c.execute('DELETE FROM subject_results WHERE result_id=?', (result_id,))

        # Insert Subjects
        for subj in data.get('subjects', []):
            c.execute('''INSERT INTO subject_results (result_id, subject_name, cq, mcq, prac, total, grade, gp)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)''', 
                      (result_id, subj['name'], subj.get('cq', 0), subj.get('mcq', 0), 
                       subj.get('prac', 0), subj['total'], subj['grade'], subj['gp']))
        
        conn.commit()
    except Exception as e:
        print(f"Error saving result for {student_roll}: {e}")
    finally:
        conn.close()
