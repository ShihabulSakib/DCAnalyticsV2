import os
import re
import sys
import json
from robust_parser import parse_pdf
from database import save_batch_results, init_db

# The directory where you have stored the result PDFs.
PDF_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'pdfs')

def process_local_pdfs():
    """
    Scans the data/pdfs directory, parses each PDF, and saves the data to the database using batch processing.
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
    
    # User Request: Ask for Exam Details ONCE
    custom_exam_name = input("\nEnter the Exam Name for this batch (e.g., 'HSC 2024 Test'): ").strip()
    custom_exam_id = input("Enter the Exam ID (e.g., '280'): ").strip()

    if not custom_exam_name or not custom_exam_id:
        print("Both Exam Name and Exam ID are required! Exiting.", file=sys.stderr)
        return

    # Determine chunk size
    total_files = len(pdf_files)
    CHUNK_SIZE = 50 if total_files > 100 else total_files
    print(f"Batching enabled. Chunk size: {CHUNK_SIZE}")

    batch_data = []
    total_success = 0
    
    for idx, filename in enumerate(pdf_files):
        filepath = os.path.join(PDF_DIR, filename)
        
        print(f"Processing {filename}...", end=' ', flush=True)

        try:
            student_data, subjects_data = parse_pdf(filepath)

            if not student_data or not student_data.get('roll'):
                print("[FAIL] Parsing Failed.")
                continue

            # Prepare data object
            data = {
                'roll': student_data['roll'],
                'name': student_data.get('name'),
                'student_group': student_data.get('student_group'),
                'session': student_data.get('session'),
                'exam_id_text': custom_exam_id,
                'exam_name': custom_exam_name,
                'gpa': student_data.get('gpa'),
                'total_marks': student_data.get('total_marks'),
                'status': student_data.get('status'),
                'subjects': subjects_data
            }
            
            batch_data.append(data)
            print("[OK] Queued.")

            # Check if we should save batch
            if len(batch_data) >= CHUNK_SIZE or (idx == total_files - 1 and len(batch_data) > 0):
                print(f"\n--- Saving Batch of {len(batch_data)} records ---")
                
                # 1. JSON Backup
                backup_file = f"local_batch_backup_{idx}.json"
                try:
                    with open(backup_file, 'w', encoding='utf-8') as f:
                        json.dump(batch_data, f, ensure_ascii=False, indent=2)
                except Exception as e:
                    print(f"Warning: Failed to create backup JSON: {e}")

                # 2. Database Insert
                if save_batch_results(batch_data):
                    total_success += len(batch_data)
                    batch_data = []
                    
                    # 3. Delete Backup
                    if os.path.exists(backup_file):
                        os.remove(backup_file)
                else:
                    print("CRITICAL ERROR: Failed to save batch. Data preserved in backup file.")
                    batch_data = []

        except Exception as e:
            print(f"  - [ERROR] An unexpected error occurred: {e}", file=sys.stderr)

    print(f"\nBatch processing complete. Successfully processed and saved {total_success}/{total_files} files.")


if __name__ == "__main__":
    print("Starting batch processing of local PDF files...")
    
    init_db()
    
    process_local_pdfs()