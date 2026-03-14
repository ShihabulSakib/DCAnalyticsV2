
import time
import sys
import os
from profile_scraper import ProfileScraper, LoginSession
from database import init_db, save_batch_profiles

# --- Configuration ---
# The range of student rolls to check for profiles
# This can be a wide range; the scraper will handle non-existent rolls.
START_ROLL = 1
END_ROLL = 8000
# Number of consecutive failures before stopping the scrape
CONSECUTIVE_FAILURE_THRESHOLD = 30
# The number of profiles to save to the DB in a single transaction
BATCH_SIZE = 100

def run_automated_profile_pipeline():
    """
    A fully automated, non-interactive pipeline to scrape student profiles.
    - Iterates through a wide, predefined roll range.
    - Saves profile data (name, group, session, image_url) to the database.
    """
    print("--- Starting Automated Profile Scraping Pipeline ---")
    
    # Always initialize the database first
    init_db()

    try:
        session_handler = LoginSession('dcstudent', 'dcstudent')
        if not session_handler.login():
            print("Fatal: Could not log in to scrape profiles. Aborting.")
            return
        
        print(f"Logged in. Starting profile scrape for rolls {START_ROLL} to {END_ROLL}.")
        
        profile_scraper = ProfileScraper(session_handler)
        
        batch = []
        success_count = 0
        consecutive_failures = 0

        for r in range(START_ROLL, END_ROLL + 1):
            roll_str = str(r)
            print(f"Scraping profile {roll_str}...", end=' ', flush=True)
            
            data = profile_scraper.scrape_student(roll_str)
            
            if data:
                print("OK")
                # The data from scrape_student includes 'group_name', which is what we want.
                # It also cleans the group name directly in the profile_scraper.
                batch.append(data)
                consecutive_failures = 0
            else:
                print("Failed")
                consecutive_failures += 1

            # Check if we should stop early
            if consecutive_failures >= CONSECUTIVE_FAILURE_THRESHOLD:
                print(f"
[Info] Reached {CONSECUTIVE_FAILURE_THRESHOLD} consecutive failures. Assuming end of student rolls and stopping.")
                break

            # Save batch to database
            if len(batch) >= BATCH_SIZE or (r == END_ROLL and batch):
                print(f"
--- Saving Batch of {len(batch)} profiles... ---")
                if save_batch_profiles(batch):
                    success_count += len(batch)
                batch = [] # Reset batch
            
            time.sleep(0.3) # Be respectful to the server

        print(f"
Finished profile scraping. Saved/updated {success_count} profiles.")

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"An unexpected error occurred during profile scraping: {e}")

    print("
--- Automated Profile Scraping Pipeline Finished ---")

if __name__ == "__main__":
    run_automated_profile_pipeline()
