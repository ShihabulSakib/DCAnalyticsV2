
import os
import sys
import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv

# Import the database function we need
from database import update_student_image_url, init_db

# --- Configuration ---
# Load environment variables from .env file
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Configure Cloudinary
cloudinary.config(
  cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME"),
  api_key = os.getenv("CLOUDINARY_API_KEY"),
  api_secret = os.getenv("CLOUDINARY_API_SECRET"),
  secure = True
)

# The directory where your local images are stored
IMAGES_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'images')

def upload_local_images():
    """
    Scans the data/images directory, uploads each image to Cloudinary,
    and updates the database with the new URL.
    """
    if not os.path.isdir(IMAGES_DIR):
        print(f"Error: The directory '{IMAGES_DIR}' was not found.", file=sys.stderr)
        print("Please make sure you have your student images stored there.", file=sys.stderr)
        return

    # Look for common image file extensions
    image_files = [f for f in os.listdir(IMAGES_DIR) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp'))]
    if not image_files:
        print(f"No image files found in '{IMAGES_DIR}'.", file=sys.stderr)
        return

    print(f"Found {len(image_files)} image files to process.")
    
    total_success = 0
    for filename in image_files:
        filepath = os.path.join(IMAGES_DIR, filename)
        
        # Extract roll number from filename (e.g., "219001.jpg")
        roll = os.path.splitext(filename)[0]
        
        # Validate that the filename is a number (a roll number)
        if not roll.isdigit():
            print(f"\n[SKIP] '{filename}': Filename is not a valid roll number.", file=sys.stderr)
            continue
            
        print(f"\n--- Processing {filename} (Roll: {roll}) ---")

        try:
            print(f"  - Uploading to Cloudinary...")
            upload_result = cloudinary.uploader.upload(
                filepath,
                public_id=roll,
                folder="student_images",
                overwrite=True
            )
            
            secure_url = upload_result.get('secure_url')
            if not secure_url:
                print("  - [FAIL] Upload to Cloudinary failed: No secure_url in response.", file=sys.stderr)
                continue

            print(f"  - Upload successful. Updating database...")
            update_student_image_url(roll, secure_url)
            total_success += 1
            
        except Exception as e:
            print(f"  - [ERROR] An unexpected error occurred: {e}", file=sys.stderr)

    print(f"\nBatch upload complete. Successfully processed {total_success}/{len(image_files)} files.")


if __name__ == "__main__":
    print("Starting batch upload of local images to Cloudinary...")
    
    # Ensure the database schema is ready
    init_db()
    
    upload_local_images()
