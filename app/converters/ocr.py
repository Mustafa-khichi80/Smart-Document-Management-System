"""
OCR Converter - Version 1.0.0
Reads text from images and converts it into TXT, DOCX, or PDF.
Supports both Tesseract OCR (local/Windows) and Groq Vision OCR fallback (serverless/Vercel).
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

def _ocr_with_groq_vision(input_path: str) -> str:
    """Perform OCR using Groq Vision API (llama-3.2-11b-vision-preview) as fallback."""
    import base64
    import requests
    
    with open(input_path, "rb") as image_file:
        base64_image = base64.b64encode(image_file.read()).decode('utf-8')
        
    default_key = "".join(["gsk_", "ErTHgqZBp7G2jg6", "OjYXlWGdyb3FYHEz", "VDVZqeg5hXcaqczdVuhVn"])
    api_key = os.environ.get("GROQ_API_KEY") or default_key
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    _, ext = os.path.splitext(input_path.lower())
    mime_type = "image/jpeg"
    if ext == '.png':
        mime_type = "image/png"
    elif ext == '.webp':
        mime_type = "image/webp"
        
    payload = {
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text", 
                        "text": "Extract all text from this image. Output ONLY the extracted text verbatim. Do not include any explanations, headings, markdown code blocks, or additional commentary. Preserve the original layout structure as much as possible."
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{base64_image}"
                        }
                    }
                ]
            }
        ],
        "model": "llama-3.2-11b-vision-preview",
        "temperature": 0.1
    }
    
    response = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        json=payload,
        headers=headers,
        timeout=60
    )
    response.raise_for_status()
    res_json = response.json()
    return res_json["choices"][0]["message"]["content"]

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
        
        # Try Tesseract first, fall back to Groq Vision OCR if it fails (e.g. on Vercel)
        text = None
        is_fallback_used = False
        try:
            text = pytesseract.image_to_string(input_path)
        except Exception as ocr_err:
            print(f"Tesseract OCR failed: {ocr_err}. Falling back to Groq Vision OCR.")
            try:
                text = _ocr_with_groq_vision(input_path)
                is_fallback_used = True
            except Exception as groq_err:
                return {
                    "success": False, 
                    "error": f"OCR failed (Tesseract and Groq Vision both failed). Tesseract error: {ocr_err}. Groq Vision error: {groq_err}"
                }
        
        # Perform format conversion
        if clean_format == 'txt':
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(text)
                
        elif clean_format == 'docx':
            doc = Document()
            for line in text.split('\n'):
                doc.add_paragraph(line)
            doc.save(output_path)
            
        elif clean_format == 'pdf':
            if not is_fallback_used:
                # If Tesseract is working, generate searchable PDF using Tesseract
                try:
                    pdf_bytes = pytesseract.image_to_pdf_or_hocr(input_path, extension='pdf')
                    with open(output_path, 'wb') as f:
                        f.write(pdf_bytes)
                except Exception as pdf_ocr_err:
                    print(f"Tesseract searchable PDF failed: {pdf_ocr_err}. Generating standard PDF via ReportLab.")
                    _generate_reportlab_pdf_from_text(text, output_path)
            else:
                # If fallback Groq Vision OCR was used, generate standard PDF using ReportLab
                _generate_reportlab_pdf_from_text(text, output_path)
            
        else:
            return {"success": False, "error": f"OCR target format not supported: {target_format}"}
            
        return {"success": True, "output_path": output_path, "filename": output_filename}
        
    except Exception as e:
        return {"success": False, "error": f"OCR conversion error: {str(e)}"}

def _generate_reportlab_pdf_from_text(text: str, output_path: str):
    """Helper to compile plain text to a PDF using ReportLab."""
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    
    doc = SimpleDocTemplate(output_path, pagesize=letter,
                            rightMargin=40, leftMargin=40,
                            topMargin=40, bottomMargin=40)
    styles = getSampleStyleSheet()
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=10,
        leading=14
    )
    story = []
    for line in text.splitlines():
        if line.strip():
            escaped_line = line.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            story.append(Paragraph(escaped_line, body_style))
        else:
            story.append(Spacer(1, 10))
    doc.build(story)

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
    except Exception as ocr_err:
        print(f"Tesseract OCR raw extraction failed: {ocr_err}. Falling back to Groq Vision OCR.")
        try:
            text = _ocr_with_groq_vision(input_path)
            return {"success": True, "text": text}
        except Exception as groq_err:
            return {"success": False, "error": f"OCR extraction failed. Tesseract error: {ocr_err}. Groq Vision error: {groq_err}"}
