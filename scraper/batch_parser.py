import os
import re
import sys
from robust_parser import parse_pdf
from database import get_or_create_student_id, get_or_create_exam_id, save_result_and_marks, init_db

# The directory where you have stored the result PDFs.
PDF_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'pdfs')

def process_local_pdfs():
    """
    Scans the data/pdfs directory, parses each PDF, and saves the data to the database.
    This avoids re-downloading files you already have.
    """
    if not os.path.isdir(PDF_DIR):
        print(f"Error: The directory '{PDF_DIR}' was not found.", file=sys.stderr)
        print("Please make sure you have your result PDFs stored there.", file=sys.stderr)
        return

    pdf_files = [f for f in os.listdir(PDF_DIR) if f.endswith('.pdf')]
    if not pdf_files:
        print(f"No PDF files found in '{PDF_DIR}'.", file=sys.stderr)
        return

    print(f"Found {len(pdf_files)} PDF files to process.")
    
    total_success = 0
    for filename in pdf_files:
        filepath = os.path.join(PDF_DIR, filename)
        
        # Extracts roll and exam_id from filenames like "219001_280.pdf"
        match = re.match(r'(\d+)_(\d+)\.pdf', filename)
        if not match:
            print(f"\n[SKIP] '{filename}': Could not extract roll/exam ID from filename.", file=sys.stderr)
            continue
            
        roll, exam_id_str = match.groups()
        print(f"\n--- Processing {filename} (Roll: {roll}, Exam: {exam_id_str}) ---")

        try:
            student_data, subjects_data = parse_pdf(filepath)

            if not student_data or not student_data.get('roll'):
                print("  - [FAIL] Parsing Failed: Could not extract required data from the PDF.", file=sys.stderr)
                continue

            # For offline processing, the exam name is not known, so we use a placeholder.
            # The name can be updated later if needed.
            exam_name = f"Exam {exam_id_str}"

            student_id_db = get_or_create_student_id(
                student_data['roll'],
                student_data.get('name'),
                student_data.get('student_group'),
                student_data.get('session')
            )
            exam_id_db = get_or_create_exam_id(exam_id_str, exam_name)
            
            result_data = {
                'gpa': student_data.get('gpa'),
                'total_marks': student_data.get('total_marks'),
                'status': student_data.get('status'),
                'subjects': subjects_data
            }

            save_result_and_marks(student_id_db, exam_id_db, result_data)
            total_success += 1
            print(f"  - [SUCCESS] Processed and saved data for roll {roll}.")

        except Exception as e:
            print(f"  - [ERROR] An unexpected error occurred: {e}", file=sys.stderr)

    print(f"\nBatch processing complete. Successfully processed {total_success}/{len(pdf_files)} files.")


if __name__ == "__main__":
    print("Starting batch processing of local PDF files...")
    print("This will parse existing PDFs and upload the DATA to your Neon database.")
    
    # Ensure the database schema is ready
    init_db()
    
    process_local_pdfs()