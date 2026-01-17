import requests
import pdfplumber
import io
import re
import logging
from collections import Counter

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ResultScraper:
    def __init__(self, base_url="https://dhakacollege.eshiksabd.com"):
        self.base_url = base_url

    def get_pdf_url(self, roll, exam_code):
        # Placeholder logic for URL construction
        # You presumably need to fetch a specific 'print' URL
        # For now, returning a constructed URL
        return f"{self.base_url}/Print-Transcript?stClassRoll={roll}&xxCode={exam_code}"

    def download_pdf(self, pdf_url):
        try:
            response = requests.get(pdf_url, stream=True)
            response.raise_for_status()
            return io.BytesIO(response.content)
        except Exception as e:
            logger.error(f"Failed to download PDF from {pdf_url}: {e}")
            return None

    def verify_roll_in_pdf(self, pdf_file, roll):
        try:
            with pdfplumber.open(pdf_file) as pdf:
                full_text = ""
                for page in pdf.pages:
                    full_text += page.extract_text() or ""
            
            # Strict verification: Check if the exact roll number is in the text
            if str(roll) not in full_text:
                logger.error(f"Roll {roll} NOT found in PDF text. Aborting.")
                return False
            return True
        except Exception as e:
            logger.error(f"Error reading PDF: {e}")
            return False

    def normalize_subjects(self, extracted_subjects):
        """
        Fixes duplicate subjects (e.g., 'Biology', 'Biology' -> 'Biology 1st Paper', 'Biology 2nd Paper')
        """
        if not extracted_subjects:
            return []

        # Count occurrences of each subject name
        subject_names = [s['name'] for s in extracted_subjects]
        counts = Counter(subject_names)
        
        # Track current count for renaming
        current_counts = Counter()
        
        normalized = []
        for subj in extracted_subjects:
            name = subj['name']
            total_count = counts[name]
            
            if total_count > 1:
                current_counts[name] += 1
                # Rename based on occurrence
                if current_counts[name] == 1:
                    subj['name'] = f"{name} 1st Paper"
                elif current_counts[name] == 2:
                    subj['name'] = f"{name} 2nd Paper"
                # If more than 2, strictly speaking we might need 3rd Paper, but usually it's just 2.
            
            normalized.append(subj)
            
        return normalized

    def scrape_result(self, roll, exam_code):
        pdf_url = self.get_pdf_url(roll, exam_code)
        logger.info(f"Processing Roll: {roll}, URL: {pdf_url}")
        
        pdf_stream = self.download_pdf(pdf_url)
        if not pdf_stream:
            return None

        # Verify Roll
        if not self.verify_roll_in_pdf(pdf_stream, roll):
            return None

        # Extract Marks (Placeholder logic - needs calibration with actual PDF table structure)
        # This part requires specific knowledge of the PDF layout.
        # I will write generic table extraction logic.
        try:
            extracted_data = {
                'pdf_url': pdf_url, 
                'student_marks': [],
                'gpa': 0.0,
                'total_marks': 0.0,
                'grade': 'F'
            }
            
            with pdfplumber.open(pdf_stream) as pdf:
                for page in pdf.pages:
                    tables = page.extract_tables()
                    for table in tables:
                        for row in table:
                            # Heuristic: Check if row looks like a mark row
                            # e.g., ["Bangla", "5.0", "A+", "80"]
                            # This is highly dependent on the specific PDF format.
                            if len(row) >= 4:
                                # Clean and validate
                                # Assume column 0 is Subject, etc.
                                subject_name = row[0].strip() if row[0] else None
                                if subject_name:
                                    extracted_data['student_marks'].append({
                                        'name': subject_name,
                                        'mark': row[-1], # placeholder
                                        'grade': row[-2] # placeholder
                                    })
            
            # Apply Normalization
            extracted_data['student_marks'] = self.normalize_subjects(extracted_data['student_marks'])
            
            return extracted_data

        except Exception as e:
            logger.error(f"Error parsing PDF content: {e}")
            return None

# Placeholder DB Insert
def insert_result_to_db(result_data, student_id):
    """
    Inserts result data into 'results' and 'student_marks'.
    Saves 'original_pdf_url' to 'results'.
    """
    if not result_data:
        return

    logger.info(f"Saving Result for Student ID: {student_id}")
    logger.info(f"PDF URL: {result_data['pdf_url']}")
    # DB logic here... 
    # results table: original_pdf_url = result_data['pdf_url']

if __name__ == "__main__":
    # Example
    pass
