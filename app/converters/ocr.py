"""
OCR Converter - Version 1.0.0
Reads text from images and converts it into TXT, DOCX, or PDF.
"""
import os
import sys
import pytesseract
from PIL import Image
import docx
from docx import Document

# Explicit Windows Tesseract installation path
if sys.platform.startswith("win"):
    pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

async def convert_ocr(input_path: str, output_dir: str, target_format: str) -> dict:
    """OCR converter that reads text from images and converts to desirable format (TXT, DOCX, PDF)."""
    import asyncio
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _process_ocr, input_path, output_dir, target_format)

def _process_ocr(input_path: str, output_dir: str, target_format: str) -> dict:
    try:
        filename = os.path.basename(input_path)
        name, ext = os.path.splitext(filename)
        
        # Clean target format (remove _ocr if present)
        clean_format = target_format.lower()
        if clean_format.endswith('_ocr'):
            clean_format = clean_format[:-4]
            
        output_filename = f"{name}.{clean_format}"
        output_path = os.path.join(output_dir, output_filename)
        
        # Perform OCR
        if clean_format == 'txt':
            text = pytesseract.image_to_string(input_path)
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(text)
                
        elif clean_format == 'docx':
            text = pytesseract.image_to_string(input_path)
            doc = Document()
            # Split lines and add paragraphs
            for line in text.split('\n'):
                doc.add_paragraph(line)
            doc.save(output_path)
            
        elif clean_format == 'pdf':
            # Generate searchable PDF using Tesseract
            pdf_bytes = pytesseract.image_to_pdf_or_hocr(input_path, extension='pdf')
            with open(output_path, 'wb') as f:
                f.write(pdf_bytes)
            
        else:
            return {"success": False, "error": f"OCR target format not supported: {target_format}"}
            
        return {"success": True, "output_path": output_path, "filename": output_filename}
        
    except Exception as e:
        return {"success": False, "error": f"OCR conversion error: {str(e)}"}

async def extract_ocr_text(input_path: str) -> dict:
    """OCR extractor that reads text from images and returns it directly as a string."""
    import asyncio
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _extract_ocr_raw, input_path)

def _extract_ocr_raw(input_path: str) -> dict:
    try:
        import pytesseract
        import sys
        if sys.platform.startswith("win"):
            pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
        text = pytesseract.image_to_string(input_path)
        return {"success": True, "text": text}
    except Exception as e:
        return {"success": False, "error": str(e)}

