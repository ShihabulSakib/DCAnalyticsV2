#!/usr/bin/env python3
"""
Batch Parser - Process all PDFs in the data/pdfs directory.
"""

import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(__file__))

from robust_parser import init_db, parse_pdf, save_to_db

def main():
    pdf_dir = os.path.join(os.path.dirname(__file__), '..', 'data', 'pdfs')
    
    if not os.path.exists(pdf_dir):
        print(f"PDF directory not found: {pdf_dir}")
        sys.exit(1)
    
    pdfs = [f for f in os.listdir(pdf_dir) if f.endswith('.pdf')]
    print(f"Found {len(pdfs)} PDFs to process")
    
    conn = init_db()
    
    success = 0
    failed = 0
    
    for i, pdf_name in enumerate(pdfs, 1):
        pdf_path = os.path.join(pdf_dir, pdf_name)
        
        # Extract exam_id from filename (format: roll_examid.pdf)
        # e.g., 1202425010002_280.pdf -> exam_id = 280
        exam_id = 'Unknown'
        stem = os.path.splitext(pdf_name)[0]
        if '_' in stem:
            parts = stem.split('_')
            if len(parts) >= 2:
                exam_id = parts[1]
        
        try:
            student_data, subjects_data = parse_pdf(pdf_path)
            if student_data and student_data['roll']:
                save_to_db(conn, student_data, subjects_data, exam_id)
                success += 1
            else:
                failed += 1
        except Exception as e:
            print(f"Error processing {pdf_name}: {e}")
            failed += 1
        
        # Progress indicator
        if i % 20 == 0:
            print(f"Progress: {i}/{len(pdfs)} ({success} success, {failed} failed)")
    
    print(f"\nComplete! Processed {success} PDFs successfully, {failed} failed.")
    
    # Summary query
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as cnt FROM students")
    print(f"Total students in database: {cursor.fetchone()['cnt']}")
    
    cursor.execute("SELECT COUNT(*) as cnt FROM subjects")
    print(f"Total unique subjects: {cursor.fetchone()['cnt']}")
    
    cursor.execute("SELECT COUNT(*) as cnt FROM student_marks")
    print(f"Total student-subject records: {cursor.fetchone()['cnt']}")
    
    conn.close()

if __name__ == "__main__":
    main()
