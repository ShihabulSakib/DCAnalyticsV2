# Automated Scraper Pipeline Workflow

This document outlines the workflow algorithm implemented in `scraper/auto_runner.py`. The pipeline is designed to be fully automated and non-interactive, processing student results, profiles, images, and exporting data to JSON.

## Pipeline Overview

The pipeline consists of 4 main phases:
1. **Result Scraping**: Fetches academic results for a specified roll range and exam list.
2. **Profile Scraping**: Retrieves detailed student profile information.
3. **Image Scraping**: Downloads student images (Currently disabled by default).
4. **Data Export**: Compiles database information into optimized JSON files.

---

## Phase 1: Result Scraping

**Goal:** Fetch results for all exams available in a specific session and faculty.

1.  **Initialization**:
    -   Initialize database connection (`init_db`).
    -   Login to the Result Portal.
2.  **Configuration**:
    -   Auto-select the latest **Session**.
    -   Auto-select the first available **Faculty** (default: 'HSC').
    -   Define a target **Roll Range** (e.g., `1202425010471` to `1202425010900`).
3.  **Exam Selection**:
    -   Fetch list of exams for the selected Faculty and Session.
4.  **Scraping Loop**:
    -   For each **Exam**:
        -   Create/Identify Exam ID in the database.
        -   Iterate through each **Roll Number** in the range:
            -   Request student data for the specific Roll and Exam.
            -   **Success Logic**: If data is found, add to batch and reset `consecutive_failures`.
            -   **Stop Condition**: If **15 consecutive failures** occur, assume the end of the roll list for this exam and stop.
            -   **Batching**: Save results to the database in chunks of **50**.
            -   **Throttling**: Pause for **0.5s** between requests.

## Phase 2: Profile Scraping

**Goal:** Retrieve general student profiles (Name, Father's Name, Mother's Name, etc.).

1.  **Initialization**:
    -   Login using student credentials (`dcstudent`).
2.  **Configuration**:
    -   Define a wide roll range (e.g., `1` to `5000`).
3.  **Scraping Loop**:
    -   Iterate through **Roll Numbers**:
        -   Request student profile data.
        -   **Success Logic**: If data is found, add to batch and reset `consecutive_failures`.
        -   **Stop Condition**: If **20 consecutive failures** occur, assume the end of profiles and stop.
        -   **Batching**: Save profiles to the database in chunks of **50**.
        -   **Throttling**: Pause for **0.5s** between requests.

## Phase 3: Image Scraping

**Status:** *Disabled/Commented Out*

**Logic (if enabled):**
1.  Initialize `ImageScraper`.
2.  Identify rolls missing images in the database.
3.  Run batch download for identified rolls.

## Phase 4: Data Export to JSON

**Goal:** Export database records to minified JSON files for the frontend analytics engine.

1.  **Initialization**:
    -   Initialize `JsonExporter`.
2.  **Selection**:
    -   Fetch all exams stored in the database.
3.  **Export Execution**:
    -   For each **Exam**:
        -   `export_merit_list(exam_id)`: Generates merit ranking.
        -   `export_marksheet(exam_id)`: Generates individual marksheets.
        -   `export_analytics(exam_id)`: Generates statistical data (averages, pass rates, etc.).
4.  **Finalization**:
    -   Close exporter and database connection.

---

> [!TIP]
> **Fault Tolerance:** The pipeline uses consecutive failure counts (15 for results, 20 for profiles) to dynamically determine the end of a roll list, making it resilient to varying batch sizes without needing manual range adjustments.
