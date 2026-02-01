
import os
import json
import psycopg2

from psycopg2.extras import RealDictCursor
from fastapi import FastAPI, HTTPException, Query, Request, Header, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from fastapi.responses import Response
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import Optional, Dict, Any
import jwt
import requests
from datetime import datetime, timedelta
from passlib.context import CryptContext


# Load environment variables
load_dotenv()

# --- Security Configuration ---
SECRET_KEY = os.getenv("SECRET_KEY", "super_secret_key_change_this")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440 # 24 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/admin/login")



# --- Database Setup ---
DATABASE_URL = os.getenv("DATABASE_URL")

# --- Remote Image Proxy Session ---
remote_session = None

def get_remote_session():
    """Returns a session for dhakacollege.eshiksabd.com. 
    On Vercel, this will likely be new for every request, so we keep it lightweight.
    """

    global remote_session
    if remote_session is None:
        remote_session = requests.Session()
        remote_session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
    return remote_session

def get_db_connection():
    """Gets a new database connection (No Pooling for Vercel)."""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except Exception as e:
        print(f"Failed to connect to database: {e}")
        raise e

def release_db_connection(conn):
    """Closes the database connection."""
    if conn:
        try:
            conn.close()
        except Exception as e:
            print(f"Error closing connection: {e}")

def execute_query(query, params=None, fetch=None):
    """A helper function to execute queries with a fresh connection."""
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
        if conn:
            try:
                conn.rollback()
            except:
                pass
        print(f"Database Error: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        if conn: release_db_connection(conn)

# --- FastAPI App Initialization ---
app = FastAPI()

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

@app.get("/api/sessions")

def get_sessions(request: Request):
    """Get list of available sessions."""
    rows = execute_query('SELECT DISTINCT session FROM students WHERE session IS NOT NULL ORDER BY session DESC', fetch="all")
    return [r['session'] for r in rows]

@app.get("/api/exams")
def get_exams(request: Request, session: str = Query(None), group: str = Query(None)):
    """Get list of available exams, filtered by session and group using optimized columns."""
    query = """
        SELECT id, name, exam_id_text 
        FROM exams 
        WHERE 1=1
    """
    params = []
    
    # Use the new columns for filtering
    if session and session != "All":
        query += " AND target_session = %s"
        params.append(session)
    
    if group and group != "All":
        query += " AND target_group = %s"
        params.append(group)
    
    query += " ORDER BY id DESC"
    
    return execute_query(query, tuple(params) if params else None, fetch="all")

@app.get("/api/student-image/{roll}")

def get_student_image(roll: str, request: Request):
    """Proxy student image to handle authentication."""
    student = execute_query('SELECT image_url FROM students WHERE roll = %s', (roll,), fetch="one")
    
    if not student or not student['image_url']:
        raise HTTPException(status_code=404, detail="Image not found")
    
    image_url = student['image_url']
    
    # If it's already a public URL (like Cloudinary), redirect
    if "eshiksabd.com" not in image_url:
        return Response(status_code=307, headers={"Location": image_url})

    session = get_remote_session()
    
    try:
        # 1. Try fetching without explicit login first (uses existing session if warm)
        # Using a shorter timeout for the connect phase to fail fast if blocked
        resp = session.get(image_url, stream=True, timeout=(5, 10))
        
        # 2. If we get a login page or 403, we need to authenticate
        # "Authentication" in url is specific to this target site's redirect behavior
        if resp.status_code != 200 or "login" in resp.url.lower() or "Authentication" in resp.url:
            print(f"Refreshing session for image proxy: {roll}")
            login_url = "https://dhakacollege.eshiksabd.com/Authentication"
            payload = {
                'username': 'dcstudent',
                'password': 'dcstudent',
                'submit': 'Sign In'
            }
            # Perform login
            login_resp = session.post(login_url, data=payload, timeout=10)
            
            # Retry the image fetch
            resp = session.get(image_url, stream=True, timeout=(5, 10))
            
        if resp.status_code == 200:
            # Return with Cache-Control to prevent browser from asking again for 24h
            return Response(
                content=resp.content, 
                media_type=resp.headers.get("Content-Type", "image/jpeg"),
                headers={"Cache-Control": "public, max-age=86400"}
            )
        else:
            raise HTTPException(status_code=404, detail="Failed to fetch remote image")
            
    except Exception as e:
        print(f"Proxy error for {roll}: {e}")
        # Fallback placeholder could be returned here if desired
        raise HTTPException(status_code=500, detail="Image proxy error")


def resolve_exam_id(exam_identifier):
    """Resolve exam identifier (text or int) to internal integer ID."""
    if not exam_identifier:
        return None
        
    # First try to find by exam_id_text
    row = execute_query("SELECT id FROM exams WHERE exam_id_text = %s", (str(exam_identifier),), fetch="one")
    if row:
        return row['id']
    
    # If not found, it might be the internal ID already
    return exam_identifier

@app.get("/api/results/{roll}")
def get_student_result(roll: str, request: Request, exam_id: str = None, x_accessor_roll: str = Header(None)):
    """Get a student's result for a specific exam (or latest)."""
    student = execute_query('SELECT * FROM students WHERE roll = %s', (roll,), fetch="one")
    if not student:
        log_access(roll, "Fetch Result", request.client.host, "Failed: Student Not Found")
        raise HTTPException(status_code=404, detail="Student not found")

    if exam_id:
        # Resolve potentially text ID to internal ID
        internal_exam_id = resolve_exam_id(exam_id)
        result_query = 'SELECT * FROM results WHERE student_id = %s AND exam_id = %s'
        result = execute_query(result_query, (student['id'], internal_exam_id), fetch="one")
    else:
        result_query = 'SELECT * FROM results WHERE student_id = %s ORDER BY id DESC LIMIT 1'
        result = execute_query(result_query, (student['id'],), fetch="one")
    
    if not result:
        raise HTTPException(status_code=404, detail="Result not found for this exam")

    subjects_query = '''
        SELECT sub.name as subject_name, sm.grade, sm.gp, sm.total
        FROM student_marks sm
        JOIN subjects sub ON sm.subject_id = sub.id
        WHERE sm.result_id = %s
    '''
    subjects = execute_query(subjects_query, (result['id'],), fetch="all")
    
    # Optional: Fetch Exam Name logic if needed
    
    log_access(roll, "Fetch Result", request.client.host, "Success", accessor=x_accessor_roll)

    # Convert to mutable dict if it's not already
    result_dict = dict(result)
    result_dict['original_pdf_url'] = result.get('transcript_url')

    return {
        "student": student,
        "result": result_dict, # Includes original_pdf_url mapped from transcript_url
        "subjects": subjects
    }

# --- Login and Admin ---

class AdminLogin(BaseModel):
    password: str

class StudentLogin(BaseModel):
    roll: str

class LogActivityRequest(BaseModel):
    """Request model for logging user activity."""
    action: str  # VIEW_RESULT, COMPARE_RESULT, LOGIN, UPDATE_EXAM
    target_roll: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class ExamUpdateRequest(BaseModel):
    """Request model for updating exam details."""
    name: str

@app.post("/api/login")

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

def get_merit_list(
    request: Request,
    sort_by: str = Query("gpa", enum=["gpa", "marks"]),
    section: str = Query("All"),
    exam_id: str = None,
    session: str = Query(None),
    group: str = Query(None)
):
    """Get merit list for an exam with filtering."""
    if not exam_id:
        latest = execute_query('SELECT id FROM exams ORDER BY id DESC LIMIT 1', fetch="one")
        if not latest:
            return []
        exam_id = latest['id']

    order = "r.total_marks DESC NULLS LAST, r.gpa DESC NULLS LAST" if sort_by == "marks" else "r.gpa DESC NULLS LAST, r.total_marks DESC NULLS LAST"
    
    query = f'''
        SELECT s.roll, s.name, s.image_url as photo_url, r.gpa, r.total_marks, r.status
        FROM results r
        JOIN students s ON r.student_id = s.id
        WHERE r.exam_id = %s
    '''
    params = [exam_id]

    # Dynamic Filtering
    if session and session != "All":
        query += " AND s.session = %s"
        params.append(session)
    
    if group and group != "All":
        query += " AND s.student_group = %s"
        params.append(group)

    query += f" ORDER BY {order}"
    
    rows = execute_query(query, tuple(params), fetch="all")
    
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

@app.post("/api/admin/refresh-cache")
def refresh_json_cache(exam_id: int = None, current_user: str = Depends(get_current_admin)):
    """
    Regenerate JSON files for specified exam (or all recent exams if none specified).
    This endpoint triggers the json_exporter to create fresh JSON files.
    """
    try:
        import sys
        from pathlib import Path
        import subprocess
        
        # Path to the json_exporter script
        project_root = Path(__file__).parent.parent
        exporter_script = project_root / 'scraper' / 'json_exporter.py'
        
        if not exporter_script.exists():
            raise HTTPException(status_code=500, detail=f"Exporter script not found at {exporter_script}")
        
        # Run the exporter script as a subprocess
        # This is safer than importing it directly in the API process
        venv_python = project_root / 'venv' / 'bin' / 'python'
        python_cmd = str(venv_python) if venv_python.exists() else 'python3'
        
        if exam_id:
            # For specific exam, we would need to modify the exporter to accept args
            # For now, run full export and it will include this exam
            result = subprocess.run(
                [python_cmd, str(exporter_script)],
                cwd=str(project_root),
                capture_output=True,
                text=True,
                timeout=60
            )
        else:
            # Full export
            result = subprocess.run(
                [python_cmd, str(exporter_script)],
                cwd=str(project_root),
                capture_output=True,
                text=True,
                timeout=60
            )
        
        if result.returncode != 0:
            print(f"Exporter stderr: {result.stderr}")
            raise HTTPException(
                status_code=500, 
                detail=f"Export failed: {result.stderr[:500]}"
            )
        
        # Count how many files were generated
        import re
        export_count = len(re.findall(r'✅.*saved:', result.stdout))
        
        return {
            "success": True,
            "message": f"Cache refreshed successfully ({export_count} files generated)",
            "output": result.stdout[:1000]  # First 1000 chars of output
        }
        
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=500, detail="Export timed out after 60 seconds")
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Cache refresh failed: {str(e)}")


# =============================================================================
# ACTIVITY LOGGING & ANALYTICS ENDPOINTS
# =============================================================================

@app.post("/api/log-activity")
def log_activity(
    data: LogActivityRequest,
    request: Request,
    x_user_roll: str = Header(None, alias="X-User-Roll"),
    user_agent: str = Header(None, alias="User-Agent")
):
    """
    Log user activity (viewing results, comparisons, etc.).
    Requires X-User-Roll header identifying the logged-in user.
    Silently succeeds if no user roll provided (won't disrupt UX).
    """
    actor_roll = x_user_roll
    
    # If no actor roll, still log but mark as anonymous
    if not actor_roll:
        actor_roll = "anonymous"
    
    # Detect device type from User-Agent
    device_type = "desktop"  # default
    if user_agent:
        ua_lower = user_agent.lower()
        if any(mobile in ua_lower for mobile in ['mobile', 'android', 'iphone', 'ipod', 'blackberry', 'windows phone']):
            device_type = "mobile"
        elif 'tablet' in ua_lower or 'ipad' in ua_lower:
            device_type = "tablet"
    
    try:
        query = '''
            INSERT INTO access_logs 
            (actor_roll, target_roll, action_type, metadata, ip_address, status, device_type, roll, action)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        '''
        metadata_json = json.dumps(data.metadata) if data.metadata else None
        
        execute_query(query, (
            actor_roll,
            data.target_roll,
            data.action,
            metadata_json,
            request.client.host,
            "Success",
            device_type,
            data.target_roll,  # Legacy compatibility: roll column (can be null)
            data.action  # Legacy compatibility: action column (can be null)
        ))
        
        return {"success": True}
    except Exception as e:
        # Silent fail - don't disrupt user experience
        print(f"Activity logging failed: {e}")
        return {"success": True}  # Still return success to not alarm frontend


@app.get("/api/admin/logs")
def get_activity_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=10, le=100),
    action_filter: str = Query(None),
    current_user: str = Depends(get_current_admin)
):
    """
    Get paginated activity logs with enriched student data.
    Returns actor and target details (name, image).
    Admin-only endpoint.
    """
    offset = (page - 1) * page_size
    
    # Build WHERE clause
    where_conditions = ["1=1"]
    params = []
    
    if action_filter:
        where_conditions.append("al.action_type = %s")
        params.append(action_filter)
    
    where_clause = " AND ".join(where_conditions)
    
    # Main query with LEFT JOINs to get actor and target details
    query = f'''
        SELECT 
            al.id,
            al.timestamp,
            al.action_type,
            al.actor_roll,
            al.target_roll,
            al.metadata,
            al.ip_address,
            al.status,
            al.device_type,
            actor.name as actor_name,
            actor.image_url as actor_image,
            target.name as target_name,
            target.image_url as target_image
        FROM access_logs al
        LEFT JOIN students actor ON al.actor_roll = CAST(actor.roll AS TEXT)
        LEFT JOIN students target ON al.target_roll = CAST(target.roll AS TEXT)
        WHERE {where_clause}
        ORDER BY al.timestamp DESC
        LIMIT %s OFFSET %s
    '''
    params.extend([page_size, offset])
    
    logs = execute_query(query, tuple(params), fetch="all")
    
    # Get total count for pagination
    count_params = params[:-2] if params[:-2] else None
    count_query = f"SELECT COUNT(*) as total FROM access_logs al WHERE {where_clause}"
    total_result = execute_query(count_query, tuple(count_params) if count_params else None, fetch="one")
    total = total_result['total'] if total_result else 0
    
    return {
        "logs": logs,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size if total > 0 else 0
        }
    }


@app.put("/api/admin/exams/{exam_id}")
def update_exam(
    exam_id: int,
    data: ExamUpdateRequest,
    request: Request,
    current_user: str = Depends(get_current_admin)
):
    """
    Update exam name.
    Admin-only endpoint.
    """
    # Check if exam exists
    existing = execute_query("SELECT id FROM exams WHERE id = %s", (exam_id,), fetch="one")
    if not existing:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    # Update the exam name
    query = "UPDATE exams SET name = %s WHERE id = %s"
    execute_query(query, (data.name, exam_id))
    
    # Log this action
    log_query = '''
        INSERT INTO access_logs 
        (actor_roll, action_type, metadata, ip_address, status, action)
        VALUES (%s, %s, %s, %s, %s, %s)
    '''
    metadata = json.dumps({"exam_id": exam_id, "new_name": data.name})
    try:
        execute_query(log_query, (
            current_user,
            "UPDATE_EXAM",
            metadata,
            request.client.host,
            "Success",
            "Update Exam"
        ))
    except Exception as e:
        print(f"Failed to log exam update: {e}")
    
    return {"success": True, "exam_id": exam_id}


@app.get("/api/admin/students/filtered")
def get_filtered_students(
    session: str = Query(None),
    group: str = Query(None),
    section: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=10, le=200),
    current_user: str = Depends(get_current_admin)
):
    """
    Get server-side filtered student list with pagination.
    Supports filtering by session, group, and section.
    Admin-only endpoint.
    """
    offset = (page - 1) * page_size
    
    # Build query
    where_conditions = ["1=1"]
    params = []
    
    if session and session != "All":
        where_conditions.append("session = %s")
        params.append(session)
    
    if group and group != "All":
        where_conditions.append("student_group = %s")
        params.append(group)
    
    # Handle section filtering in SQL based on last 3 digits of roll
    if section and section != "All":
        # Map sections to roll number ranges
        section_ranges = {
            'A': (1, 150),
            'B': (151, 300),
            'C': (301, 450),
            'D': (451, 600),
            'E': (601, 750),
            'F': (751, 9999)
        }
        if section in section_ranges:
            start, end = section_ranges[section]
            # Extract last 3 digits and check range
            where_conditions.append("(CAST(roll AS TEXT) ~ '^[0-9]+$' AND (CAST(roll AS BIGINT) %% 1000) BETWEEN %s AND %s)")
            params.extend([start, end])
    
    where_clause = " AND ".join(where_conditions)
    
    # Main query with pagination
    query = f'''
        SELECT * FROM students 
        WHERE {where_clause}
        ORDER BY roll
        LIMIT %s OFFSET %s
    '''
    params.extend([page_size, offset])
    
    students = execute_query(query, tuple(params), fetch="all")
    
    # Get total count with same filters
    count_query = f"SELECT COUNT(*) as total FROM students WHERE {where_clause}"
    count_params = params[:-2] if len(params) > 2 else []
    total_result = execute_query(count_query, tuple(count_params) if count_params else None, fetch="one")
    total = total_result['total'] if total_result else 0
    
    return {
        "students": students,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size if total > 0 else 0
        }
    }


