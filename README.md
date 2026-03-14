# DCAnalyticsV2

[![Build Status](https://github.com/your-username/DCAnalyticsV2/actions/workflows/scraper.yml/badge.svg)](https://github.com/your-username/DCAnalyticsV2/actions/workflows/scraper.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Project Version](https://img.shields.io/badge/Version-0.0.0-blue.svg)](package.json)

DCAnalyticsV2 is a comprehensive web application designed to extract, process, and visualize student academic results from an online portal. It provides detailed analytics, merit lists, and individual mark sheets, serving as an authoritative source for academic performance insights. This project aims to centralize and present complex student data in an accessible and user-friendly format for students, faculty, and administrators.

## Table of Contents

*   [Key Features](#key-features)
*   [Technology Stack](#technology-stack)
*   [Screenshots/Demos](#screenshotsdemos)
*   [Prerequisites](#prerequisites)
*   [Installation](#installation)
*   [Usage](#usage)
    *   [Frontend Application](#frontend-application)
    *   [Backend API](#backend-api)
    *   [Scraper Commands](#scraper-commands)
    *   [Automated Scraping with GitHub Actions](#automated-scraping-with-github-actions)
*   [Project Status](#project-status)
*   [Contributing](#contributing)
*   [License](#license)
*   [Contact/Credits](#contactcredits)

## Key Features

*   **Interactive Result Scraping:** Authenticates and extracts student result PDFs from an academic portal.
*   **Robust PDF Parsing:** Utilizes `pdfplumber` for accurate extraction of subject marks, GPA, and grades, with automatic subject normalization.
*   **Profile Enrichment:** Scrapes HTML profiles for student metadata, including groups, sessions, and photo URLs.
*   **Image Management:** Downloads student photos and uploads them to Cloudinary for optimized delivery.
*   **Local Processing:** Supports processing of locally stored PDFs and images for offline batch operations.
*   **Data Export:** Generates optimized static JSON files (Merit Lists, Marksheets, Analytics) for consumption by the frontend application.
*   **PostgreSQL Integration:** Stores all scraped and processed data in a structured relational database with robust duplicate handling and batch transaction support.
*   **Automated Data Pipeline:** Scheduled scraping and data processing via GitHub Actions, ensuring up-to-date information.
*   **Dynamic Frontend:** A React-based web interface for visualizing and navigating student analytics.
*   **RESTful API:** A Python FastAPI backend serving processed data to the frontend.

## Technology Stack

*   **Frontend:**
    *   [React](https://react.dev/)
    *   [Vite](https://vitejs.dev/)
    *   [Tailwind CSS](https://tailwindcss.com/)
    *   [ESLint](https://eslint.org/)
*   **Backend & Scraper:**
    *   [Python 3.8+](https://www.python.org/)
    *   [FastAPI](https://fastapi.tiangolo.com/)
    *   [Uvicorn](https://www.uvicorn.org/)
    *   [Requests](https://requests.readthedocs.io/en/latest/)
    *   [BeautifulSoup4](https://www.crummy.com/software/BeautifulSoup/bs4/doc/)
    *   [PDFPlumber](https://github.com/jsvine/pdfplumber)
    *   [psycopg2](https://www.psycopg.org/docs/)
    *   [python-dotenv](https://pypi.org/project/python-dotenv/)
*   **Database:**
    *   [PostgreSQL](https://www.postgresql.org/)
*   **Cloud Services:**
    *   [Cloudinary](https://cloudinary.com/) (for image hosting)
    *   [Vercel](https://vercel.com/) (for frontend deployment)
*   **Automation:**
    *   [GitHub Actions](https://docs.github.com/en/actions) (for scheduled scraping)

## Screenshots/Demos

_Please add screenshots or GIFs demonstrating the application's key features here._

![Dashboard View](public/dc-logo-themed.png)
_Example: Placeholder for the main dashboard view._

## Prerequisites

Ensure you have the following installed on your system:

*   **Node.js**: Recommended version 18.x or later.
*   **npm** (Node Package Manager) or **Yarn**: For managing frontend dependencies.
*   **Python 3.8+**: For backend and scraping scripts.
*   **pip**: Python package installer.
*   **PostgreSQL**: A running instance, either local or cloud-hosted.
*   **`pdftotext`** (Poppler-utils): A system dependency required for PDF text extraction.
    *   **Linux (Debian/Ubuntu):**
        ```bash
        sudo apt-get update
        sudo apt-get install -y poppler-utils
        ```
    *   **macOS:**
        ```bash
        brew install poppler
        ```
*   **Environment Variables:** A `.env` file in the project root with the following:
    ```env
    DATABASE_URL=postgresql://user:password@host:port/dbname
    CLOUDINARY_CLOUD_NAME=your_cloud_name
    CLOUDINARY_API_KEY=your_api_key
    CLOUDINARY_API_SECRET=your_api_secret
    ```
    For GitHub Actions, these must be configured as [repository secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets).

## Installation

Follow these steps to set up the project locally:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/DCAnalyticsV2.git
    cd DCAnalyticsV2
    ```

2.  **Set up Python virtual environment and dependencies:**
    ```bash
    python3 -m venv venv
    source venv/bin/activate # On Windows: venv\Scripts\activate
    pip install -r requirements.txt
    ```

3.  **Install frontend dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

4.  **Initialize the Database:**
    Ensure your `DATABASE_URL` is configured in your `.env` file, then run:
    ```bash
    python scraper/database.py
    ```
    This script contains the `init_db()` function which creates necessary tables.

## Usage

### Frontend Application

To run the React development server:
```bash
npm run dev
# or
yarn dev
```
Open your browser to `http://localhost:5173` (or the port specified by Vite).

To build the production-ready frontend:
```bash
npm run build
# or
yarn build
```
The compiled assets will be in the `dist/` directory.

### Backend API

To start the FastAPI backend:
```bash
source venv/bin/activate
uvicorn api.index:app --host 0.0.0.0 --port 8000
```
The API will be available at `http://localhost:8000`. API documentation can be accessed at `http://localhost:8000/docs` (Swagger UI) or `http://localhost:8000/redoc`.

### Scraper Commands

Ensure your Python virtual environment is activated (`source venv/bin/activate`).

*   **Interactive Result Scraping:** (Prompts for Exam Level, Faculty, Session, Roll Range)
    ```bash
    python scraper/main.py results
    ```
*   **Scrape Student Profiles:** (Prompts for Roll Range)
    ```bash
    python scraper/main.py profiles
    ```
*   **Scrape & Upload Images:** (Prompts for Roll Range)
    ```bash
    python scraper/main.py images
    ```
*   **Process Local PDFs:** (Parses PDFs in `data/pdfs`)
    ```bash
    python scraper/main.py local-pdfs
    ```
*   **Upload Local Images:** (Uploads images in `data/images` to Cloudinary)
    ```bash
    python scraper/main.py local-images
    ```
*   **Export Data for Frontend:** (Generates JSON files in `public/data/`)
    ```bash
    python scraper/main.py export
    ```

### Automated Scraping with GitHub Actions

The `auto_runner.py` script executes the full scraping, profile, image (if uncommented), and export pipeline non-interactively. This is what the GitHub Actions workflow runs.

To run the full automated pipeline locally (ensure `.env` is configured):
```bash
source venv/bin/activate
python scraper/auto_runner.py
```

The GitHub Actions workflow is configured to run daily at midnight UTC. You can view its status and history in your repository's "Actions" tab.

## Project Status

This project is currently in **Active Development**. Features are being added and refined.

## Contributing

Contributions are welcome! If you'd like to contribute, please fork the repository and submit a pull request.
We currently lack an automated test suite. Adding comprehensive test coverage (unit, integration, and end-to-end tests) would be a valuable contribution.

## License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## Contact/Credits

*   **Maintainer:** _[Your Name/Organization Here]_
*   **Acknowledgments:** _[Any special thanks or credits]_
