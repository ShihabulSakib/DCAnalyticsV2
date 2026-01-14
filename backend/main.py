
from fastapi import FastAPI, HTTPException, Query, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import sqlite3
import os

app = FastAPI()

# Mount images directory
IMAGES_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'images')
os.makedirs(IMAGES_DIR, exist_ok=True)
app.mount("/static/images", StaticFiles(directory=IMAGES_DIR), name="images")

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Use the new relational database
DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'results_v2.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_access_logs():
    conn = get_db_connection()
    # Check if column exists (migration helper for existing dev setups)
    try:
        conn.execute('ALTER TABLE access_logs ADD COLUMN accessor_roll TEXT')
    except sqlite3.OperationalError:
        pass # Column likely exists
        
    conn.execute('''
        CREATE TABLE IF NOT EXISTS access_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            roll TEXT,
            accessor_roll TEXT,
            action TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            ip_address TEXT,
            status TEXT
        )
    ''')
    conn.commit()
    conn.close()

# Initialize logs on startup
init_access_logs()

def log_access(roll: str, action: str, ip: str, status: str = "Success", accessor: str = None):
    try:
        conn = get_db_connection()
        conn.execute(
            'INSERT INTO access_logs (roll, accessor_roll, action, ip_address, status) VALUES (?, ?, ?, ?, ?)',
            (roll, accessor, action, ip, status)
        )
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Logging failed: {e}")

def get_section_from_roll(roll: str) -> str:
    """Determine section (A-F) based on last 3 digits of roll number."""
    try:
        last_3 = int(roll[-3:])
        if 1 <= last_3 <= 150: return 'A'
        elif 151 <= last_3 <= 300: return 'B'
        elif 301 <= last_3 <= 450: return 'C'
        elif 451 <= last_3 <= 600: return 'D'
        elif 601 <= last_3 <= 750: return 'E'
        elif 751 <= last_3 <= 900: return 'F'
    except:
        pass
    return 'Unknown'

@app.get("/exams")
def get_exams():
    """Get list of available exams."""
    conn = get_db_connection()
    exams = conn.execute('SELECT * FROM exams').fetchall()
    conn.close()
    return [dict(e) for e in exams]

@app.get("/results/{roll}")
def get_student_result(roll: str, request: Request, exam_id: str = None, x_accessor_roll: str = Header(None)):
    """Get a student's result for a specific exam (or latest)."""
    conn = get_db_connection()
    
    # Get Student Info
    student = conn.execute('SELECT * FROM students WHERE roll = ?', (roll,)).fetchone()
    if not student:
        conn.close()
        log_access(roll, "Fetch Result", request.client.host, "Failed: Student Not Found")
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Get Result (join with exam info optionally)
    if exam_id:
        result = conn.execute('SELECT * FROM results WHERE student_id = ? AND exam_id = ?', (student['id'], exam_id)).fetchone()
    else:
        # Get latest result
        result = conn.execute('SELECT * FROM results WHERE student_id = ? ORDER BY id DESC LIMIT 1', (student['id'],)).fetchone()
    
    if not result:
        conn.close()
        raise HTTPException(status_code=404, detail="Result not found for this exam")

    # Get Subject Marks
    query = '''
        SELECT sub.name as subject_name, sm.cq, sm.mcq, sm.practical, sm.total, sm.grade, sm.gp
        FROM student_marks sm
        JOIN subjects sub ON sm.subject_id = sub.id
        WHERE sm.result_id = ?
    '''
    subjects = conn.execute(query, (result['id'],)).fetchall()
    
    # Get Exam Name
    exam = conn.execute('SELECT name FROM exams WHERE id = ?', (result['exam_id'],)).fetchone()
    exam_name = exam['name'] if exam else 'Unknown Exam'
    
    conn.close()

    log_access(roll, f"Fetch Result ({exam_name})", request.client.host, "Success", accessor=x_accessor_roll)

    return {
        "student": dict(student),
        "result": {
            "exam_id": result['exam_id'],
            "exam_name": exam_name,
            "gpa": result['gpa'],
            "total_marks": result['total_marks'],
            "status": result['status']
        },
        "subjects": [dict(s) for s in subjects]
    }

@app.get("/analytics")
def get_analytics(exam_id: str = None):
    """Get analytics for a specific exam (or latest)."""
    conn = get_db_connection()
    
    if not exam_id:
        # Default to latest exam found in results
        latest = conn.execute('SELECT exam_id FROM results ORDER BY id DESC LIMIT 1').fetchone()
        if latest:
            exam_id = latest['exam_id']
        else:
            conn.close()
            return {"total_students": 0, "subjects": {}, "sections": {}}

    # Subject Stats
    subject_query = '''
        SELECT sub.name as subject_name, sm.grade
        FROM student_marks sm
        JOIN results r ON sm.result_id = r.id
        JOIN subjects sub ON sm.subject_id = sub.id
        WHERE r.exam_id = ?
    '''
    subjects_data = conn.execute(subject_query, (exam_id,)).fetchall()
    
    stats = {}
    for row in subjects_data:
        subj = row['subject_name']
        grade = row['grade']
        
        if subj not in stats:
            stats[subj] = {'passed': 0, 'failed': 0, 'total': 0, 'a_plus': 0}
        
        stats[subj]['total'] += 1
        if grade == 'F':
            stats[subj]['failed'] += 1
        else:
            stats[subj]['passed'] += 1
            if grade == 'A+':
                stats[subj]['a_plus'] += 1

    # Section Stats
    # Get all results for this exam, join with students to get roll
    sec_query = '''
        SELECT s.roll, r.status, r.gpa 
        FROM results r
        JOIN students s ON r.student_id = s.id
        WHERE r.exam_id = ?
    '''
    results = conn.execute(sec_query, (exam_id,)).fetchall()
    
    sections = {}
    for sec in ['A', 'B', 'C', 'D', 'E', 'F']:
        sections[sec] = {'passed': 0, 'failed': 0, 'total': 0}
    
    for r in results:
        sec = get_section_from_roll(r['roll'])
        if sec in sections:
            sections[sec]['total'] += 1
            if r['status'] and r['status'].lower() == 'failed':
                sections[sec]['failed'] += 1
            else:
                sections[sec]['passed'] += 1
    
    # Exam Name
    exam_row = conn.execute('SELECT name FROM exams WHERE id = ?', (exam_id,)).fetchone()
    exam_name = exam_row['name'] if exam_row else str(exam_id)
    
    conn.close()
    
    return {
        "exam_name": exam_name,
        "total_students": len(results),
        "subjects": stats,
        "sections": sections
    }

@app.get("/merit-list")
def get_merit_list(
    sort_by: str = Query("gpa", enum=["gpa", "marks"]),
    section: str = Query("All"),
    exam_id: str = None
):
    """Get merit list for an exam."""
    conn = get_db_connection()
    
    if not exam_id:
        latest = conn.execute('SELECT exam_id FROM results ORDER BY id DESC LIMIT 1').fetchone()
        if latest:
            exam_id = latest['exam_id']
    
    if not exam_id:
        conn.close()
        return []

    # Determine order
    if sort_by == "marks":
        order = "r.total_marks DESC, r.gpa DESC"
    else:
        order = "r.gpa DESC, r.total_marks DESC"
    
    query = f'''
        SELECT s.roll, s.name, r.gpa, r.total_marks, r.status
        FROM results r
        JOIN students s ON r.student_id = s.id
        WHERE r.exam_id = ?
        ORDER BY {order}
    '''
    
    rows = conn.execute(query, (exam_id,)).fetchall()
    conn.close()
    
    # Apply section filter
    if section != "All":
        rows = [r for r in rows if get_section_from_roll(r['roll']) == section]
    
    merit_list = []
    for idx, row in enumerate(rows):
        merit_list.append({
            "position": idx + 1,
            "roll": row['roll'],
            "name": row['name'],
            "gpa": row['gpa'],
            "total_marks": row['total_marks'],
            "status": row['status'],
            "section": get_section_from_roll(row['roll'])
        })
        
    return merit_list

from pydantic import BaseModel

class AdminLogin(BaseModel):
    password: str

class StudentLogin(BaseModel):
    roll: str

@app.post("/login")
def student_login(data: StudentLogin, request: Request):
    """Log in a student (log the access)."""
    conn = get_db_connection()
    student = conn.execute('SELECT * FROM students WHERE roll = ?', (data.roll,)).fetchone()
    conn.close()
    
    if student:
        log_access(data.roll, "User Login", request.client.host, "Success", accessor=data.roll)
        return {"success": True, "student": dict(student)}
    else:
        # Still log the attempt even if failed (accessor is the attempted roll)
        log_access(data.roll, "User Login", request.client.host, "Failed: Invalid Roll", accessor=data.roll)
        raise HTTPException(status_code=404, detail="Student not found")

@app.post("/admin/login")
def admin_login(data: AdminLogin):
    if data.password == "AdminSecretPass2026": # Hardcoded as per plan
        return {"success": True, "token": "admin_session_token"}
    raise HTTPException(status_code=401, detail="Invalid Password")

@app.get("/admin/logs")
def get_logs(limit: int = 100):
    conn = get_db_connection()
    logs = conn.execute('SELECT * FROM access_logs ORDER BY timestamp DESC LIMIT ?', (limit,)).fetchall()
    conn.close()
    return [dict(l) for l in logs]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
