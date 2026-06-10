#!/usr/bin/env python
"""Bangun HTML rapi dari spec .md (diagram mermaid -> SVG inline) untuk dicetak ke PDF."""
import re, sys, pathlib, markdown

ROOT = pathlib.Path(__file__).resolve().parent.parent
SPEC = ROOT / "docs" / "specs" / "2026-06-10-kidzplayful-design.md"
DIAG = ROOT / "mockups" / "diagrams"
OUT_HTML = ROOT / "docs" / "specs" / "2026-06-10-kidzplayful-design.html"

# Urutan blok ```mermaid di dokumen: use case, flow A, flow B, ERD
DIAGRAM_SVGS = ["usecase.svg", "flow-a.svg", "flow-b.svg", "erd.svg"]

md_text = SPEC.read_text(encoding="utf-8")

# Ganti tiap fenced ```mermaid ... ``` dengan token placeholder (urut)
counter = {"n": 0}
def repl(_m):
    i = counter["n"]; counter["n"] += 1
    return f"\n\n@@DIAGRAM_{i}@@\n\n"
md_text = re.sub(r"```mermaid\n.*?\n```", repl, md_text, flags=re.S)
print(f"mermaid blocks diganti: {counter['n']}")

html_body = markdown.markdown(md_text, extensions=["extra", "sane_lists", "toc"])

# Sisipkan SVG inline menggantikan placeholder
for i, svg_name in enumerate(DIAGRAM_SVGS):
    svg = (DIAG / svg_name).read_text(encoding="utf-8")
    block = f'<div class="diagram">{svg}</div>'
    html_body = html_body.replace(f"<p>@@DIAGRAM_{i}@@</p>", block)

CSS = """
@page { size: A4; margin: 16mm 14mm; }
* { box-sizing: border-box; }
body { font-family: 'Segoe UI', system-ui, sans-serif; color:#222; line-height:1.55; font-size:11.5pt; }
h1 { font-size:21pt; color:#5a2ca0; border-bottom:3px solid #efe7fb; padding-bottom:6px; }
h2 { font-size:15pt; color:#3a78d6; margin-top:22px; border-bottom:1px solid #eee; padding-bottom:3px; page-break-after:avoid; }
h3 { font-size:12.5pt; color:#2ba8a3; margin-top:16px; page-break-after:avoid; }
table { border-collapse:collapse; width:100%; margin:10px 0; font-size:10pt; page-break-inside:avoid; }
th,td { border:1px solid #ddd; padding:6px 9px; text-align:left; vertical-align:top; }
th { background:#f4f0fb; color:#444; }
code { background:#f3f3f7; padding:1px 5px; border-radius:4px; font-size:9.5pt; color:#a13; }
pre { background:#f7f7fb; border:1px solid #e6e6ee; border-radius:8px; padding:10px 12px; overflow:auto; font-size:8.7pt; line-height:1.4; page-break-inside:avoid; }
pre code { background:none; color:#333; padding:0; }
blockquote { border-left:4px solid #ffc93c; background:#fffdf3; margin:10px 0; padding:6px 14px; color:#665; }
hr { border:none; border-top:1px solid #e2e2ea; margin:18px 0; }
a { color:#3a78d6; text-decoration:none; }
.diagram { text-align:center; margin:14px 0; page-break-inside:avoid; }
.diagram svg { max-width:100%; height:auto; width:auto; }
ul,ol { margin:8px 0 8px 6px; padding-left:20px; }
li { margin:3px 0; }
"""

doc = f"""<!DOCTYPE html><html lang="id"><head><meta charset="utf-8">
<title>KidzPlayful — Dokumen Desain</title><style>{CSS}</style></head>
<body>{html_body}</body></html>"""
OUT_HTML.write_text(doc, encoding="utf-8")
print("HTML ditulis:", OUT_HTML)
