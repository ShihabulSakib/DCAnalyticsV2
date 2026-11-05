# 📊 DC Analytics V2

<div align="center">

![React](https://img.shields.io/badge/React-19.2.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-7.2.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-Deployment-000000?style=for-the-badge&logo=vercel&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)

<p align="center">
  <strong>Comprehensive Academic Performance & Examination Analytics Platform for Dhaka College</strong>
</p>

<p align="center">
  A full-stack, cloud-native application engineered to extract, process, analyze, and visualize student examination transcripts, merit rankings, and comparative academic metrics with real-time insights.
</p>

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Configuration](#environment-configuration)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Data Ingestion Pipeline](#-data-ingestion-pipeline)
- [API Reference](#-api-reference)
- [Deployment](#-deployment)
- [License](#-license)

---

## 🌟 Overview

**DC Analytics V2** is an end-to-end analytics platform designed for students and administrators of Dhaka College. Built on modern web technologies, it bridges the gap between raw institutional grading records and actionable academic insights.

The platform automatically ingests and validates exam marksheets from the institutional portal (`eshiksabd`), structures student profiles, computes GPA distributions and merit standings, and presents them in an intuitive, responsive, and animated user interface.

---

## 🚀 Key Features

- **📑 Instant Transcript & Marksheet Lookup**: Search examination records by roll number, student name, academic section, or exam session.
- **📊 Interactive Academic Visualizations**: Visual grade distributions, subject-wise scores, and section analytics powered by Chart.js and Framer Motion.
- **⚖️ Student Comparison Tool**: Compare two or more students side-by-side across subjects, total marks, and GPA trajectories.
- **🏆 Dynamic Merit Lists & Rankings**: Compute and rank top performers across departments and class sections.
- **🔒 Role-Based Authentication**: Secure JWT-based authentication supporting role differentiation (Students vs. Administrative Staff) with bcrypt password hashing.
- **🖼️ Automated Photo Synchronization**: Automated scraping and Cloudinary CDN synchronization for student identification pictures with serverless fallback proxying.
- **⚡ High-Performance Architecture**: Code-split React frontend with virtualized lists (`react-window`) and serverless Python API routes optimized for Vercel.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    Client["React 19 Frontend (Vite + Tailwind)"] -->|HTTPS / REST API| VercelEdge["Vercel Serverless Gateway"]
    VercelEdge -->|/api/*| FastAPIRoute["FastAPI Serverless Application (api/index.py)"]
    VercelEdge -->|Static Assets| CDN["Vercel Edge Network"]

    FastAPIRoute -->|Query / Pool| PostgresDB[("PostgreSQL Database")]
    FastAPIRoute -->|Image Proxy Fallback| CollegePortal["Institutional Portal (eshiksabd)"]
    
    subgraph DataPipeline["Ingestion & Scraper Engine"]
        Scraper["Python Scraper (scrape_images.py / marksheet extractor)"]
        Scraper -->|Extract Records| PostgresDB
        Scraper -->|Upload Media| Cloudinary["Cloudinary Media CDN"]
    end
```

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: [React 19](https://react.dev/) + [Vite 7](https://vitejs.dev/)
- **Routing**: [React Router DOM v7](https://reactrouter.com/)
- **Styling**: [Tailwind CSS 3.4](https://tailwindcss.com/) with PostCSS & Autoprefixer
- **Charts & Data Visualization**: [Chart.js](https://www.chartjs.org/) & [react-chartjs-2](https://react-chartjs-2.js.org/)
- **Icons & Animations**: [Lucide React](https://lucide.dev/) & [Framer Motion](https://www.framer.com/motion/)
- **Virtualization**: [react-window](https://github.com/bvaughn/react-window) for fluid large-dataset rendering
- **Telemetrics**: `@vercel/analytics` & `@vercel/speed-insights`

### Backend & API
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python ASGI)
- **Database Connector**: `psycopg2` with `RealDictCursor`
- **Security & Tokens**: PyJWT, Passlib (Bcrypt hashing), OAuth2 Bearer Tokens
- **Image Pipeline**: Cloudinary Python SDK & Requests Session Manager

---

## 📂 Project Structure

```
DCAnalyticsV2/
├── api/
│   ├── index.py                 # FastAPI application & serverless endpoint handlers
│   └── schema_migration.sql     # Database schema, tables, and indexing definitions
├── scraper/
│   ├── scrape_images.py         # Automated student photo extraction pipeline
│   ├── upload_local_images.py   # Bulk media sync utility for Cloudinary
│   └── database.py              # Scraper-specific DB utilities
├── src/
│   ├── assets/                  # Static media, icons, and branding
│   ├── components/              # Modular UI components (Dashboard, Modals, Charts)
│   │   ├── admin/               # Administrative panel controls
│   │   ├── AnalyticsCharts.jsx  # Chart.js visual wrappers
│   │   ├── CompareView.jsx      # Multi-student comparison view
│   │   ├── MeritList.jsx        # Merit list & ranking tables
│   │   ├── ResultsView.jsx      # Core student result search & transcript cards
│   │   └── TranscriptTable.jsx  # Detailed marks breakdown component
│   ├── context/                 # Application authentication and state providers
│   ├── hooks/                   # Custom reusable React hooks
│   ├── services/                # Axios API client and data fetching abstractions
│   ├── App.jsx                  # Main router and lazy route configurations
│   ├── index.css                # Global styles and Tailwind directives
│   └── main.jsx                 # Application entrypoint
├── index.html                   # HTML5 template
├── package.json                 # Node dependencies and project scripts
├── requirements.txt             # Python dependencies for API and scraper
├── vercel.json                  # Vercel serverless routing and build configuration
└── vite.config.js               # Vite build and plugin configurations
```

---

## ⚙️ Getting Started

### Prerequisites

- **Node.js**: `v18.0.0` or higher
- **npm** or **pnpm**
- **Python**: `3.10` or higher
- **PostgreSQL Database** instance (local, Supabase, Neon, or Railway)

### Environment Configuration

Create a `.env` file in the root directory:

```env
# Database Credentials
DATABASE_URL=postgresql://user:password@hostname:5432/dbname

# JWT Authentication
SECRET_KEY=your_secure_random_jwt_secret_key
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Cloudinary Storage (Optional for photo CDN)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

### Backend Setup

1. Create and activate a Python virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate   # On Windows: .venv\Scripts\activate
   ```

2. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run database migrations:
   ```bash
   psql $DATABASE_URL -f api/schema_migration.sql
   ```

4. Start the FastAPI development server:
   ```bash
   uvicorn api.index:app --reload --port 8000
   ```

### Frontend Setup

1. Install Node dependencies:
   ```bash
   npm install
   ```

2. Start the Vite development server:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:5173`.

---

## 🔄 Data Ingestion Pipeline

To populate or refresh student records from the institutional portal:

```bash
# Extract and sync student images to Cloudinary
python scraper/scrape_images.py

# Or sync locally stored image batches
python scraper/upload_local_images.py
```

---

## 📡 API Reference

| Method | Endpoint | Description | Auth Required |
|:-------|:---------|:------------|:-------------:|
| `GET` | `/api/results` | Query student results by roll, exam, or group | No |
| `GET` | `/api/student/{roll}` | Fetch complete profile and transcript for a student | No |
| `GET` | `/api/analytics/summary` | Aggregate GPA, pass rate, and score distributions | No |
| `GET` | `/api/image/{roll}` | Proxy student profile photo with fallback handler | No |
| `POST` | `/api/auth/login` | Student / general login endpoint | No |
| `POST` | `/api/admin/login` | Administrative credentials verification & JWT grant | No |
| `GET` | `/api/admin/students` | Manage student records and batch operations | Yes (Admin) |
| `POST` | `/api/admin/sync` | Trigger manual examination data ingestion | Yes (Admin) |

---

## 🚀 Deployment

The project is pre-configured for seamless deployment on [Vercel](https://vercel.com):

1. Push your repository to GitHub.
2. Import the project into your Vercel Dashboard.
3. Configure the environment variables (`DATABASE_URL`, `SECRET_KEY`, `CLOUDINARY_*`) in Vercel Project Settings.
4. Deploy! Vercel will automatically build the React Vite frontend and serve the FastAPI application as serverless functions.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
