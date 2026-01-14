#!/usr/bin/env python3
"""
Robust PDF Parser for Student Results
Uses pdfplumber for layout-aware parsing and a relational SQLite database.
FIXED v2: Multi-strategy GPA extraction with table structure analysis
"""

import pdfplumber
import sqlite3
import re
import os
import sys
import logging

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

# Database path
DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'results_v2.db')

# --- Database Setup ---

def init_db(conn=None):
    """Initialize the relational database schema."""
    if conn is None:
        conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Students table (Static info)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            roll TEXT UNIQUE NOT NULL,
            name TEXT,
            session TEXT,
            student_group TEXT,
            image_path TEXT
        )
    ''') 

    # Exams table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS exams (
            id TEXT PRIMARY KEY,
            name TEXT
        )
    ''')

    # Results table (Dynamic info per exam)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            exam_id TEXT NOT NULL,
            gpa REAL,
            total_marks REAL,
            status TEXT,
            FOREIGN KEY (student_id) REFERENCES students(id),
            FOREIGN KEY (exam_id) REFERENCES exams(id),
            UNIQUE(student_id, exam_id)
        )
    ''')
    
    # Subjects master table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS subjects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL
        )
    ''')
    
    # Student marks (Linked to Result)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS student_marks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            result_id INTEGER NOT NULL,
            subject_id INTEGER NOT NULL,
            cq REAL,
            mcq REAL,
            practical REAL,
            total REAL,
            grade TEXT,
            gp REAL,
            FOREIGN KEY (result_id) REFERENCES results(id),
            FOREIGN KEY (subject_id) REFERENCES subjects(id),
            UNIQUE(result_id, subject_id)
        )
    ''')
    
    conn.commit()
    return conn

def get_or_create_subject(conn, subject_name):
    """Get existing subject ID or create a new one."""
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM subjects WHERE name = ?", (subject_name,))
    row = cursor.fetchone()
    if row:
        return row['id']
    cursor.execute("INSERT INTO subjects (name) VALUES (?)", (subject_name,))
    conn.commit()
    return cursor.lastrowid

# --- GPA Extraction Helper ---

def extract_gpa_after_ict(text):
    """
    Extract GPA from text by finding the second number after 'ict'.
    Strategy: Look for 'ict', then capture the second decimal number following it.
    This is for layouts where the final GPA is listed after the ICT subject's GPA.
    """
    logger.info("Strategy: Extracting GPA from 'ICT' pattern")
    
    # This regex looks for 'ict' (case-insensitive), then non-greedily finds
    # the first decimal number, skips some more text, and finds the second one.
    # It allows for flexible spacing and other text between the numbers.
    # Using re.DOTALL allows '.' to match newlines.
    match = re.search(r'ict.*?(\d+\.\d+).*?(\d+\.\d+)', text, re.IGNORECASE | re.DOTALL)
    
    if match:
        try:
            # The second captured group is the target GPA
            gpa_str = match.group(2)
            gpa = float(gpa_str)
            
            # Basic validation
            if 0.0 <= gpa <= 5.0:
                logger.info(f"Found GPA candidate via ICT pattern: {gpa}")
                return gpa
            else:
                logger.warning(f"Discarding out-of-range GPA from ICT pattern: {gpa}")
        except (ValueError, IndexError):
            logger.warning("Could not parse number from ICT pattern match.")
            pass
            
    return None

def extract_gpa_from_table(main_table, header_idx):
    """
    Extract GPA using table structure analysis.
    Strategy: Find rows after subjects that contain GPA labels and extract the rightmost valid number.
    """
    logger.info("Strategy: Extracting GPA from table structure")
    
    if header_idx is None:
        return None
    
    # Look through rows AFTER the subjects
    # These typically contain summary rows like "Total", "GPA", etc.
    gpa_candidates = []
    
    for row_idx, row in enumerate(main_table[header_idx + 1:], start=header_idx + 1):
        if not row:
            continue
        
        # Convert row to string for analysis
        row_text = ' '.join([str(cell) if cell else '' for cell in row]).strip()
        
        # Check if this row mentions GPA (but not just "GP" which is grade point)
        if re.search(r'\bGPA\b', row_text, re.IGNORECASE):
            logger.info(f"Found GPA row at index {row_idx}: {row_text}")
            
            # Extract all decimal numbers from this row
            decimals = re.findall(r'\b(\d+\.\d+)\b', row_text)
            
            for dec in decimals:
                try:
                    val = float(dec)
                    if 0.0 <= val <= 5.0:
                        gpa_candidates.append({
                            'value': val,
                            'row_idx': row_idx,
                            'context': row_text[:50]
                        })
                        logger.info(f"  Found GPA candidate: {val}")
                except ValueError:
                    continue
    
    # Return the LAST valid GPA found (most likely to be final GPA)
    if gpa_candidates:
        final_gpa = gpa_candidates[-1]
        logger.info(f"Selected GPA: {final_gpa['value']} from row: {final_gpa['context']}")
        return final_gpa['value']
    
    return None

def extract_gpa_from_text(text):
    """
    Extract GPA from text using pattern matching.
    Strategy: Look for explicit GPA labels or isolated decimal numbers in result section.
    """
    logger.info("Strategy: Extracting GPA from text patterns")
    
    gpa_candidates = []
    
    # Pattern 1: Explicit GPA label
    explicit_patterns = [
        r'GPA\s*(?:\(.*?\))?\s*[:\-]?\s*(\d+\.\d+)',  # GPA (Without Additional Subj) 3.5
        r'\bGPA\s+(\d+\.\d+)\b',  # GPA 4.17
    ]
    
    for pattern in explicit_patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for match in matches:
            try:
                val = float(match.group(1))
                if 0.0 <= val <= 5.0:
                    context = text[max(0, match.start()-20):match.end()+20]
                    gpa_candidates.append({
                        'value': val,
                        'priority': 1,  # High priority for explicit labels
                        'context': context
                    })
                    logger.info(f"Found explicit GPA: {val} (context: {context.strip()})")
            except (ValueError, IndexError):
                continue
    
    # Pattern 2: Look in the last portion of document for isolated decimals
    lines = text.split('\n')
    result_section_start = None
    
    # Find where result section starts (after all subjects)
    for i, line in enumerate(lines):
        if re.search(r'Total.*(?:Without|additional)', line, re.IGNORECASE):
            result_section_start = i
            break
    
    if result_section_start:
        result_section = '\n'.join(lines[result_section_start:])
        logger.info(f"Analyzing result section starting at line {result_section_start}")
        
        # Find all isolated decimal numbers in result section
        for line in lines[result_section_start:]:
            decimals = re.findall(r'\b(\d+\.\d+)\b', line)
            for dec in decimals:
                try:
                    val = float(dec)
                    if 0.0 <= val <= 5.0:
                        gpa_candidates.append({
                            'value': val,
                            'priority': 2,  # Lower priority than explicit labels
                            'context': line.strip()
                        })
                        logger.info(f"Found decimal in result section: {val} (context: {line.strip()})")
                except ValueError:
                    continue
    
    # Sort by priority (explicit labels first), then take the last one
    if gpa_candidates:
        gpa_candidates.sort(key=lambda x: (x['priority'], x['value']))
        final_gpa = gpa_candidates[-1]
        logger.info(f"Selected GPA: {final_gpa['value']} from: {final_gpa['context']}")
        return final_gpa['value']
    
    return None

# --- PDF Parsing ---

def parse_pdf(pdf_path):
    """Parse a student result PDF using pdfplumber."""
    logger.info(f"Parsing: {pdf_path}")
    
    student_data = {
        'roll': None,
        'name': None,
        'session': None,
        'student_group': None,
        'gpa': None,
        'total_marks': None,
        'status': None,
    }
    subjects_data = []
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            if not pdf.pages:
                logger.warning("PDF has no pages")
                return None, []
            
            page = pdf.pages[0]
            text = page.extract_text() or ""
            
            # --- Extract Key-Value Info ---
            # Roll Number
            roll_match = re.search(r"(?:Class\s+Roll|Roll|\u09b0\u09cb\u09b2)\s*[:\-]?\s*(\d{10,})", text, re.IGNORECASE)
            if roll_match:
                student_data['roll'] = roll_match.group(1).strip()
            
            # Name
            name_match = re.search(r"Name\s+([A-Z][A-Za-z\.\s]+?)\s+(?:A\+|A\-|A|B|C|D|F|\d)", text)
            if not name_match:
                name_match = re.search(r"Name\s+([A-Z][A-Za-z\.\s]+?)\n", text)
            if name_match:
                name = name_match.group(1).strip()
                if name and len(name) > 3:
                    student_data['name'] = name
            
            # Session
            session_match = re.search(r"Session\s*[:\-]?\s*([\d\-]+)", text, re.IGNORECASE)
            if session_match:
                student_data['session'] = session_match.group(1).strip()
            
            # Group
            group_match = re.search(r"(?:Group|\(2nd Year)\s*[:\-]?\s*(HSC\s*[-\u2013]\s*\w+)", text, re.IGNORECASE)
            if group_match:
                student_data['student_group'] = group_match.group(1).strip()
            
            # Status
            if re.search(r"Result\s*:\s*Passed", text, re.IGNORECASE):
                student_data['status'] = 'Passed'
            elif re.search(r"Result\s*:\s*Failed", text, re.IGNORECASE):
                student_data['status'] = 'Failed'
                student_data['gpa'] = 0.00  # Failed students have 0.00 GPA
            elif re.search(r"\bPassed\b", text, re.IGNORECASE):
                student_data['status'] = 'Passed'
            elif re.search(r"\bFailed\b", text, re.IGNORECASE):
                student_data['status'] = 'Failed'
                student_data['gpa'] = 0.00  # Failed students have 0.00 GPA
            
            # --- Extract Subject Table ---
            tables = page.extract_tables()
            header_idx = None
            
            if tables:
                # Find the main subject table
                main_table = max(tables, key=lambda t: len(t))
                
                # Identify header row
                for i, row in enumerate(main_table):
                    row_text = ' '.join([str(c) for c in row if c])
                    if re.search(r"subject|বিষয়|grade|গ্রেড", row_text, re.IGNORECASE):
                        header_idx = i
                        break
                
                if header_idx is not None:
                    headers = [str(h).strip().lower() if h else '' for h in main_table[header_idx]]
                    
                    # Find column indices
                    def find_col(keywords):
                        for i, h in enumerate(headers):
                            for kw in keywords:
                                if kw in h:
                                    return i
                        return None
                    
                    subj_col = find_col(['subject', 'বিষয়'])
                    grade_col = find_col(['grade', 'গ্রেড'])
                    gp_col = find_col(['gp', 'point', 'পয়েন্ট'])
                    total_col = find_col(['total', 'মোট'])
                    cq_col = find_col(['cq', 'রচনামূলক'])
                    mcq_col = find_col(['mcq', 'নৈর্ব্যক্তিক'])
                    prac_col = find_col(['practical', 'ব্যবহারিক'])
                    
                    # Parse subject rows
                    for row in main_table[header_idx + 1:]:
                        if not row or len(row) <= (subj_col or 0):
                            continue
                        
                        subject_name = str(row[subj_col]).strip() if subj_col is not None and row[subj_col] else None
                        
                        # Skip non-subject rows
                        skip_patterns = [
                            r'^total',
                            r'^additional subject',
                            r'^মোট',
                            r'^subject',
                            r'^বিষয়',
                            r'^$',
                            r'^\d+$',
                            r'^gpa',  # Skip GPA summary rows
                        ]
                        if not subject_name:
                            continue
                        if any(re.match(p, subject_name.lower()) for p in skip_patterns):
                            continue
                        
                        # Handle duplicate subjects
                        existing_idx = next((i for i, s in enumerate(subjects_data) if s['name'].lower() == subject_name.lower()), None)
                        
                        if existing_idx is not None:
                            prev_name = subjects_data[existing_idx]['name']
                            if "1st paper" not in prev_name.lower():
                                subjects_data[existing_idx]['name'] = f"{prev_name} 1st Paper"
                            subject_name = f"{subject_name} 2nd Paper"
                        
                        def safe_float(val):
                            if val is None:
                                return None
                            try:
                                return float(str(val).strip())
                            except ValueError:
                                return None
                        
                        subj = {
                            'name': subject_name,
                            'cq': safe_float(row[cq_col]) if cq_col and cq_col < len(row) else None,
                            'mcq': safe_float(row[mcq_col]) if mcq_col and mcq_col < len(row) else None,
                            'practical': safe_float(row[prac_col]) if prac_col and prac_col < len(row) else None,
                            'total': safe_float(row[total_col]) if total_col and total_col < len(row) else None,
                            'grade': str(row[grade_col]).strip() if grade_col and grade_col < len(row) and row[grade_col] else None,
                            'gp': safe_float(row[gp_col]) if gp_col and gp_col < len(row) else None,
                        }
                        
                        subjects_data.append(subj)
                
                # --- MULTI-STRATEGY GPA EXTRACTION ---
                logger.info("\n=== Starting GPA Extraction ===")

                # Strategy 1: Extract GPA from 'ICT' pattern (High Priority)
                if student_data['gpa'] is None:
                    student_data['gpa'] = extract_gpa_after_ict(text)

                # Strategy 2: Extract from table structure
                if student_data['gpa'] is None:
                    student_data['gpa'] = extract_gpa_from_table(main_table, header_idx)

                # Strategy 3: Extract from general text patterns (Fallback)
                if student_data['gpa'] is None:
                    student_data['gpa'] = extract_gpa_from_text(text)

                logger.info(f"Final GPA extracted: {student_data['gpa']}")
                logger.info("=== GPA Extraction Complete ===\n")
            
            # If student failed and GPA is not specified, set it to 0.00
            if student_data['status'] == 'Failed' and student_data['gpa'] is None:
                student_data['gpa'] = 0.00
            
            # Calculate total marks
            if student_data['total_marks'] is None:
                total = sum(s['total'] for s in subjects_data if s['total'])
                student_data['total_marks'] = total if total > 0 else None
    
    except Exception as e:
        logger.error(f"Error parsing PDF: {e}")
        import traceback
        traceback.print_exc()
        return None, []
    
    # Validate required fields
    if not student_data['roll']:
        logger.warning("Roll number not found, skipping")
        return None, []
    
    return student_data, subjects_data

# --- Database Insertion ---

def save_to_db(conn, student_data, subjects_data, exam_id='Unknown'):
    """Save parsed data to the relational database."""
    cursor = conn.cursor()
    
    # 1. Insert or update student
    cursor.execute('''
        INSERT INTO students (roll, name, session, student_group)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(roll) DO UPDATE SET
            name = excluded.name,
            session = excluded.session,
            student_group = excluded.student_group
    ''', (
        student_data['roll'],
        student_data['name'],
        student_data['session'],
        student_data['student_group']
    ))
    
    # Get student ID
    cursor.execute("SELECT id FROM students WHERE roll = ?", (student_data['roll'],))
    student_id = cursor.fetchone()['id']
    
    # 2. Ensure Exam exists
    cursor.execute("INSERT OR IGNORE INTO exams (id, name) VALUES (?, ?)", (exam_id, f"Exam {exam_id}"))

    # 3. Insert Result
    cursor.execute('''
        INSERT INTO results (student_id, exam_id, gpa, total_marks, status)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(student_id, exam_id) DO UPDATE SET
            gpa = excluded.gpa,
            total_marks = excluded.total_marks,
            status = excluded.status
    ''', (
        student_id,
        exam_id,
        student_data['gpa'],
        student_data['total_marks'],
        student_data['status']
    ))
    
    # Get Result ID
    cursor.execute("SELECT id FROM results WHERE student_id = ? AND exam_id = ?", (student_id, exam_id))
    result_id = cursor.fetchone()['id']

    # 4. Insert subjects marks
    for subj in subjects_data:
        subject_id = get_or_create_subject(conn, subj['name'])
        
        cursor.execute('''
            INSERT INTO student_marks (result_id, subject_id, cq, mcq, practical, total, grade, gp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(result_id, subject_id) DO UPDATE SET
                cq = excluded.cq,
                mcq = excluded.mcq,
                practical = excluded.practical,
                total = excluded.total,
                grade = excluded.grade,
                gp = excluded.gp
        ''', (
            result_id,
            subject_id,
            subj['cq'],
            subj['mcq'],
            subj['practical'],
            subj['total'],
            subj['grade'],
            subj['gp']
        ))
    
    conn.commit()
    logger.info(f"Saved result for Roll {student_data['roll']} (Exam {exam_id})")
    return result_id

# --- Verification ---

def verify_data(conn, result_id):
    """Verify data integrity by running a JOIN query."""
    cursor = conn.cursor()
    
    query = '''
        SELECT 
            s.roll, s.name, r.gpa, r.status,
            sub.name AS subject,
            sm.total, sm.grade, sm.gp
        FROM results r
        JOIN students s ON r.student_id = s.id
        JOIN student_marks sm ON r.id = sm.result_id
        JOIN subjects sub ON sm.subject_id = sub.id
        WHERE r.id = ?
        ORDER BY sub.name
    '''
    
    cursor.execute(query, (result_id,))
    rows = cursor.fetchall()
    
    if rows:
        print("\n" + "="*60)
        print("VERIFICATION: Data retrieved via JOIN")
        print("="*60)
        print(f"Student: {rows[0]['name']} (Roll: {rows[0]['roll']})")
        print(f"GPA: {rows[0]['gpa']} | Status: {rows[0]['status']}")
        print("-"*60)
        print(f"{'Subject':<25} {'Total':>8} {'Grade':>6} {'GP':>6}")
        print("-"*60)
        for row in rows:
            total = row['total'] if row['total'] else '-'
            grade = row['grade'] if row['grade'] else '-'
            gp = row['gp'] if row['gp'] else '-'
            print(f"{row['subject']:<25} {str(total):>8} {str(grade):>6} {str(gp):>6}")
        print("="*60 + "\n")
    else:
        print("No data found for verification")

# --- Main ---

def main():
    if len(sys.argv) < 2:
        pdf_dir = os.path.join(os.path.dirname(__file__), '..', 'data', 'pdfs')
        pdfs = [f for f in os.listdir(pdf_dir) if f.endswith('.pdf')]
        if not pdfs:
            print("Usage: python robust_parser.py <pdf_path>")
            print("OR place PDFs in data/pdfs/ and run without arguments")
            sys.exit(1)
        pdf_path = os.path.join(pdf_dir, pdfs[0])
    else:
        pdf_path = sys.argv[1]
    
    # Initialize database
    conn = init_db()
    
    # Parse PDF
    student_data, subjects_data = parse_pdf(pdf_path)
    
    if student_data:
        # Save to database
        result_id = save_to_db(conn, student_data, subjects_data)
        
        # Verify
        verify_data(conn, result_id)
    else:
        print("Failed to parse PDF")
    
    conn.close()

if __name__ == "__main__":
    main()