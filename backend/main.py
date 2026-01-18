
import os
import psycopg2
from psycopg2.pool import SimpleConnectionPool
from psycopg2.extras import RealDictCursor
from fastapi import FastAPI, HTTPException, Query, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from pydantic import BaseModel

# Load environment variables from .env file
load_dotenv()

# --- Database Setup ---
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise Exception("DATABASE_URL environment variable not set!")

# Use a connection pool
pool = SimpleConnectionPool(minconn=1, maxconn=10, dsn=DATABASE_URL)

def get_db_connection():
    """Gets a connection from the pool."""
    return pool.getconn()

def release_db_connection(conn):
    """Releases a connection back to the pool."""
    pool.putconn(conn)

def execute_query(query, params=None, fetch=None):
    """A helper function to execute queries with connection pooling."""
    conn = None
    try:
        conn = get_db_connection()
        # Use RealDictCursor to get results as dictionaries
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params)
            if fetch == "one":
                result = cur.fetchone()
            elif fetch == "all":
                result = cur.fetchall()
            else:
                result = None # For INSERT, UPDATE, DELETE
            conn.commit()
            return result
    except Exception as e:
        # In case of an error, rollback the transaction
        if conn:
            conn.rollback()
        print(f"Database Error: {e}")
        # Re-raise the exception to be handled by FastAPI's error handling
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        if conn:
            release_db_connection(conn)

# --- FastAPI App Initialization ---
app = FastAPI()



# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    # In production, you should restrict this to your frontend's deployed URL
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Utility Functions ---

def log_access(roll: str, action: str, ip: str, status: str = "Success", accessor: str = None):
    """Logs an access attempt to the database."""
    query = 'INSERT INTO access_logs (roll, accessor_roll, action, ip_address, status) VALUES (%s, %s, %s, %s, %s)'
    try:
        execute_query(query, (roll, accessor, action, ip, status))
    except Exception as e:
        # If logging fails, just print the error and continue. Don't crash the request.
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


# --- API Endpoints ---

@app.get("/exams")
def get_exams():
    """Get list of available exams."""
    return execute_query('SELECT * FROM exams', fetch="all")

@app.get("/results/{roll}")
def get_student_result(roll: str, request: Request, exam_id: str = None, x_accessor_roll: str = Header(None)):
    """Get a student's result for a specific exam (or latest)."""
    student = execute_query('SELECT * FROM students WHERE roll = %s', (roll,), fetch="one")
    if not student:
        log_access(roll, "Fetch Result", request.client.host, "Failed: Student Not Found")
        raise HTTPException(status_code=404, detail="Student not found")

    if exam_id:
        result_query = 'SELECT * FROM results WHERE student_id = %s AND exam_id = %s'
        result = execute_query(result_query, (student['id'], exam_id), fetch="one")
    else:
        result_query = 'SELECT * FROM results WHERE student_id = %s ORDER BY id DESC LIMIT 1'
        result = execute_query(result_query, (student['id'],), fetch="one")
    
    if not result:
        raise HTTPException(status_code=404, detail="Result not found for this exam")

    subjects_query = '''
        SELECT sub.name as subject_name, sm.cq, sm.mcq, sm.practical, sm.total, sm.grade, sm.gp
        FROM student_marks sm
        JOIN subjects sub ON sm.subject_id = sub.id
        WHERE sm.result_id = %s
    '''
    subjects = execute_query(subjects_query, (result['id'],), fetch="all")
    
    exam = execute_query('SELECT name FROM exams WHERE id = %s', (result['exam_id'],), fetch="one")
    exam_name = exam['name'] if exam else 'Unknown Exam'

    log_access(roll, f"Fetch Result ({exam_name})", request.client.host, "Success", accessor=x_accessor_roll)

    return {
        "student": student,
        "result": {
            "exam_id": result['exam_id'],
            "exam_name": exam_name,
            "gpa": result['gpa'],
            "total_marks": result['total_marks'],
            "status": result['status']
        },
        "subjects": subjects
    }

@app.get("/analytics")
def get_analytics(exam_id: str = None):
    """Get analytics for a specific exam (or latest)."""
    if not exam_id:
        latest = execute_query('SELECT exam_id FROM results ORDER BY id DESC LIMIT 1', fetch="one")
        if latest:
            exam_id = latest['exam_id']
        else:
            return {"total_students": 0, "subjects": {}, "sections": {}, "gpa_by_group": {}, "grade_distribution": {}}

    # 1. Subject Performance
    subject_query = '''
        SELECT sub.name as subject_name, sm.grade
        FROM student_marks sm
        JOIN results r ON sm.result_id = r.id
        JOIN subjects sub ON sm.subject_id = sub.id
        WHERE r.exam_id = %s
    '''
    subjects_data = execute_query(subject_query, (exam_id,), fetch="all")
    
    stats = {}
    for row in subjects_data:
        subj, grade = row['subject_name'], row['grade']
        if subj not in stats:
            stats[subj] = {'passed': 0, 'failed': 0, 'total': 0, 'a_plus': 0}
        
        stats[subj]['total'] += 1
        if grade == 'F':
            stats[subj]['failed'] += 1
        else:
            stats[subj]['passed'] += 1
            if grade == 'A+':
                stats[subj]['a_plus'] += 1

    # 2. Section Performance
    sec_query = '''
        SELECT s.roll, r.status, r.gpa 
        FROM results r
        JOIN students s ON r.student_id = s.id
        WHERE r.exam_id = %s
    '''
    results = execute_query(sec_query, (exam_id,), fetch="all")
    
    sections = {sec: {'passed': 0, 'failed': 0, 'total': 0} for sec in ['A', 'B', 'C', 'D', 'E', 'F']}
    for r in results:
        sec = get_section_from_roll(r['roll'])
        if sec in sections:
            sections[sec]['total'] += 1
            if r['status'] and r['status'].lower() == 'failed':
                sections[sec]['failed'] += 1
            else:
                sections[sec]['passed'] += 1
    
    # 3. GPA by Group (New)
    group_query = '''
        SELECT s.group_name, AVG(r.gpa) as avg_gpa
        FROM results r
        JOIN students s ON r.student_id = s.id
        WHERE r.exam_id = %s
        GROUP BY s.group_name
    '''
    group_data = execute_query(group_query, (exam_id,), fetch="all")
    gpa_by_group = {row['group_name']: row['avg_gpa'] for row in group_data} if group_data else {}

    # 4. Overall Grade Distribution (New)
    # Assuming 'grade' column exists in results table or we derive it from GPA ranges if not.
    # The schema says 'grade' exists in results.
    grade_query = '''
        SELECT grade, COUNT(*) as count
        FROM results
        WHERE exam_id = %s
        GROUP BY grade
    '''
    grade_data = execute_query(grade_query, (exam_id,), fetch="all")
    grade_distribution = {row['grade']: row['count'] for row in grade_data} if grade_data else {}

    exam_row = execute_query('SELECT name FROM exams WHERE id = %s', (exam_id,), fetch="one")
    exam_name = exam_row['name'] if exam_row else str(exam_id)
    
    return {
        "exam_name": exam_name,
        "total_students": len(results),
        "subjects": stats,
        "sections": sections,
        "gpa_by_group": gpa_by_group,
        "grade_distribution": grade_distribution
    }

@app.get("/merit-list")
def get_merit_list(
    sort_by: str = Query("gpa", enum=["gpa", "marks"]),
    section: str = Query("All"),
    exam_id: str = None
):
    """Get merit list for an exam."""
    if not exam_id:
        latest = execute_query('SELECT exam_id FROM results ORDER BY id DESC LIMIT 1', fetch="one")
        if not latest: return []
        exam_id = latest['exam_id']

    order = "r.total_marks DESC, r.gpa DESC" if sort_by == "marks" else "r.gpa DESC, r.total_marks DESC"
    
    query = f'''
        SELECT s.roll, s.name, r.gpa, r.total_marks, r.status
        FROM results r
        JOIN students s ON r.student_id = s.id
        WHERE r.exam_id = %s
        ORDER BY {order}
    '''
    
    rows = execute_query(query, (exam_id,), fetch="all")
    
    if section != "All":
        rows = [r for r in rows if get_section_from_roll(r['roll']) == section]
    
    return [
        {
            "position": idx + 1,
            "roll": row['roll'],
            "name": row['name'],
            "gpa": row['gpa'],
            "total_marks": row['total_marks'],
            "status": row['status'],
            "section": get_section_from_roll(row['roll'])
        } for idx, row in enumerate(rows)
    ]

# --- Login and Admin ---

class AdminLogin(BaseModel):
    password: str

class StudentLogin(BaseModel):
    roll: str

@app.post("/login")
def student_login(data: StudentLogin, request: Request):
    """Log in a student and log the access."""
    student = execute_query('SELECT * FROM students WHERE roll = %s', (data.roll,), fetch="one")
    
    if student:
        log_access(data.roll, "User Login", request.client.host, "Success", accessor=data.roll)
        return {"success": True, "student": student}
    else:
        log_access(data.roll, "User Login", request.client.host, "Failed: Invalid Roll", accessor=data.roll)
        raise HTTPException(status_code=404, detail="Student not found")

@app.post("/admin/login")
def admin_login(data: AdminLogin):
    # This is a security risk. In a real app, use a proper, hashed password system.
    if data.password == os.getenv("ADMIN_PASSWORD", "AdminSecretPass2026"):
        return {"success": True, "token": "admin_session_token"} # Use JWT in a real app
    raise HTTPException(status_code=401, detail="Invalid Password")

@app.get("/admin/dashboard")
def get_admin_dashboard_data(request: Request): # token verification should be middleware in real app
    # Simple auth check (mock) - relying on frontend sending token in real scenario
    # In production, use Depends(get_current_admin_user)
    
    # Stats
    total_students = execute_query('SELECT COUNT(*) as count FROM students', fetch="one")['count']
    total_exams = execute_query('SELECT COUNT(*) as count FROM exams', fetch="one")['count']
    
    # Recent 5 logs
    recent_logs = execute_query('SELECT * FROM access_logs ORDER BY timestamp DESC LIMIT 5', fetch="all")

    return {
        "stats": {
            "total_students": total_students,
            "total_exams": total_exams
        },
        "recent_logs": recent_logs
    }

@app.get("/admin/students")
def get_all_students():
    """Get all students for admin table."""
    return execute_query('SELECT * FROM students ORDER BY roll', fetch="all")

@app.delete("/admin/students/{roll}")
def delete_student(roll: str):
    """Delete a student."""
    execute_query('DELETE FROM students WHERE roll = %s', (roll,))
    return {"success": True}

@app.put("/admin/students/{roll}")
def update_student(roll: str, data: dict): # Simplified payload
    """Update student details."""
    query = '''
        UPDATE students 
        SET name = %s, group_name = %s, session = %s, photo_url = %s 
        WHERE roll = %s
    '''
    execute_query(query, (data.get('name'), data.get('group_name'), data.get('session'), data.get('photo_url'), roll))
    return {"success": True}

# --- Main execution ---
if __name__ == "__main__":
    import uvicorn
    # This is for local development. Render will use its own command to run the app.
    uvicorn.run(app, host="0.0.0.0", port=8000)
