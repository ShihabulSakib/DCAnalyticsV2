#!/usr/bin/env python3
"""
Robust PDF Parser for Student Results
Uses pdfplumber for layout-aware parsing.
This module is now decoupled from the database.
"""

import pdfplumber
import re
import logging

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

# --- GPA Extraction Helper ---

def extract_gpa_after_ict(text):
    """
    Extract GPA from text by finding the second number after 'ict'.
    Strategy: Look for 'ict', then capture the second decimal number following it.
    This is for layouts where the final GPA is listed after the ICT subject's GPA.
    """
    logger.info("Strategy: Extracting GPA from 'ICT' pattern")
    match = re.search(r'ict.*?(\d+\.\d+).*?(\d+\.\d+)', text, re.IGNORECASE | re.DOTALL)
    
    if match:
        try:
            gpa_str = match.group(2)
            gpa = float(gpa_str)
            if 0.0 <= gpa <= 5.0:
                logger.info(f"Found GPA candidate via ICT pattern: {gpa}")
                return gpa
            else:
                logger.warning(f"Discarding out-of-range GPA from ICT pattern: {gpa}")
        except (ValueError, IndexError):
            logger.warning("Could not parse number from ICT pattern match.")
            pass
    return None

def extract_gpa_from_table(main_table, header_idx):
    """
    Extract GPA using table structure analysis.
    Strategy 1: Look for columns with 'GPA' in the header and extract the max valid value.
    Strategy 2: Find rows with 'GPA' label and extract the rightmost valid number.
    """
    logger.info("Strategy: Extracting GPA from table structure")
    if header_idx is None:
        return None
    
    headers = [str(h).strip().lower() if h else '' for h in main_table[header_idx]]
    gpa_candidates = []

    # Strategy 1: Check specific GPA columns
    gpa_col_indices = [i for i, h in enumerate(headers) if 'gpa' in h]
    if gpa_col_indices:
        logger.info(f"Found GPA columns at indices: {gpa_col_indices}")
        for row in main_table[header_idx + 1:]:
            if not row: continue
            for col_idx in gpa_col_indices:
                if col_idx < len(row):
                    val_str = str(row[col_idx]).strip()
                    try:
                        val = float(val_str)
                        if 0.0 <= val <= 5.0:
                            gpa_candidates.append({'value': val, 'priority': 2, 'context': f"Column {col_idx}"})
                    except ValueError:
                        pass
    
    # Strategy 2: Check rows labeled GPA (existing logic)
    for row_idx, row in enumerate(main_table[header_idx + 1:], start=header_idx + 1):
        if not row:
            continue
        
        row_text = ' '.join([str(cell) if cell else '' for cell in row]).strip()
        
        if re.search(r'\bGPA\b', row_text, re.IGNORECASE):
            logger.info(f"Found GPA row at index {row_idx}: {row_text}")
            decimals = re.findall(r'\b(\d+\.\d+)\b', row_text)
            
            for dec in decimals:
                try:
                    val = float(dec)
                    if 0.0 <= val <= 5.0:
                        gpa_candidates.append({'value': val, 'priority': 1, 'context': row_text[:50]})
                        logger.info(f"  Found GPA candidate: {val}")
                except ValueError:
                    continue
    
    if gpa_candidates:
        # Sort by priority (high to low) then value (high to low)
        # We assume higher value in GPA column is likely the final result (e.g. vs without additional subj)
        gpa_candidates.sort(key=lambda x: (x['priority'], x['value']), reverse=True)
        final_gpa = gpa_candidates[0]
        logger.info(f"Selected GPA: {final_gpa['value']} from: {final_gpa['context']}")
        return final_gpa['value']
    
    return None

def extract_gpa_from_text(text):
    """
    Extract GPA from text using pattern matching.
    Strategy: Look for explicit GPA labels or isolated decimal numbers in result section.
    """
    logger.info("Strategy: Extracting GPA from text patterns")
    gpa_candidates = []
    
    explicit_patterns = [
        r'GPA\s*(?:\(.*?\))?\s*[:\-]?\s*(\d+\.\d+)',
        r'\bGPA\s+(\d+\.\d+)\b',
    ]
    
    for pattern in explicit_patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for match in matches:
            try:
                val = float(match.group(1))
                if 0.0 <= val <= 5.0:
                    context = text[max(0, match.start()-20):match.end()+20]
                    gpa_candidates.append({'value': val, 'priority': 1, 'context': context})
                    logger.info(f"Found explicit GPA: {val} (context: {context.strip()})")
            except (ValueError, IndexError):
                continue
    
    lines = text.split('\n')
    result_section_start = None
    
    for i, line in enumerate(lines):
        if re.search(r'Total.*(?:Without|additional)', line, re.IGNORECASE):
            result_section_start = i
            break
    
    if result_section_start:
        logger.info(f"Analyzing result section starting at line {result_section_start}")
        for line in lines[result_section_start:]:
            decimals = re.findall(r'\b(\d+\.\d+)\b', line)
            for dec in decimals:
                try:
                    val = float(dec)
                    if 0.0 <= val <= 5.0:
                        gpa_candidates.append({'value': val, 'priority': 2, 'context': line.strip()})
                        logger.info(f"Found decimal in result section: {val} (context: {line.strip()})")
                except ValueError:
                    continue
    
    if gpa_candidates:
        gpa_candidates.sort(key=lambda x: (x['priority'], x['value']))
        final_gpa = gpa_candidates[-1]
        logger.info(f"Selected GPA: {final_gpa['value']} from: {final_gpa['context']}")
        return final_gpa['value']
    
    return None

# --- PDF Parsing ---

def parse_pdf(pdf_path):
    """Parse a student result PDF using pdfplumber and return structured data."""
    logger.info(f"Parsing: {pdf_path}")
    
    student_data = {
        'roll': None, 'name': None, 'session': None, 'student_group': None,
        'gpa': None, 'total_marks': None, 'status': None,
    }
    subjects_data = []
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            if not pdf.pages:
                logger.warning("PDF has no pages")
                return None, []
            
            page = pdf.pages[0]
            text = page.extract_text() or ""
            
            # Exam Name Extraction
            lines = text.split('\n')
            for line in lines[:10]:
                if re.search(r"Exam|Test|Examination|Assessment", line, re.IGNORECASE) and len(line.strip()) > 5:
                    # Clean up: Remove 'Dhaka College' if present in the same line
                    clean_line = re.sub(r"Dhaka\s+College", "", line, flags=re.IGNORECASE).strip()
                    # Remove common prefixes like "Result of"
                    clean_line = re.sub(r"^Result\s+of\s*", "", clean_line, flags=re.IGNORECASE).strip()
                    if clean_line:
                        student_data['exam_name'] = clean_line
                        break
            
            roll_match = re.search(r"(?:Class\s+Roll|Roll|\u09b0\u09cb\u09b2)\s*[:\-]?\s*(\d{10,})", text, re.IGNORECASE)
            if roll_match:
                student_data['roll'] = roll_match.group(1).strip()
            
            name_match = re.search(r"Name\s+([A-Z][A-Za-z\.\s]+?)\s+(?:A\+|A\-|A|B|C|D|F|\d)", text)
            if not name_match:
                name_match = re.search(r"Name\s+([A-Z][A-Za-z\.\s]+?)\n", text)
            if name_match:
                name = name_match.group(1).strip()
                if name and len(name) > 3:
                    student_data['name'] = name
            
            session_match = re.search(r"Session\s*[:\-]?\s*([\d\-]+)", text, re.IGNORECASE)
            if session_match:
                student_data['session'] = session_match.group(1).strip()
            
            group_match = re.search(r"(?:Group|\(2nd Year)\s*[:\-]?\s*(HSC\s*[-\u2013]\s*\w+)", text, re.IGNORECASE)
            if group_match:
                student_data['student_group'] = group_match.group(1).strip()
            
            if re.search(r"Result\s*:\s*Passed", text, re.IGNORECASE):
                student_data['status'] = 'Passed'
            elif re.search(r"Result\s*:\s*Failed", text, re.IGNORECASE):
                student_data['status'] = 'Failed'
                student_data['gpa'] = 0.00
            elif re.search(r"\bPassed\b", text, re.IGNORECASE):
                student_data['status'] = 'Passed'
            elif re.search(r"\bFailed\b", text, re.IGNORECASE):
                student_data['status'] = 'Failed'
                student_data['gpa'] = 0.00
            
            tables = page.extract_tables()
            header_idx = None
            
            if tables:
                main_table = max(tables, key=lambda t: len(t))
                
                for i, row in enumerate(main_table):
                    row_text = ' '.join([str(c) for c in row if c])
                    if re.search(r"subject|বিষয়|grade|গ্রেড", row_text, re.IGNORECASE):
                        header_idx = i
                        break
                
                if header_idx is not None:
                    headers = [str(h).strip().lower() if h else '' for h in main_table[header_idx]]
                    
                    def find_col(keywords):
                        for i, h in enumerate(headers):
                            for kw in keywords:
                                if kw in h:
                                    return i
                        return None
                    
                    subj_col = find_col(['subject', 'বিষয়'])
                    grade_col = find_col(['grade', 'গ্রেড'])
                    gp_col = find_col(['gp', 'point', 'পয়েন্ট'])
                    total_col = find_col(['total', 'মোট'])
                    cq_col = find_col(['cq', 'রচনামূলক'])
                    mcq_col = find_col(['mcq', 'নৈর্ব্যক্তিক'])
                    prac_col = find_col(['practical', 'ব্যবহারিক'])
                    
                    for row in main_table[header_idx + 1:]:
                        if not row or len(row) <= (subj_col or 0):
                            continue
                        
                        subject_name = str(row[subj_col]).strip() if subj_col is not None and row[subj_col] else None
                        
                        skip_patterns = [
                            r'^total', r'^additional subject', r'^মোট', r'^subject', r'^বিষয়', r'^,', r'^\d+', r'^gpa',
                        ]
                        if not subject_name or any(re.match(p, subject_name.lower()) for p in skip_patterns):
                            continue
                        
                        existing_idx = next((i for i, s in enumerate(subjects_data) if s['name'].lower() == subject_name.lower()), None)
                        
                        if existing_idx is not None:
                            prev_name = subjects_data[existing_idx]['name']
                            if "1st paper" not in prev_name.lower():
                                subjects_data[existing_idx]['name'] = f"{prev_name} 1st Paper"
                            subject_name = f"{subject_name} 2nd Paper"
                        
                        def safe_float(val):
                            if val is None: return None
                            try: return float(str(val).strip())
                            except ValueError: return None
                        
                        subjects_data.append({
                            'name': subject_name,
                            'cq': safe_float(row[cq_col]) if cq_col and cq_col < len(row) else None,
                            'mcq': safe_float(row[mcq_col]) if mcq_col and mcq_col < len(row) else None,
                            'practical': safe_float(row[prac_col]) if prac_col and prac_col < len(row) else None,
                            'total': safe_float(row[total_col]) if total_col and total_col < len(row) else None,
                            'grade': str(row[grade_col]).strip() if grade_col and grade_col < len(row) and row[grade_col] else None,
                            'gp': safe_float(row[gp_col]) if gp_col and gp_col < len(row) else None,
                        })
                
                # Priority 1: Table structure (most reliable if GPA column exists)
                if student_data['gpa'] is None: student_data['gpa'] = extract_gpa_from_table(main_table, header_idx)
                # Priority 2: Text pattern after ICT (fallback for specific layout)
                if student_data['gpa'] is None: student_data['gpa'] = extract_gpa_after_ict(text)
                # Priority 3: General text patterns
                if student_data['gpa'] is None: student_data['gpa'] = extract_gpa_from_text(text)
                
                logger.info(f"Final GPA extracted: {student_data['gpa']}")
            
            if student_data['status'] == 'Failed' and student_data['gpa'] is None:
                student_data['gpa'] = 0.00
            
            if student_data['total_marks'] is None:
                total = sum(s['total'] for s in subjects_data if s['total'])
                student_data['total_marks'] = total if total > 0 else None
    
    except Exception as e:
        logger.error(f"Error parsing PDF: {e}")
        return None, []
    
    if not student_data['roll']:
        logger.warning("Roll number not found, skipping")
        return None, []
    
    # Return a dictionary of student data and a list of subject data dictionaries
    return student_data, subjects_data
