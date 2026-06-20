import pytesseract
from PIL import Image

# 1. Tell pytesseract exactly where the Windows installation lives
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

try:
    # 2. Check the installed version to confirm it's working
    version = pytesseract.get_tesseract_version()
    print(f"Success! Tesseract OCR is connected. Version: {version}")
except Exception as e:
    print(f"Connection failed. Error: {e}")