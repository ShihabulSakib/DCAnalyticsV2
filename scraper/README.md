# Scraper Module Documentation

This directory contains a suite of tools for scraping student results, profile data, and images from the Dhaka College result portal.

## 📋 Prerequisites

Before running any script, ensure your environment is set up:

1.  **Install Dependencies**:
    ```bash
    pip install requests beautifulsoup4 pdfplumber psycopg2-binary python-dotenv cloudinary
    ```
2.  **Environment Variables**:
    Create a `.env` file in the project root with the following:
    ```ini
    DATABASE_URL=postgresql://user:pass@host/db
    CLOUDINARY_CLOUD_NAME=your_cloud_name
    CLOUDINARY_API_KEY=your_api_key
    CLOUDINARY_API_SECRET=your_api_secret
    ```

---

## 🛠 Script Usage & Use Cases

### 1. Result Scraper (`main.py`)
**Primary tool for fetching exam results.** It logins, fetches available sessions and groups, allows interactive selection, downloads PDFs, parses them, and saves everything to the database.

**New Feature:** Now fully dynamic! Instead of hardcoded session/faculty values, the scraper:
1. Fetches all available sessions (shows latest 3)
2. Fetches all available groups (Science, Humanities, Business Studies)
3. Fetches exams based on your selections
4. Downloads and parses results

*   **Use Case A: Interactive Mode**
    Run without arguments for the full interactive experience.
    ```bash
    python3 scraper/main.py
    ```
    
    You will be prompted to:
    - Select a Group (e.g., HSC - Science)
    - Select a Session (e.g., 2024-2025)
    - Select an Exam (e.g., Class Test 1)
    - Enter Roll Range (e.g., 1202425010001 to 1202425010100)

### 2. Image Scraper (`scrape_images.py`)
**Fetches student profile photos** and uploads them to Cloudinary.

*   **Use Case A: Single Student**
    Fetch and upload a photo for one student.
    ```bash
    python3 scraper/scrape_images.py 1202425010471
    ```

*   **Use Case B: Batch Processing**
    Fetch photos for a range of roll numbers (e.g., entire class).
    ```bash
    python3 scraper/scrape_images.py 1202425010001 1202425010150
    ```

### 3. Profile Data Scraper (`profile_scraper.py`)
**Extracts student metadata** (Name, Session, Group, Subject List) without the exam result. Saves data to a JSON file.

*   **Use Case A: Debugging/Verification**
    Check if the scraper can correctly parse a student's profile page.
    ```bash
    python3 scraper/profile_scraper.py
    ```
    *(Note: Modify the `target_roll` variable in the script to change the student)*

### 4. PDF Batch Parser (`batch_parser.py`)
**Processes local PDFs.** Useful if you have already downloaded PDFs (e.g., via `main.py`) but need to re-parse them (e.g., after fixing a parsing bug).

*   **Use Case A: Re-parsing downloaded files**
    Parses all `.pdf` files in `data/pdfs/` and updates the database.
    ```bash
    python3 scraper/batch_parser.py
    ```

### 5. Local Image Uploader (`upload_local_images.py`)
**Uploads local images** to Cloudinary. Useful if you scraped images manually or have them stored locally.

*   **Use Case A: Batch Upload**
    Uploads all valid images from `data/images/` to Cloudinary and updates student records.
    ```bash
    python3 scraper/upload_local_images.py
    ```

### 6. Robust PDF Parser (`robust_parser.py`)
**Standalone PDF Parsing Engine.** Can be used to debug parsing logic on a single file.

*   **Use Case A: Test Parsing on One File**
    See exactly what data is extracted from a specific PDF.
    ```bash
    python3 scraper/robust_parser.py path/to/result.pdf
    ```

---

## 📂 Directory Structure

*   `main.py`: **Entry point** for result scraping.
*   `database.py`: **Database layer**. Handles all SQL operations.
*   `robust_parser.py`: **Logic core**. Handles PDF text extraction and regex pattern matching.
*   `check_login.py`: **Utility**. Simple script to verify credentials.
*   `result_scraper.py`: *Legacy*. Old template code (do not use).
*   `profile_scraper.py`: *Legacy/template*. Used for testing specific profile extractions.

## ⚠️ Common Issues

*   **Login Failed**: Check your internet connection or update the credentials in `main.py` / `scrape_images.py`.
*   **PDF Parsing Error**: If a specific PDF fails, run it with `robust_parser.py` to debug the output.
