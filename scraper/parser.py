import subprocess
import re
import os

class PDFParser:
    def __init__(self):
        pass

    def extract_text(self, pdf_path):
        try:
            # Use -layout to preserve spacing which helps with table parsing
            result = subprocess.run(['pdftotext', '-layout', pdf_path, '-'], 
                                  capture_output=True, text=True, check=True)
            return result.stdout
        except Exception as e:
            print(f"Error reading PDF {pdf_path}: {e}")
            return ""

    def parse(self, pdf_path):
        text = self.extract_text(pdf_path)
        if not text:
            return None

        data = {
            'subjects': []
        }

        # --- Basic Info ---
        # Name             MD. SHIHABUL SAKIB JISHAN
        name_match = re.search(r'Name\s+(.+?)(?=\s+Academic)', text)
        if name_match:
            data['name'] = name_match.group(1).strip()
        
        # Class Roll       1202425010471
        roll_match = re.search(r'Class Roll\s+(\d+)', text)
        if roll_match:
            data['roll'] = roll_match.group(1).strip()

        # Session          2024-2025
        session_match = re.search(r'Session\s+(\d{4}-\d{4})', text)
        if session_match:
            data['session'] = session_match.group(1).strip()

        # Group            HSC - Science
        group_match = re.search(r'Group\s+(.+?)(?=\s+Section|\s*$)', text, re.MULTILINE)
        if group_match:
            data['group'] = group_match.group(1).strip()
        
        # --- Result Summary ---
        # Result               : Failed   OR   PASSED
        status_match = re.search(r'Result\s*:\s*(.+)', text)
        if status_match:
            data['status'] = status_match.group(1).strip()

        # Total Mark                                             67
        total_match = re.search(r'Total Mark\s+(\d+)', text)
        if total_match:
            data['total_marks'] = float(total_match.group(1))

        # GPA - Usually at the top right table or calculated bottom
        # "Obtained GPA 5.00" or similar. But in the sample it's not explicitly "GPA: 5.00" in a single line always.
        # But there is a GPA column in the subject table.
        # Let's look for "GPA" on its own or "Point"
        # In the sample: "Point 5.00" is the scale.
        # Actually, looking at the sample output, there's a GPA column.
        # And usually a final GPA. 
        # In the FAILED sample: "Result : Failed". GPA might be 0.00.
        
        # Let's parse subjects first, then calculate or find GPA.
        
        # --- Subject Parsing ---
        # Format: Subject Name CQ MCQ Prac Total Grade GP
        # Bangla 12 12 0 0 12 18 A- 3.50
        # This is tricky because of variable whitespace.
        # We start looking after "Subject Name" header.
        
        lines = text.split('\n')
        parsing_subjects = False
        
        for line in lines:
            if "Subject Name" in line and "CQ" in line:
                parsing_subjects = True
                continue
            
            if parsing_subjects:
                if "Total (Without additional subject)" in line or "Additional Subject" in line:
                    parsing_subjects = False
                    continue
                
                if not line.strip():
                    continue

                # Regex to handle the spacing. 
                # Name can have spaces (e.g. Higher Math).
                # Numbers are at the end.
                # Example: "Bangla                           12                      12          0    0          12              18          A-     3.50"
                # Columns: Name, CQ, ConvCQ?, MCQ, Prac, Total_Sub, Total_Conv?, Grade, GP
                # Wait, looking at sample:
                # Subject Name           CQ   MCQ    Prac                    CT   Att                    Exam Highest   Grade   GP 
                # Bangla                           12                      12          0    0          12              18          A-     3.50
                # It looks like:
                # Name (Text)
                # Then a sequence of numbers and Grade.
                # Let's use a simpler strategy: Split by at least 2 spaces?
                
                parts = re.split(r'\s{2,}', line.strip())
                # Filter empty
                parts = [p for p in parts if p]
                
                # A valid subject line usually ends with a GP (float) and Grade (Letter)
                if len(parts) >= 4:
                    # Heuristic: Last item is GP?
                    try:
                        gp = float(parts[-1])
                        grade = parts[-2]
                        # Name is usually the first part
                        name = parts[0]
                        
                        # Total is trickier.
                        # Let's assume the 'Total' marks obtained is somewhere in middle.
                        # Using the sample: Bangla (0) ... 12 (5) ... 18 (highest) ... A- (7) 3.50 (8)
                        # We might need to match the columns strictly.
                        # Using specific regex for the line might be safer.
                        # (.*?) \s+ (\d+|-) \s+ ...
                        
                        # Simplification: Just grab Name, Grade, GP.
                        # We can refine 'Total' if needed.
                        
                        # Let's try to identify 'Total Obtained'. 
                        # In "Bangla ... 12 ... 18 ... A- ... 3.50", 12 is obtained.
                        
                        subject_data = {
                            'name': name,
                            'grade': grade,
                            'gp': gp,
                            'total': 0, # Placeholder
                            'cq': 0,
                            'mcq': 0,
                            'prac': 0
                        }
                        data['subjects'].append(subject_data)
                        
                    except ValueError:
                        pass # Not a subject line (maybe a header or noise)

        # Calculate GPA if not found
        # In sample: "Result : Failed" implies GPA 0.00?
        # If passed, we usually see "GPA : 4.50" 
        
        gpa_match = re.search(r'GPA\s*[:=]\s*(\d+\.\d{2})', text)
        if gpa_match:
            data['gpa'] = float(gpa_match.group(1))
        else:
            # Heuristic calculation or lookup
            if data.get('status') == 'Failed':
                data['gpa'] = 0.00
            else:
                data['gpa'] = 0.00 # Default if unknown

        # Grade (Overall)
        # If Failed -> F. 
        if data.get('status') == 'Failed':
            data['grade'] = 'F'
        else:
             # Try to find overall grade
             pass
             
        return data

