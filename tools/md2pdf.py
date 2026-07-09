#!/usr/bin/env python
"""Konversi 1 file Markdown -> HTML ber-CSS (untuk dicetak ke PDF via Chrome)."""
import sys, pathlib, markdown

src = pathlib.Path(sys.argv[1])
out = src.with_suffix(".html")
html_body = markdown.markdown(src.read_text(encoding="utf-8"),
                             extensions=["extra", "sane_lists", "toc"])

CSS = """
@page { size: A4; margin: 15mm 14mm; }
* { box-sizing: border-box; }
body { font-family: 'Segoe UI', system-ui, sans-serif; color:#222; line-height:1.55; font-size:11pt; }
h1 { font-size:20pt; color:#5a2ca0; border-bottom:3px solid #efe7fb; padding-bottom:6px; }
h2 { font-size:14pt; color:#3a78d6; margin-top:20px; border-bottom:1px solid #eee; padding-bottom:3px; page-break-after:avoid; }
h3 { font-size:12pt; color:#2ba8a3; margin-top:14px; page-break-after:avoid; }
table { border-collapse:collapse; width:100%; margin:10px 0; font-size:9.5pt; page-break-inside:avoid; }
th,td { border:1px solid #ddd; padding:5px 8px; text-align:left; vertical-align:top; }
th { background:#f4f0fb; color:#444; }
code { background:#f3f3f7; padding:1px 5px; border-radius:4px; font-size:9pt; color:#a13; font-family:'Consolas','Courier New',monospace; }
pre { background:#f7f7fb; border:1px solid #e6e6ee; border-radius:8px; padding:10px 12px; overflow:auto; font-size:8pt; line-height:1.35; page-break-inside:avoid; white-space:pre-wrap; font-family:'Consolas','Courier New',monospace; }
pre code { background:none; color:#333; padding:0; font-family:'Consolas','Courier New',monospace; }
blockquote { border-left:4px solid #ffc93c; background:#fffdf3; margin:10px 0; padding:6px 14px; color:#665; }
hr { border:none; border-top:1px solid #e2e2ea; margin:16px 0; }
a { color:#3a78d6; text-decoration:none; }
ul,ol { margin:8px 0 8px 6px; padding-left:20px; }
li { margin:3px 0; }
"""
doc = f"""<!DOCTYPE html><html lang="id"><head><meta charset="utf-8">
<title>Dokumentasi KidzPlayful</title><style>{CSS}</style></head>
<body>{html_body}</body></html>"""
out.write_text(doc, encoding="utf-8")
print("HTML:", out)
