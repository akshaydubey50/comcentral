"""Export the approved Markdown requirements and verify the one-page PDF."""

from html import escape
from pathlib import Path
import re
import tempfile

import fitz
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs/requirements.md"
OUTPUT = ROOT / "docs/requirements.pdf"
PREVIEW = Path(tempfile.gettempdir()) / "comcentral-requirements.png"
INK = colors.HexColor("#183b48")
ACCENT = colors.HexColor("#126174")
MUTED = colors.HexColor("#637a85")


def inline(text: str) -> str:
    """Retain Markdown bold labels without treating source text as XML."""
    return re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", escape(text))


def footer(canvas, document):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#d6e2e7"))
    canvas.line(38, 36, A4[0] - 38, 36)
    canvas.setFont("Helvetica", 7.3)
    canvas.setFillColor(MUTED)
    canvas.drawString(38, 24, "ComCentral | Product requirements")
    canvas.drawRightString(A4[0] - 38, 24, "14 October 2026")
    canvas.restoreState()


styles = {
    "title": ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=17.5, leading=21, textColor=INK, spaceAfter=7),
    "meta": ParagraphStyle("meta", fontName="Helvetica", fontSize=8, leading=10, textColor=MUTED, spaceAfter=6),
    "heading": ParagraphStyle("heading", fontName="Helvetica-Bold", fontSize=8.7, leading=10.7, textColor=ACCENT, spaceBefore=8, spaceAfter=3, keepWithNext=True),
    "body": ParagraphStyle("body", fontName="Helvetica", fontSize=9.35, leading=11.6, textColor=colors.HexColor("#26353b"), spaceAfter=3),
    "bullet": ParagraphStyle("bullet", fontName="Helvetica", fontSize=9.35, leading=11.6, textColor=colors.HexColor("#26353b"), leftIndent=9, bulletIndent=0, spaceAfter=3),
}

source = SOURCE.read_text(encoding="utf-8")
story = []
for line in source.splitlines():
    if not line.strip():
        continue
    if line.startswith("# "):
        story.append(Paragraph(inline(line[2:]), styles["title"]))
    elif line.startswith("**One-page"):
        story.append(Paragraph(inline(line.strip("*")), styles["meta"]))
        story.append(HRFlowable(width="100%", thickness=0.8, color=ACCENT))
    elif line.startswith("## "):
        story.append(Paragraph(inline(line[3:].upper()), styles["heading"]))
    elif line.startswith("- "):
        story.append(Paragraph(inline(line[2:]), styles["bullet"], bulletText="-"))
    else:
        story.append(Paragraph(inline(line), styles["body"]))

SimpleDocTemplate(
    str(OUTPUT), pagesize=A4, rightMargin=38, leftMargin=38,
    topMargin=28, bottomMargin=46, title="ComCentral - Employee Salary Management Requirements",
    author="ComCentral", pageCompression=1,
).build(story, onFirstPage=footer, onLaterPages=footer)

with fitz.open(OUTPUT) as document:
    assert len(document) == 1, f"Expected one page, got {len(document)}"
    page = document[0]
    extracted = " ".join(page.get_text().split())
    assert "Registration and access:" in extracted
    assert "immediately opens the shared HR workspace" in extracted
    assert "No invitation, administrator approval, or email-verification gate" in extracted
    for paragraph in source.splitlines():
        if not paragraph:
            continue
        if paragraph.startswith("## "):
            assert paragraph[3:].upper() in extracted
            continue
        plain = re.sub(r"^# |^- |\*\*", "", paragraph)
        assert " ".join(plain.split()) in extracted, f"Missing PDF text: {plain[:60]}"
    for block in page.get_text("blocks"):
        assert block[0] >= 0 and block[1] >= 0 and block[2] <= A4[0] and block[3] <= A4[1], "Text outside page"
    page.get_pixmap(matrix=fitz.Matrix(1.6, 1.6)).save(PREVIEW)
    print({"pages": len(document), "markdown_words": len(source.split()), "pdf": str(OUTPUT), "preview": str(PREVIEW)})
