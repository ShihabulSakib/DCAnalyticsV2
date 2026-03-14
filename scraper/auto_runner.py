
import time
import sys
import os
import re
from main import ResultScraper
from json_exporter import JsonExporter
from database import init_db, get_scraped_exam_ids, get_roll_range_for_group, save_batch_results, get_or_create_exam_id

# --- Configuration ---
# The number of most recent sessions to check for new exams
SESSIONS_TO_CHECK = 2 
# Default roll range if the database has no prior data for a group
DEFAULT_START_ROLL = 1
DEFAULT_END_ROLL = 8000
# Number of consecutive failures before stopping the scrape for an exam
CONSECUTIVE_FAILURE_THRESHOLD = 20

def run_automated_results_pipeline():
    """
    A fully automated, non-interactive pipeline to scrape new results and export data.
    - Iterates through the latest sessions and all their faculties.
    - Dynamically finds new exams by comparing with the database.
    - Determines roll range automatically with a fallback.
    - Scrapes new exams and exports all data to JSON.
    """
    print("--- Starting Automated Results Pipeline ---")
    
    # Always initialize the database first
    init_db()
    
    # --- 1. Scrape New Results ---
    print(f"\n[Phase 1/2] Checking for and scraping new results...")
    
    try:
        scraper = ResultScraper()
        if not scraper.login():
            print("Fatal: Failed to login to the portal. Aborting.")
            return

        # Get the list of exams we already have in our database
        scraped_exam_ids = get_scraped_exam_ids()
        print(f"[DB] Found {len(scraped_exam_ids)} exams already in the database.")

        # Get the latest sessions from the website
        sessions = scraper.get_session_list()
        if not sessions:
            print("Fatal: No sessions found on the website. Aborting.")
            return

        # Loop through the most recent sessions
        for session in sessions[:SESSIONS_TO_CHECK]:
            print(f"\n{'='*70}")
            print(f"Processing Session: {session['name']}")
            print(f"{'='*70}")
            
            # Get all faculties/groups for the session
            # We assume 'HSC' for now as the logic in main.py does. This can be parameterized if needed.
            faculties = scraper.get_faculty_list('HSC')
            if not faculties:
                print(f"Warning: No faculties found for session {session['name']}. Skipping.")
                continue

            for faculty in faculties:
                # Clean the faculty name from the website to match what's in our DB
                clean_faculty_name = re.sub(r'HSC\s*[-\u2013]\s*', '', faculty['name']).strip()
                print(f"\n--- Faculty: {clean_faculty_name} ---")

                # Find new exams for this specific session and faculty
                web_exams = scraper.get_exam_list(faculty['id'], session['id'])
                if not web_exams:
                    print("No exams found on website for this faculty. Skipping.")
                    continue
                
                new_exams = [exam for exam in web_exams if exam['id'] not in scraped_exam_ids]

                if not new_exams:
                    print("No new exams to scrape for this faculty. Skipping.")
                    continue
                
                print(f"Found {len(new_exams)} new exam(s): {[e['name'] for e in new_exams]}")

                # Determine the roll range for this group
                start_roll, end_roll = get_roll_range_for_group(session['name'], clean_faculty_name)
                if not start_roll:
                    start_roll, end_roll = DEFAULT_START_ROLL, DEFAULT_END_ROLL
                    print(f"No prior data in DB. Using default roll range: {start_roll}-{end_roll}")
                else:
                    # Add a buffer to the end roll to catch new students
                    end_roll += 500 
                    print(f"Roll range from DB: {start_roll}-{end_roll} (buffer added)")
                
                # Scrape each new exam
                for exam in sorted(new_exams, key=lambda e: e['id']):
                    print(f"\nScraping Exam: {exam['name']} (ID: {exam['id']})")
                    get_or_create_exam_id(exam['id'], exam['name'])

                    batch_data = []
                    success_count = 0
                    consecutive_failures = 0

                    for r in range(start_roll, end_roll + 1):
                        print(f"[{exam['name']}] Processing Roll {r}...", end=' ', flush=True)
                        success, msg, data = scraper.scrape_student(str(r), exam['id'], exam['name'])
                        
                        if success and data:
                            # Data from parser is already clean.
                            print("OK")
                            batch_data.append(data)
                            consecutive_failures = 0
                        else:
                            print(f"Failed ({msg})")
                            consecutive_failures += 1

                        if consecutive_failures >= CONSECUTIVE_FAILURE_THRESHOLD:
                            print(f"\n[Info] Reached {CONSECUTIVE_FAILURE_THRESHOLD} consecutive failures. Assuming end of results for this exam.")
                            break

                        if len(batch_data) >= 50 or (r == end_roll and batch_data):
                            print(f"\n--- Saving Batch of {len(batch_data)} ---")
                            if save_batch_results(batch_data):
                                success_count += len(batch_data)
                            batch_data = []
                        
                        time.sleep(0.4)
                    
                    print(f"\nFinished scraping {exam['name']}. Saved {success_count} new results.")

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"An unexpected error occurred during result scraping: {e}")

    # --- 2. Export All Data to JSON ---
    print("\n[Phase 2/2] Exporting all data to JSON...")
    try:
        exporter = JsonExporter()
        exporter.export_all() # A new method to export everything
        exporter.close()
        print("JSON export complete.")
    except Exception as e:
        print(f"An error occurred during JSON export: {e}")

    print("\n--- Automated Results Pipeline Finished ---")

if __name__ == "__main__":
    run_automated_results_pipeline()

