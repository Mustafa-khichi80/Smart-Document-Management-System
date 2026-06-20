<div align="center">

# Smart Document Management

<img src="screenshot/s1.png" alt="Smart Document Management Dark Mode" width="700"/>

### Secure, Fast, and Modern Document Management & Conversion

[![Version](https://img.shields.io/badge/Version-1.0.0-blue.svg)](https://github.com/YusufEren97/universal-file-converter)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.12+-yellow.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Latest-teal.svg)](https://fastapi.tiangolo.com/)

**Your files never leave your device. 100% local, 100% private.**

[English](#-features) • [Türkçe](#-özellikler-tr)

</div>

---

## Features

<table>
<tr>
<td width="50%">

### Core Features
- **Format Conversions** - Image, PDF, Word, PowerPoint, XML, CSV, XLSX, JSON, HTML, TXT
- **100% Local Processing** - Complete privacy
- **OCR Text Extraction** - Extract text from scanned PDFs and images
- **AI-Driven Editing** - CRUD operations on text via Gemini AI
- **Modern UI** - Apple-inspired design with Light/Dark mode
- **Batch Processing** - Convert multiple files at once
- **Drag & Drop** - Simply drop files to convert

</td>
<td width="50%">

### Multi-Language
- 🇬🇧 English
- 🇹🇷 Türkçe  

### Theme Support
Light & Dark mode with automatic theme detection

</td>
</tr>
</table>

---

## Supported Formats

| Category | Input Formats | Output Formats |
|----------|---------------|----------------|
| **Image** | JPG, PNG, WEBP, HEIC, SVG, ICO, TIFF, BMP, GIF, AVIF | JPG, PNG, WEBP, GIF, BMP, TIFF, ICO, PDF, TXT/DOCX/PDF (OCR) |
| **Document** | PDF, DOCX, PPTX | PDF, DOCX, TXT, HTML, MD, PNG, JPG |
| **Data** | CSV, XLSX, JSON, XML, HTML, TXT | CSV, XLSX, JSON, XML, HTML, TXT |
| **Archive** | ZIP, 7Z, TAR, GZ, TGZ, TAR.GZ, TAR.BZ2 | ZIP, 7Z, TAR |

---

## Quick Start

### Prerequisites
- **Python 3.12+** - [Download](https://www.python.org/downloads/)
- **Tesseract OCR** (for image OCR) - Install and ensure it's in default program files path or set command path.

### Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Run the application
python -m uvicorn app.main:app --port 1453
```

Or simply double-click **`Start.bat`** on Windows.

### Access
Open your browser: **http://localhost:1453**

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| **Backend** | Python, FastAPI, Uvicorn |
| **Frontend** | HTML5, CSS3, JavaScript, Tailwind CSS |
| **Conversion** | Pillow, PyMuPDF, pdf2docx, python-pptx |
| **OCR & AI** | pytesseract, google-generativeai |
| **Archive** | zipfile, py7zr, tarfile |

---

## Project Structure

```
smart-document-management/
├── app/
│   ├── main.py              # FastAPI application
│   ├── utils.py             # Utility functions
│   └── converters/          # Format converters
│       ├── images.py        # Image conversion
│       ├── pdf.py           # PDF conversion
│       ├── docx_converter.py # DOCX conversion
│       ├── pptx_converter.py # PPTX conversion
│       ├── docs.py          # Data file conversion
│       ├── archive.py       # Archive conversion
│       ├── ocr.py           # OCR text extraction
│       └── ai.py            # AI editing
├── static/
│   ├── index.html           # Main UI
│   ├── style.css            # Styles
│   ├── script.js            # Frontend logic
│   └── locales/             # Translation files
├── requirements.txt
├── Start.bat                # Windows launcher
└── README.md
```

---

## License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.
