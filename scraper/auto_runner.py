
import time
import sys
import os
from main import ResultScraper, get_or_create_exam_id, init_db, save_batch_results

def run_automated_results():
    # Initialize Database
    init_db()
    
    scraper = ResultScraper()
    if not scraper.login():
        print("Failed to login to the portal.")
        return

    # 1. Automatically select first Exam Level
    levels = scraper.get_exam_levels()
    if not levels:
        print("No exam levels found.")
        return
    selected_level = levels[0]
    print(f"[Auto] Selected Exam Level: {selected_level['name']}")

    # 2. Ask for Faculty (Once)
    facs = scraper.get_faculty_list(selected_level['id'])
    if not facs:
        print("No faculties found.")
        return
    print("\nAvailable Groups:")
    for i, f in enumerate(facs):
        print(f"{i + 1}. {f['name']}")
    try:
        f_idx = int(input("\nSelect Group: ")) - 1
        selected_faculty = facs[f_idx]
    except (ValueError, IndexError):
        print("Invalid selection.")
        return

    # 3. Ask for Session (Once)
    sessions = scraper.get_session_list()
    if not sessions:
        print("No sessions found.")
        return
    print("\nAvailable Sessions (Latest 3):")
    latest = sessions[:3]
    for i, s in enumerate(latest):
        print(f"{i + 1}. {s['name']}")
    try:
        s_idx = int(input("\nSelect Session: ")) - 1
        selected_session = latest[s_idx]
    except (ValueError, IndexError):
        print("Invalid selection.")
        return

        # 4. Ask for Roll Range (Once)
    try:
        start_roll = int(input("\nEnter Start Roll: ").strip())
        end_roll = int(input("Enter End Roll: ").strip())
    except ValueError:
        print("Invalid roll numbers.")
        return

    # 5. Fetch all Exams for this Faculty + Session
    exams = scraper.get_exam_list(selected_faculty['id'], selected_session['id'])
    if not exams:
        print(f"No exams found for {selected_faculty['name']} in {selected_session['name']}.")
        return

    print(f"\nFound {len(exams)} exams. Starting automated sequence...")
    print(f"Target Roll Range: {start_roll} to {end_roll}")

    # 6. Loop through all exams
    for exam in exams:
        print(f"\n{'='*60}")
        print(f"EXAM: {exam['name']} (ID: {exam['id']})")
        print(f"{'='*60}")

        # Ensure exam exists in our DB
        get_or_create_exam_id(exam['id'], exam['name'])

        chunk_size = 50
        batch_data = []
        success_count = 0
        consecutive_failures = 0

        for r in range(start_roll, end_roll + 1):
            print(f"[{exam['name']}] Processing Roll {r}...", end=' ', flush=True)
            success, msg, data = scraper.scrape_student(str(r), exam['id'], exam['name'])
            
            if success and data:
                print("OK")
                batch_data.append(data)
                consecutive_failures = 0
            else:
                print(f"Failed ({msg})")
                consecutive_failures += 1

            # Stop if the exam seems to have no data for this range
            if consecutive_failures >= 15:
                print("\n[Skipping Exam] 15 consecutive failures. Moving to next exam.")
                break

            # Save in batches
            if len(batch_data) >= chunk_size or r == end_roll:
                if batch_data:
                    print(f"--- Saving Batch of {len(batch_data)} ---")
                    if save_batch_results(batch_data):
                        success_count += len(batch_data)
                    batch_data = []
            
            time.sleep(0.4) # Slightly faster sleep for automation

        print(f"\nFinished {exam['name']}: Saved {success_count} results.")

    print("\n" + "#"*40)
    print("ALL EXAMS COMPLETED SUCCESSFULLY")
    print("#"*40)

if __name__ == "__main__":
    run_automated_results()
