import os
import json
import gzip
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
from collections import defaultdict

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

DATABASE_URL = os.getenv("DATABASE_URL")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'data')

def get_db_connection():
    return psycopg2.connect(DATABASE_URL)

class JsonExporter:
    def __init__(self):
        self.conn = get_db_connection()
        os.makedirs(OUTPUT_DIR, exist_ok=True)

    def fetch_exam_details(self, exam_id_text):
        """Fetch basic exam metadata using the text ID."""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            # We must use exam_id_text column to find the exam
            cur.execute("SELECT id, name, exam_id_text FROM exams WHERE exam_id_text = %s", (str(exam_id_text),))
            return cur.fetchone()

    def fetch_subjects_by_group(self, exam_int_id):
        """
        Fetch subjects organized by student group.
        Returns: {group_name: [subject_names], ...}
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Get all subjects for this exam with their student groups
            # Uses internal exam_id (int) for joining results
            cur.execute("""
                SELECT DISTINCT s.id as subject_id, s.name as subject_name, st.student_group
                FROM subjects s
                JOIN student_marks sm ON s.id = sm.subject_id
                JOIN results r ON sm.result_id = r.id
                JOIN students st ON r.student_id = st.id
                WHERE r.exam_id = %s AND st.student_group IS NOT NULL
                ORDER BY st.student_group, s.id
            """, (exam_int_id,))
            
            rows = cur.fetchall()
            
            # Organize by group
            groups = defaultdict(set)  # Use set to avoid duplicates
            for row in rows:
                groups[row['student_group']].add(row['subject_name'])
            
            # Convert sets to sorted lists for consistent ordering
            return {group: sorted(list(subjects)) for group, subjects in groups.items()}


    def export_merit_list(self, exam_id_text):
        """Generates the merit list JSON (v2.0 with group info)."""
        print(f"Exporting Merit List for Exam ID: {exam_id_text}...")
        
        # 1. Resolve text ID to internal ID
        exam = self.fetch_exam_details(exam_id_text)
        if not exam:
            print(f"Exam {exam_id_text} not found.")
            return

        exam_int_id = exam['id']

        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Optimized query using internal exam_id
            cur.execute("""
                SELECT 
                    s.roll,
                    s.name, 
                    s.student_group,
                    s.session,
                    r.gpa, 
                    r.total_marks, 
                    r.status,
                    r.transcript_url
                FROM results r
                JOIN students s ON r.student_id = s.id
                WHERE r.exam_id = %s
                ORDER BY r.gpa DESC NULLS LAST, r.total_marks DESC NULLS LAST
            """, (exam_int_id,))
            
            rows = cur.fetchall()

        # Transform to minimized format (v2.0)
        students_json = []
        for i, row in enumerate(rows):
            students_json.append({
                "pos": i + 1,                          # Position
                "id": row['roll'],                     # ID (Roll)
                "n": row['name'],                      # Name
                "g": row['student_group'] or "Unknown", # Group
                "s": row['session'] or "",             # Session
                "gpa": row['gpa'],                     # GPA
                "tot": row['total_marks'],             # Total
                "st": row['status'],                   # Status (Passed/Failed)
                "tl": row['transcript_url']            # Transcript Link
            })

        output_data = {
            "v": "2.0",
            "exam": {
                "id": exam['exam_id_text'],
                "name": exam['name']
            },
            "students": students_json
        }

        # Save using exam_id_text in filename
        filename = f"merit_list_{exam_id_text}.json"
        path = os.path.join(OUTPUT_DIR, filename)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, separators=(',', ':'), ensure_ascii=False)
        
        # Save Gzipped JSON
        with gzip.open(path + '.gz', 'wt', encoding='utf-8') as f:
            json.dump(output_data, f, separators=(',', ':'), ensure_ascii=False)

        file_size = os.path.getsize(path)
        gz_size = os.path.getsize(path + '.gz')
        compression_ratio = (1 - gz_size/file_size) * 100 if file_size > 0 else 0
        
        print(f"✅ Merit list saved: {filename}")
        print(f"   📊 {len(students_json)} students | {file_size} bytes | {gz_size} bytes gzipped ({compression_ratio:.1f}% compression)")
        return path

    def export_marksheet(self, exam_id_text):
        """Generates the detailed marksheet JSON (v2.0 with group-aware subjects)."""
        print(f"Exporting Marksheet for Exam ID: {exam_id_text}...")
        
        exam = self.fetch_exam_details(exam_id_text)
        if not exam:
            print(f"Exam {exam_id_text} not found.")
            return
        
        exam_int_id = exam['id']
        
        # Get subjects organized by group using INT ID
        groups_subjects = self.fetch_subjects_by_group(exam_int_id)
        
        if not groups_subjects:
            print(f"⚠️  No subject/group data found for exam {exam_id_text}")
            return

        # Fetch all marks for this exam using INT ID
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    s.roll,
                    st.student_group,
                    subj.name as subject_name,
                    s.roll,
                    st.student_group,
                    subj.name as subject_name,
                    sm.total,
                    sm.grade,
                    sm.gp
                FROM student_marks sm
                JOIN results r ON sm.result_id = r.id
                JOIN students s ON r.student_id = s.id
                JOIN subjects subj ON sm.subject_id = subj.id
                LEFT JOIN students st ON r.student_id = st.id
                WHERE r.exam_id = %s
                ORDER BY s.roll, subj.id
            """, (exam_int_id,))
            
            rows = cur.fetchall()

        # Build marks data structure
        marks_by_student = {}
        
        for row in rows:
            roll = row['roll']
            group = row['student_group'] or "Unknown"
            subject_name = row['subject_name']

            
            mark = row['total']
            grade = row['grade']
            gp = row['gp']
            
            if roll not in marks_by_student:
                marks_by_student[roll] = {
                    "g": group,  # Store group
                    "m": {},     # Marks dict
                    "gr": {},    # Grades dict
                    "gp": {}     # GP dict
                }
            
            # Store data by subject name
            marks_by_student[roll]["m"][subject_name] = mark
            marks_by_student[roll]["gr"][subject_name] = grade
            marks_by_student[roll]["gp"][subject_name] = gp

        # Convert marks dict to arrays based on group's subject order
        for roll, student_data in marks_by_student.items():
            group = student_data["g"]
            subject_order = groups_subjects.get(group, [])
            
            # Build arrays in the correct order for this group
            marks_array = []
            grades_array = []
            gps_array = []
            
            for subject in subject_order:
                marks_array.append(student_data["m"].get(subject, 0))
                grades_array.append(student_data["gr"].get(subject, "-"))
                gps_array.append(student_data["gp"].get(subject, 0.0))
            
            # Replace dicts with arrays
            student_data["m"] = marks_array
            student_data["gr"] = grades_array
            student_data["gp"] = gps_array

        output_data = {
            "v": "2.1",  # Version 2.1 - with grades and gpa
            "exam": {
                "id": exam['exam_id_text'],
                "name": exam['name']
            },
            "groups": groups_subjects,  # Map of group -> [subjects]
            "marks": marks_by_student   # Map of roll -> {g: group, m: [], gr: [], gp: []}
        }

        # Save using exam_id_text in filename
        filename = f"marks_{exam_id_text}.json"
        path = os.path.join(OUTPUT_DIR, filename)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, separators=(',', ':'), ensure_ascii=False)

        # Save Gzipped JSON
        with gzip.open(path + '.gz', 'wt', encoding='utf-8') as f:
            json.dump(output_data, f, separators=(',', ':'), ensure_ascii=False)

        file_size = os.path.getsize(path)
        gz_size = os.path.getsize(path + '.gz')
        compression_ratio = (1 - gz_size/file_size) * 100 if file_size > 0 else 0
        
        print(f"✅ Marksheet saved: {filename}")
        print(f"   📊 {len(marks_by_student)} students | {len(groups_subjects)} groups | {file_size} bytes | {gz_size} bytes gzipped ({compression_ratio:.1f}% compression)")
        print(f"   📚 Groups: {', '.join(groups_subjects.keys())}")
        return path

    def close(self):
        self.conn.close()

if __name__ == "__main__":
    exporter = JsonExporter()
    
    # 1. List latest exams to export
    with exporter.conn.cursor() as cur:
        # We fetch exam_id_text to drive the process
        cur.execute("SELECT exam_id_text, name FROM exams ORDER BY id DESC")
        exams = cur.fetchall()

    if not exams:
        print("No exams found in database.")
    else:
        print(f"Found {len(exams)} exams to export:\n")
        for exam_id_text, name in exams:
            print(f"📝 Processing: {name} (ID: {exam_id_text})")
            exporter.export_merit_list(exam_id_text)
            exporter.export_marksheet(exam_id_text)
            print()
    
    exporter.close()
    print("✨ Export complete!")
