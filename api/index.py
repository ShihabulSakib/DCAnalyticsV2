
import os
import psycopg2
from psycopg2.pool import SimpleConnectionPool
from psycopg2.extras import RealDictCursor
from fastapi import FastAPI, HTTPException, Query, Request, Header, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from fastapi.responses import Response
from dotenv import load_dotenv
from pydantic import BaseModel
import jwt
import requests
from datetime import datetime, timedelta
from passlib.context import CryptContext
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Load environment variables
load_dotenv()

# --- Security Configuration ---
SECRET_KEY = os.getenv("SECRET_KEY", "super_secret_key_change_this")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440 # 24 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/admin/login")

# Rate Limiter
limiter = Limiter(key_func=get_remote_address)

# --- Database Setup ---
DATABASE_URL = os.getenv("DATABASE_URL")

# Global pool variable
pool = None

# --- Remote Image Proxy Session ---
remote_session = None

def get_remote_session():
    """Returns a logged-in session for dhakacollege.eshiksabd.com"""
    global remote_session
    if remote_session is None:
        remote_session = requests.Session()
        remote_session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
    
    # Check if session is valid by hitting a protected page or just re-login if needed
    # For simplicity/robustness in this context, we'll try to access. If it fails, we login.
    # A simple approach is to always try login if we suspect it's dead, or just login once per startup.
    # Let's try to ensure login.
    try:
        # Check a lightweight page or just proceed. 
        # Ideally, check cookies. For now, let's just attempt login if no cookies.
        if not remote_session.cookies.get('PHPSESSID'): # Assuming PHPSESSID is used
            login_url = "https://dhakacollege.eshiksabd.com/Authentication"
            payload = {
                'username': 'dcstudent',
                'password': 'dcstudent',
                'submit': 'Sign In'
            }
            remote_session.post(login_url, data=payload)
    except Exception as e:
        print(f"Session init failed: {e}")
    
    return remote_session

def get_db_connection():
    """Gets a connection from the pool, creating it if necessary."""
    global pool
    if pool is None:
        try:
            pool = SimpleConnectionPool(minconn=1, maxconn=5, dsn=DATABASE_URL)
        except Exception as e:
            print(f"Failed to create connection pool: {e}")
            raise e
    return pool.getconn()

def release_db_connection(conn):
    """Releases a connection back to the pool."""
    global pool
    if pool:
        pool.putconn(conn)

def execute_query(query, params=None, fetch=None):
    """A helper function to execute queries with connection pooling."""
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params)
            if fetch == "one":
                result = cur.fetchone()
            elif fetch == "all":
                result = cur.fetchall()
            else:
                result = None 
            conn.commit()
            return result
    except Exception as e:
        if conn: conn.rollback()
        print(f"Database Error: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        if conn: release_db_connection(conn)

# --- FastAPI App Initialization ---
app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Security Utility Functions ---

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_admin(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return username
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

# --- Utility Functions ---

def log_access(roll: str, action: str, ip: str, status: str = "Success", accessor: str = None):
    """Logs an access attempt to the database."""
    query = 'INSERT INTO access_logs (roll, accessor_roll, action, ip_address, status) VALUES (%s, %s, %s, %s, %s)'
    try:
        execute_query(query, (roll, accessor, action, ip, status))
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


# --- API Endpoints ---

@app.get("/api/exams")
@limiter.limit("60/minute")
def get_exams(request: Request):
    """Get list of available exams."""
    return execute_query('SELECT * FROM exams', fetch="all")

@app.get("/api/student-image/{roll}")
@limiter.limit("120/minute")
def get_student_image(roll: str, request: Request):
    """Proxy student image to handle authentication."""
    student = execute_query('SELECT image_url FROM students WHERE roll = %s', (roll,), fetch="one")
    
    if not student or not student['image_url']:
        # Return a placeholder or 404
        raise HTTPException(status_code=404, detail="Image not found")
    
    image_url = student['image_url']
    
    # If it's already a public URL (like Cloudinary), redirect or fetch directly
    if "eshiksabd.com" not in image_url:
        return Response(status_code=307, headers={"Location": image_url})

    session = get_remote_session()
    
    try:
        # Attempt fetch
        resp = session.get(image_url, stream=True, timeout=10)
        
        # If 403/401/Login page, try re-login
        if resp.status_code != 200 or "login" in resp.url.lower():
            print("Refreshing session for image proxy...")
            login_url = "https://dhakacollege.eshiksabd.com/Authentication"
            session.post(login_url, data={'username': 'dcstudent', 'password': 'dcstudent', 'submit': 'Sign In'})
            resp = session.get(image_url, stream=True, timeout=10)
            
        if resp.status_code == 200:
            return Response(content=resp.content, media_type=resp.headers.get("Content-Type", "image/jpeg"))
        else:
            raise HTTPException(status_code=404, detail="Failed to fetch remote image")
            
    except Exception as e:
        print(f"Proxy error: {e}")
        raise HTTPException(status_code=500, detail="Image proxy error")

@app.get("/api/results/{roll}")
@limiter.limit("60/minute")
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
        SELECT sub.name as subject_name, sm.grade, sm.gp
        FROM student_marks sm
        JOIN subjects sub ON sm.subject_id = sub.id
        WHERE sm.result_id = %s
    '''
    subjects = execute_query(subjects_query, (result['id'],), fetch="all")
    
    # Optional: Fetch Exam Name logic if needed
    
    log_access(roll, "Fetch Result", request.client.host, "Success", accessor=x_accessor_roll)

    return {
        "student": student,
        "result": result, # Includes original_pdf_url
        "subjects": subjects
    }

# --- Login and Admin ---

class AdminLogin(BaseModel):
    password: str

class StudentLogin(BaseModel):
    roll: str

@app.post("/api/login")
@limiter.limit("5/minute")
def student_login(data: StudentLogin, request: Request):
    """Log in a student and log the access."""
    student = execute_query('SELECT * FROM students WHERE roll = %s', (data.roll,), fetch="one")
    if student:
        log_access(data.roll, "User Login", request.client.host, "Success", accessor=data.roll)
        return {"success": True, "student": student}
    else:
        log_access(data.roll, "User Login", request.client.host, "Failed: Invalid Roll", accessor=data.roll)
        raise HTTPException(status_code=404, detail="Student not found")

@app.post("/api/admin/login")
def admin_login(data: AdminLogin):
    # In production, check against hashed password in DB
    # For now, simple env check but using JWT
    env_pass = os.getenv("ADMIN_PASSWORD", "AdminSecretPass2026")
    if data.password == env_pass:
        access_token = create_access_token(data={"sub": "admin"})
        return {"access_token": access_token, "token_type": "bearer"}
    raise HTTPException(status_code=401, detail="Invalid Password")

@app.get("/api/admin/dashboard")
def get_admin_dashboard(current_user: str = Depends(get_current_admin)):
    """Protected Admin Route."""
    # Stats logic here
    total_students = execute_query('SELECT COUNT(*) as count FROM students', fetch="one")['count']
    total_exams = execute_query('SELECT COUNT(*) as count FROM exams', fetch="one")['count']
    
    # Recent 5 logs
    recent_logs = execute_query('SELECT * FROM access_logs ORDER BY timestamp DESC LIMIT 5', fetch="all")

    stats = {
        "total_students": total_students,
        "total_exams": total_exams
    }
    return {
        "stats": stats,
        "recent_logs": recent_logs,
        "user": current_user
    }

@app.get("/api/admin/students")
def get_all_students(current_user: str = Depends(get_current_admin)):
    """Get all students for admin table."""
    return execute_query('SELECT * FROM students ORDER BY roll', fetch="all")

@app.delete("/api/admin/students/{roll}")
def delete_student(roll: str, current_user: str = Depends(get_current_admin)):
    """Delete a student."""
    execute_query('DELETE FROM students WHERE roll = %s', (roll,))
    return {"success": True}

@app.put("/api/admin/students/{roll}")
def update_student(roll: str, data: dict, current_user: str = Depends(get_current_admin)):
    """Update student details."""
    query = '''
        UPDATE students 
        SET name = %s, student_group = %s, session = %s, image_url = %s 
        WHERE roll = %s
    '''
    execute_query(query, (
        data.get('name'), 
        data.get('group_name'), 
        data.get('session'), 
        data.get('photo_url'), 
        roll
    ))
    return {"success": True}

@app.get("/api/merit-list")
@limiter.limit("60/minute")
def get_merit_list(
    request: Request,
    sort_by: str = Query("gpa", enum=["gpa", "marks"]),
    section: str = Query("All"),
    exam_id: str = None
):
    """Get merit list for an exam."""
    if not exam_id:
        latest = execute_query('SELECT id FROM exams ORDER BY id DESC LIMIT 1', fetch="one")
        if not latest:
            return []
        exam_id = latest['id']

    order = "r.total_marks DESC, r.gpa DESC" if sort_by == "marks" else "r.gpa DESC, r.total_marks DESC"
    
    query = f'''
        SELECT s.roll, s.name, s.image_url as photo_url, r.gpa, r.total_marks, r.status
        FROM results r
        JOIN students s ON r.student_id = s.id
        WHERE r.exam_id = %s
        ORDER BY {order}
    '''
    
    rows = execute_query(query, (exam_id,), fetch="all")
    
    if section != "All":
        rows = [r for r in rows if get_section_from_roll(str(r['roll'])) == section]
    
    return [
        {
            "position": idx + 1,
            "roll": row['roll'],
            "name": row['name'],
            "photo_url": row['photo_url'],
            "gpa": row['gpa'],
            "total_marks": row['total_marks'],
            "status": row['status'],
            "section": get_section_from_roll(str(row['roll']))
        } for idx, row in enumerate(rows)
    ]

@app.get("/api/analytics")
@limiter.limit("60/minute")
def get_analytics(request: Request, exam_id: str = None):
    """Get analytics for a specific exam."""
    if not exam_id:
        latest = execute_query('SELECT id FROM exams ORDER BY id DESC LIMIT 1', fetch="one")
        if latest:
            exam_id = latest['id']
        else:
            return {"total_students": 0, "subjects": {}, "sections": {}, "gpa_by_group": {}, "grade_distribution": {}}

    # Get subject stats
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

    # Get section stats
    sec_query = '''
        SELECT s.roll, r.status, r.gpa 
        FROM results r
        JOIN students s ON r.student_id = s.id
        WHERE r.exam_id = %s
    '''
    results = execute_query(sec_query, (exam_id,), fetch="all")
    
    sections = {sec: {'passed': 0, 'failed': 0, 'total': 0} for sec in ['A', 'B', 'C', 'D', 'E', 'F']}
    for r in results:
        sec = get_section_from_roll(str(r['roll']))
        if sec in sections:
            sections[sec]['total'] += 1
            if r['status'] and r['status'].lower() == 'failed':
                sections[sec]['failed'] += 1
            else:
                sections[sec]['passed'] += 1
                
    # GPA by Group
    group_query = '''
        SELECT s.student_group as group_name, AVG(r.gpa) as avg_gpa
        FROM results r
        JOIN students s ON r.student_id = s.id
        WHERE r.exam_id = %s
        GROUP BY s.student_group
    '''
    group_data = execute_query(group_query, (exam_id,), fetch="all")
    gpa_by_group = {row['group_name']: row['avg_gpa'] for row in group_data} if group_data else {}

    # Grade Distribution (Placeholder since grade column is missing in results table)
    grade_distribution = {}
    
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
