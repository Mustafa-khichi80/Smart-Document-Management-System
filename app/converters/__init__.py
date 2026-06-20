# Converter Modules Package
# Smart Document Management v1.0

from .images import convert_image
from .docs import convert_doc
from .pdf import convert_pdf
from .docx_converter import convert_docx
from .pptx_converter import convert_pptx
from .archive import convert_archive
from .ocr import convert_ocr, extract_ocr_text

__all__ = [
    'convert_image',
    'convert_doc',
    'convert_pdf',
    'convert_docx',
    'convert_pptx',
    'convert_archive',
    'convert_ocr',
    'extract_ocr_text'
]
