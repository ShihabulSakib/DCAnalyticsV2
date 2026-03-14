# DCAnalytics Scraper Toolkit

A comprehensive, modular scraping engine for extracting, processing, and analyzing student result data from the Dhaka College academic portal.

## 🚀 Features

*   **Interactive Result Scraping:** Authenticates, navigates academic sessions, and extracts result PDFs directly from the portal.
*   **Robust PDF Parsing:** Uses `pdfplumber` with layout analysis to accurately extract subject marks, GPA, and grades, even from complex table structures. Includes automatic subject normalization (e.g., merging "Biology" variants).
*   **Profile Enrichment:** Scrapes HTML profiles to gather metadata like Student Groups, Sessions, and Photo URLs.
*   **Image Management:** Downloads student photos and uploads them to Cloudinary for optimized delivery.
*   **Local Processing:** Capable of processing locally stored PDFs and images for offline batch operations.
*   **Data Export:** Generates optimized JSON files (Merit Lists, Marksheets, Analytics) for the frontend application.
*   **PostgreSQL Integration:** Stores all data in a structured relational database with duplicate handling and batch transaction safety.

## 🛠 Prerequisites

Ensure you have the following installed:

*   **Python 3.8+**
*   **PostgreSQL** (or a connection string to a hosted instance like NeonDB)
*   **`pdftotext`** (System dependency for PDF text extraction)
    *   *Linux (Debian/Ubuntu):* `sudo apt-get install poppler-utils`
    *   *macOS:* `brew install poppler`

## 📦 Installation

1.  **Navigate to the project directory:**
    ```bash
    cd DCAnalyticsV2
    ```

2.  **Set up a virtual environment (Recommended):**
    ```bash
    python3 -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```

3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Configure Environment Variables:**
    Ensure your `.env` file in the project root contains the following:
    ```env
    DATABASE_URL=postgresql://user:password@host:port/dbname
    CLOUDINARY_CLOUD_NAME=your_cloud_name
    CLOUDINARY_API_KEY=your_api_key
    CLOUDINARY_API_SECRET=your_api_secret
    ```

## 🖥 Usage

The toolkit is unified under a single CLI entry point: `scraper/main.py`.

### 1. Interactive Result Scraping
Walks you through selecting Exam Level, Faculty, Session, and Exam, then scrapes a range of roll numbers.

```bash
python3 scraper/main.py results
```

### 2. Scrape Student Profiles
Fetches metadata (Group, Session, Photo URL) directly from the student profile HTML pages. Useful for filling in gaps left by PDF parsing.

```bash
python3 scraper/main.py profiles
```

### 3. Scrape & Upload Images
Downloads student profile pictures and uploads them to Cloudinary.

```bash
python3 scraper/main.py images
```

### 4. Process Local PDFs
If you have a directory of downloaded result PDFs (in `data/pdfs`), this command parses them and populates the database.

```bash
python3 scraper/main.py local-pdfs
```

### 5. Upload Local Images
Uploads images stored in `data/images` to Cloudinary and updates the student records in the database.

```bash
python3 scraper/main.py local-images
```

### 6. Export Data for Frontend
Generates the static JSON files required by the React frontend (`merit_list_*.json`, `marks_*.json`, `analytics/exam_*.json`).

```bash
python3 scraper/main.py export
```

## 🔧 Troubleshooting

*   **Login Failed:**
    *   Ensure the `dcstudent` credentials are valid.
    *   Check your internet connection.
*   **"DATABASE_URL not set":**
    *   Verify your `.env` file exists and is properly formatted.
*   **PDF Parsing Errors:**
    *   Ensure `poppler-utils` is installed on your system.
    *   Some older or corrupted PDFs might fail; check the logs for specific roll numbers.
*   **Cloudinary Errors:**
    *   Double-check your API keys in `.env`.
    *   Ensure you haven't exceeded your plan's storage or bandwidth limits.

## 📂 Project Structure & File Map

To help you navigate the codebase, here is a breakdown of what each file does, grouped by its role in the toolkit.

### 🏗️ Core Orchestrators
*   **[main.py](file:///home/shanto/Desktop/Github/DCAnalyticsV2/scraper/main.py):** The primary CLI entry point. It wraps all major functionalities into user-friendly commands. Use this for interactive one-off tasks.
*   **[auto_runner.py](file:///home/shanto/Desktop/Github/DCAnalyticsV2/scraper/auto_runner.py):** A non-interactive, fully automated pipeline. It chains together Result Scraping, Profile Scraping, and Data Export. **Run this for full database updates.**

### 💾 Data Storage & Export
*   **[database.py](file:///home/shanto/Desktop/Github/DCAnalyticsV2/scraper/database.py):** Manages PostgreSQL connections and the database schema. Contains `init_db()` and high-performance batch insertion functions for students, results, and profiles.
*   **[json_exporter.py](file:///home/shanto/Desktop/Github/DCAnalyticsV2/scraper/json_exporter.py):** The bridge to the frontend. It queries the database and generates optimized, GZIP-compressed JSON files (merit lists, marks, analytics) used by the React application.

### 🧠 Parsers (PDF Processing)
*   **[robust_parser.py](file:///home/shanto/Desktop/Github/DCAnalyticsV2/scraper/robust_parser.py):** The "smart" parser. Uses `pdfplumber` for layout-aware extraction. It’s highly resilient to table variations and handles GPA calculation/lookup logic.
*   **[parser.py](file:///home/shanto/Desktop/Github/DCAnalyticsV2/scraper/parser.py):** A lightweight utility using `pdftotext`. Useful for quick text extraction but less layout-aware than `robust_parser.py`.

### 🌐 Web Scrapers
*   **[result_scraper.py](file:///home/shanto/Desktop/Github/DCAnalyticsV2/scraper/result_scraper.py):** Handles the session-based authentication with the Dhaka College portal and downloads student result PDFs.
*   **[profile_scraper.py](file:///home/shanto/Desktop/Github/DCAnalyticsV2/scraper/profile_scraper.py):** Scrapes student profiles (HTML) to get detailed metadata like Mother's Name, Session, and Student Group.
*   **[scrape_images.py](file:///home/shanto/Desktop/Github/DCAnalyticsV2/scraper/scrape_images.py):** Fetches student profile photos and uploads them directly to Cloudinary.

### 🛠️ Local Processing Tools
*   **[batch_parser.py](file:///home/shanto/Desktop/Github/DCAnalyticsV2/scraper/batch_parser.py):** Processes locally stored PDFs in the `data/pdfs` directory and populates the database.
*   **[upload_local_images.py](file:///home/shanto/Desktop/Github/DCAnalyticsV2/scraper/upload_local_images.py):** Scans the `data/images` directory and uploads files to Cloudinary, updating the database with the new URLs.

---

## 👨‍💻 Developer Notes & Workflow

### How to Add a New Exam
1.  Run `python3 scraper/main.py results`. 
2.  Choose the session and faculty.
3.  The scraper will automatically find the exams and start downloading/parsing.
4.  Once done, run `python3 scraper/main.py export` to generate the JSON files for the web app.

### Modifying the Database
If you need to add a new column (e.g., student phone numbers):
1.  Update `init_db()` in `scraper/database.py`.
2.  Update the corresponding save function (e.g., `save_batch_profiles`).
3.  Update the scraper (e.g., `profile_scraper.py`) to extract that data.

### Dealing with "Broken" PDFs
If the portal changes its PDF layout:
*   Open `scraper/robust_parser.py`.
*   Adjust the `extract_gpa_*` functions or the table column matching logic.
*   Test it with `python3 scraper/main.py local-pdfs` on a small batch of downloaded PDFs.

### Deployment Tip
Always ensure your `.env` is set correctly. The `auto_runner.py` is designed to be run as a cron job if you need periodic updates during exam season.

## 🤝 Contributing

1.  Make sure to run `python3 scraper/main.py results` on a small range to verify changes.
2.  If modifying the parser, check `scraper/robust_parser.py`.
3.  Keep database migrations compatible with `init_db()` in `scraper/database.py`.