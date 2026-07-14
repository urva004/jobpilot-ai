import io
import pdfplumber
import docx

class ResumeParser:
    @staticmethod
    def extract_text_from_pdf(file_bytes: bytes) -> str:
        text = ""
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        return text

    @staticmethod
    def extract_text_from_docx(file_bytes: bytes) -> str:
        doc = docx.Document(io.BytesIO(file_bytes))
        full_text = []
        for para in doc.paragraphs:
            if para.text:
                full_text.append(para.text)
        for table in doc.tables:
            for row in table.rows:
                # Deduplicate row text to avoid repeating identical text across merged cells
                row_text = []
                for cell in row.cells:
                    cell_text = cell.text.strip()
                    if cell_text and (not row_text or row_text[-1] != cell_text):
                        row_text.append(cell_text)
                if row_text:
                    full_text.append(" | ".join(row_text))
        return "\n".join(full_text)

    @classmethod
    def parse(cls, filename: str, file_bytes: bytes) -> str:
        ext = filename.split(".")[-1].lower()
        if ext == "pdf":
            return cls.extract_text_from_pdf(file_bytes)
        elif ext in ["docx", "doc"]:
            return cls.extract_text_from_docx(file_bytes)
        else:
            raise ValueError(f"Unsupported file format: {ext}. Only PDF and DOCX are supported.")
