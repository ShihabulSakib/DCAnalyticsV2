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

## 📂 Project Structure

*   `scraper/main.py`: Central CLI entry point.
*   `scraper/database.py`: Database connection and schema management.
*   `scraper/robust_parser.py`: Advanced logic for extracting data from PDFs.
*   `scraper/json_exporter.py`: Logic for generating frontend-ready JSONs.
*   `scraper/profile_scraper.py`: Logic for HTML profile scraping.
*   `scraper/scrape_images.py`: Logic for image fetching and uploading.

## 🤝 Contributing

1.  Make sure to run `python3 scraper/main.py results` on a small range to verify changes.
2.  If modifying the parser, check `scraper/robust_parser.py`.
3.  Keep database migrations compatible with `init_db()` in `scraper/database.py`.