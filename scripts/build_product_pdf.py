#!/usr/bin/env python3
"""Build the submission-ready Jizuo product brief from docs/PRODUCT.md."""

from __future__ import annotations

import re
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "PRODUCT.md"
OUTPUT = ROOT / "submission" / "迹作-Jizuo-产品说明书.pdf"

PAPER = colors.HexColor("#F3EAD8")
INK = colors.HexColor("#101116")
ORANGE = colors.HexColor("#FF5733")
BLUE = colors.HexColor("#3D63F3")
YELLOW = colors.HexColor("#F4D85B")
GREEN = colors.HexColor("#27AD78")
MUTED = colors.HexColor("#666158")
WHITE = colors.HexColor("#FFFDF7")


def register_fonts() -> None:
    pdfmetrics.registerFont(
        TTFont("JizuoSans", "/System/Library/Fonts/Supplemental/Arial Unicode.ttf")
    )
    pdfmetrics.registerFont(
        TTFont("JizuoDisplay", "/System/Library/Fonts/Supplemental/Arial Black.ttf")
    )
    pdfmetrics.registerFontFamily(
        "JizuoSans", normal="JizuoSans", bold="JizuoSans", italic="JizuoSans", boldItalic="JizuoSans"
    )


def inline(text: str) -> str:
    safe = escape(text.strip())
    safe = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", safe)
    safe = re.sub(r"`(.+?)`", r"<font face='Courier'>\1</font>", safe)
    return safe


def make_styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "body": ParagraphStyle(
            "Body",
            parent=base["BodyText"],
            fontName="JizuoSans",
            fontSize=9.2,
            leading=15.2,
            textColor=INK,
            spaceAfter=3.2 * mm,
            wordWrap="CJK",
        ),
        "small": ParagraphStyle(
            "Small",
            parent=base["BodyText"],
            fontName="JizuoSans",
            fontSize=7.4,
            leading=11,
            textColor=MUTED,
            wordWrap="CJK",
        ),
        "h2": ParagraphStyle(
            "H2",
            parent=base["Heading1"],
            fontName="JizuoSans",
            fontSize=18,
            leading=24,
            textColor=INK,
            spaceBefore=4 * mm,
            spaceAfter=3.2 * mm,
            keepWithNext=True,
            wordWrap="CJK",
        ),
        "h3": ParagraphStyle(
            "H3",
            parent=base["Heading2"],
            fontName="JizuoSans",
            fontSize=12.5,
            leading=18,
            textColor=BLUE,
            spaceBefore=2.5 * mm,
            spaceAfter=2 * mm,
            keepWithNext=True,
            wordWrap="CJK",
        ),
        "bullet": ParagraphStyle(
            "Bullet",
            parent=base["BodyText"],
            fontName="JizuoSans",
            fontSize=9,
            leading=14.5,
            textColor=INK,
            leftIndent=5 * mm,
            firstLineIndent=-3.5 * mm,
            bulletIndent=0,
            spaceAfter=1.8 * mm,
            wordWrap="CJK",
        ),
        "quote": ParagraphStyle(
            "Quote",
            parent=base["BodyText"],
            fontName="JizuoSans",
            fontSize=10.5,
            leading=17,
            textColor=INK,
            leftIndent=7 * mm,
            rightIndent=5 * mm,
            borderColor=ORANGE,
            borderWidth=0,
            borderPadding=7,
            backColor=colors.HexColor("#FBE2D6"),
            spaceBefore=2 * mm,
            spaceAfter=4 * mm,
            wordWrap="CJK",
        ),
        "table": ParagraphStyle(
            "Table",
            parent=base["BodyText"],
            fontName="JizuoSans",
            fontSize=7.2,
            leading=10.5,
            textColor=INK,
            wordWrap="CJK",
        ),
        "table_header": ParagraphStyle(
            "TableHeader",
            parent=base["BodyText"],
            fontName="JizuoSans",
            fontSize=7.2,
            leading=10.5,
            textColor=WHITE,
            wordWrap="CJK",
        ),
        "cover_label": ParagraphStyle(
            "CoverLabel",
            parent=base["BodyText"],
            fontName="Courier-Bold",
            fontSize=10,
            leading=13,
            textColor=WHITE,
            alignment=TA_CENTER,
            backColor=INK,
            borderPadding=(5, 9, 5, 9),
        ),
        "cover_title": ParagraphStyle(
            "CoverTitle",
            parent=base["Title"],
            fontName="JizuoSans",
            fontSize=36,
            leading=44,
            textColor=INK,
            alignment=TA_LEFT,
            wordWrap="CJK",
        ),
        "cover_en": ParagraphStyle(
            "CoverEn",
            parent=base["Title"],
            fontName="JizuoDisplay",
            fontSize=22,
            leading=26,
            textColor=ORANGE,
            alignment=TA_LEFT,
        ),
        "cover_subtitle": ParagraphStyle(
            "CoverSubtitle",
            parent=base["BodyText"],
            fontName="JizuoSans",
            fontSize=13,
            leading=21,
            textColor=INK,
            alignment=TA_LEFT,
            wordWrap="CJK",
        ),
    }


def draw_page(canvas, doc) -> None:
    width, height = A4
    canvas.saveState()
    canvas.setFillColor(PAPER)
    canvas.rect(0, 0, width, height, fill=1, stroke=0)
    canvas.setStrokeColor(colors.Color(0.06, 0.07, 0.09, alpha=0.05))
    canvas.setLineWidth(0.3)
    for x in range(0, int(width), 18):
        canvas.line(x, 0, x, height)
    for y in range(0, int(height), 18):
        canvas.line(0, y, width, y)

    canvas.setFillColor(ORANGE)
    canvas.rect(0, height - 5 * mm, width, 5 * mm, fill=1, stroke=0)
    if doc.page > 1:
        canvas.setStrokeColor(INK)
        canvas.setLineWidth(0.8)
        canvas.line(18 * mm, 16 * mm, width - 18 * mm, 16 * mm)
        canvas.setFont("Courier-Bold", 7)
        canvas.setFillColor(INK)
        canvas.drawString(18 * mm, 10 * mm, "JIZUO / PRODUCT BRIEF / 2026")
        canvas.drawRightString(width - 18 * mm, 10 * mm, f"{doc.page - 1:02d}")
    canvas.restoreState()


def cover(styles: dict[str, ParagraphStyle]):
    meta = [
        ["参赛赛道", "创新 AI 工具"],
        ["作品形态", "响应式 Web 应用"],
        ["AI 模型", "DeepSeek"],
        ["版本", "MVP / 2026.07.16"],
    ]
    meta_table = Table(meta, colWidths=[32 * mm, 92 * mm], hAlign="LEFT")
    meta_table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, -1), "JizuoSans"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("TEXTCOLOR", (0, 0), (0, -1), MUTED),
                ("TEXTCOLOR", (1, 0), (1, -1), INK),
                ("LINEBELOW", (0, 0), (-1, -1), 0.5, colors.HexColor("#9F9789")),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    summary = Table(
        [[Paragraph("迹作不替用户编一个故事，它把用户已经做过的 AI 工作，变成可验证、可编辑、可发布的故事。", styles["cover_subtitle"])]],
        colWidths=[150 * mm],
    )
    summary.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), YELLOW),
                ("BOX", (0, 0), (-1, -1), 1.2, INK),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                ("TOPPADDING", (0, 0), (-1, -1), 12),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
            ]
        )
    )
    return [
        Spacer(1, 18 * mm),
        Table([[Paragraph("AGENT TRACE → SOCIAL STORY", styles["cover_label"])]], colWidths=[62 * mm], hAlign="LEFT"),
        Spacer(1, 19 * mm),
        Paragraph("迹作 Jizuo", styles["cover_title"]),
        Paragraph("TURN AI TRACES<br/>INTO STORIES.", styles["cover_en"]),
        Spacer(1, 10 * mm),
        Paragraph("把一次 AI 实操轨迹，变成有证据、可发布的自媒体作品。", styles["cover_subtitle"]),
        Spacer(1, 16 * mm),
        meta_table,
        Spacer(1, 14 * mm),
        summary,
        Spacer(1, 10 * mm),
        Paragraph("IMPORT A SESSION. TELL ITS STORY.", styles["small"]),
        PageBreak(),
    ]


def markdown_table(rows: list[list[str]], styles: dict[str, ParagraphStyle]):
    width = 174 * mm
    columns = max(len(row) for row in rows)
    col_widths = [width / columns] * columns
    cells = [
        [Paragraph(inline(cell), styles["table_header"] if row_index == 0 else styles["table"]) for cell in row]
        for row_index, row in enumerate(rows)
    ]
    table = Table(cells, colWidths=col_widths, repeatRows=1, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), INK),
                ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
                ("BACKGROUND", (0, 1), (-1, -1), colors.Color(1, 1, 1, alpha=0.62)),
                ("GRID", (0, 0), (-1, -1), 0.5, INK),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return table


def parse_markdown(styles: dict[str, ParagraphStyle]):
    lines = SOURCE.read_text(encoding="utf-8").splitlines()
    story = []
    paragraph: list[str] = []
    index = 0
    in_code = False

    def flush_paragraph() -> None:
        if paragraph:
            story.append(Paragraph(inline(" ".join(paragraph)), styles["body"]))
            paragraph.clear()

    while index < len(lines):
        raw = lines[index].rstrip()
        line = raw.strip()
        if line.startswith("```"):
            flush_paragraph()
            if not in_code and line == "```mermaid":
                story.append(
                    KeepTogether(
                        [
                            Paragraph("PRODUCT FLOW", styles["h3"]),
                            Paragraph(
                                "导入日志 → 本地解析与脱敏 → DeepSeek 叙事建模 → 证据校验 → 决策轨迹与 8 页故事板 → 人机共编 → PNG / ZIP 导出",
                                styles["quote"],
                            ),
                        ]
                    )
                )
            in_code = not in_code
            index += 1
            continue
        if in_code:
            index += 1
            continue
        if not line:
            flush_paragraph()
            index += 1
            continue
        if line.startswith("# ") or line.startswith("> Turn AI") or line.startswith("> 把一次"):
            index += 1
            continue
        if line.startswith("## "):
            flush_paragraph()
            story.append(Paragraph(inline(line[3:]), styles["h2"]))
            index += 1
            continue
        if line.startswith("### "):
            flush_paragraph()
            story.append(Paragraph(inline(line[4:]), styles["h3"]))
            index += 1
            continue
        if line.startswith("> "):
            flush_paragraph()
            story.append(Paragraph(inline(line[2:]), styles["quote"]))
            index += 1
            continue
        if line.startswith("|") and index + 1 < len(lines) and re.match(r"^\|[\s:|\-]+\|$", lines[index + 1].strip()):
            flush_paragraph()
            table_rows = [[cell.strip() for cell in line.strip("|").split("|")]]
            index += 2
            while index < len(lines) and lines[index].strip().startswith("|"):
                table_rows.append([cell.strip() for cell in lines[index].strip().strip("|").split("|")])
                index += 1
            story.append(markdown_table(table_rows, styles))
            story.append(Spacer(1, 3 * mm))
            continue
        bullet = re.match(r"^(?:-|\d+\.)\s+(.+)$", line)
        if bullet:
            flush_paragraph()
            marker = "•" if line.startswith("-") else line.split(".", 1)[0] + "."
            story.append(Paragraph(f"{marker}&nbsp;&nbsp;{inline(bullet.group(1))}", styles["bullet"]))
            index += 1
            continue
        paragraph.append(line)
        index += 1

    flush_paragraph()
    return story


def build() -> Path:
    register_fonts()
    styles = make_styles()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=22 * mm,
        title="迹作 Jizuo 产品说明书",
        author="Xiaoqi",
        subject="2026 迅雷校园 AI 创造营参赛作品",
    )
    story = cover(styles) + parse_markdown(styles)
    doc.build(story, onFirstPage=draw_page, onLaterPages=draw_page)
    return OUTPUT


if __name__ == "__main__":
    print(build())
