import re, pathlib

root = pathlib.Path('src')
op_map = {'select': 'GET', 'insert': 'POST', 'upsert': 'POST', 'update': 'PATCH', 'delete': 'DELETE'}
re_from = re.compile(r"\.from\('([a-z_]+)'\)\s*\.\s*([a-z]+)")
re_auth = re.compile(r"auth\.([a-zA-Z]+)\(")
re_stor = re.compile(r"storage\.from\('([^']+)'\)\.([a-zA-Z]+)")

files = sorted(p for p in root.rglob('*') if p.suffix in ('.ts', '.tsx'))
rows = []
for p in files:
    t = p.read_text(encoding='utf-8', errors='ignore')
    tables, auths, stor = {}, set(), set()
    for tbl, op in re_from.findall(t):
        if tbl == 'aset':
            continue
        tables.setdefault(tbl, set()).add(op)
    for m in re_auth.findall(t):
        auths.add(m)
    for b, op in re_stor.findall(t):
        stor.add(f"{b}:{op}")
    if tables or auths or stor:
        rows.append((p.as_posix(), tables, sorted(auths), sorted(stor)))

out = [
    "# API / Akses Data per File — KidzPlayful",
    "",
    "Aplikasi tidak punya REST route sendiri; semua lewat **Supabase** di bawah `NEXT_PUBLIC_SUPABASE_URL`.",
    "DB = PostgREST `/rest/v1/<tabel>` · Auth = `/auth/v1/*` · Storage = `/storage/v1/*` (bucket `aset`).",
    "Operasi: select=GET, insert/upsert=POST, update=PATCH, delete=DELETE. Semua tunduk pada RLS.",
    "",
    f"Total file pengakses data: **{len(rows)}**",
    "",
]
for path, tables, auths, stor in rows:
    out.append(f"### `{path}`")
    if tables:
        parts = []
        for tbl in sorted(tables):
            ops = ', '.join(sorted(f"{op_map.get(o, o)}({o})" for o in tables[tbl]))
            parts.append(f"`{tbl}` [{ops}]")
        out.append("- **DB:** " + "; ".join(parts))
    if auths:
        out.append("- **Auth:** " + ", ".join(f"`auth.{a}()`" for a in auths))
    if stor:
        out.append("- **Storage:** " + ", ".join(f"`{s}`" for s in stor))
    out.append("")

pathlib.Path('docs/API.md').write_text("\n".join(out), encoding='utf-8')
print(f"docs/API.md dibuat — {len(rows)} file")
