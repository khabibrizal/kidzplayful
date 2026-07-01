// src/lib/game/templates-mewarnai.ts — template bawaan game mewarnai (Fase 1)

export const PALETTE_DEFAULT = ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6', '#8b5a2b', '#333333'];

export const WARNA_NAMA: Record<string, string> = {
  '#e74c3c': 'merah', '#e67e22': 'oranye', '#f1c40f': 'kuning', '#2ecc71': 'hijau',
  '#3498db': 'biru', '#9b59b6': 'ungu', '#8b5a2b': 'cokelat', '#333333': 'hitam',
};

type El = 'rect' | 'circle' | 'ellipse' | 'polygon' | 'path';
export interface AreaDef { id: string; label: string; el: El; attrs: Record<string, string | number> }
export interface TemplateDef {
  nama: string;
  viewBox: string;
  areas: AreaDef[];               // urutan = urutan gambar (belakang → depan)
  deco?: { el: El; attrs: Record<string, string | number> }[];
  target: Record<string, string>; // areaId -> hex (untuk mode "sesuai")
}

export const TEMPLATES: Record<string, TemplateDef> = {
  apel: {
    nama: '🍎 Apel', viewBox: '0 0 120 120',
    areas: [
      { id: 'badan', label: 'buah', el: 'path', attrs: { d: 'M60 36 C40 36 30 52 30 70 C30 92 46 106 60 106 C74 106 90 92 90 70 C90 52 80 36 60 36 Z' } },
      { id: 'daun', label: 'daun', el: 'ellipse', attrs: { cx: 74, cy: 28, rx: 13, ry: 6, transform: 'rotate(-20 74 28)' } },
      { id: 'tangkai', label: 'tangkai', el: 'rect', attrs: { x: 57, y: 18, width: 6, height: 18, rx: 3 } },
    ],
    target: { badan: '#e74c3c', daun: '#2ecc71', tangkai: '#8b5a2b' },
  },
  rumah: {
    nama: '🏠 Rumah', viewBox: '0 0 120 120',
    areas: [
      { id: 'dinding', label: 'dinding', el: 'rect', attrs: { x: 32, y: 56, width: 56, height: 48 } },
      { id: 'atap', label: 'atap', el: 'polygon', attrs: { points: '26,56 60,22 94,56' } },
      { id: 'jendela', label: 'jendela', el: 'rect', attrs: { x: 38, y: 64, width: 13, height: 13, rx: 2 } },
      { id: 'pintu', label: 'pintu', el: 'rect', attrs: { x: 54, y: 76, width: 16, height: 28, rx: 2 } },
    ],
    target: { dinding: '#f1c40f', atap: '#e74c3c', jendela: '#3498db', pintu: '#8b5a2b' },
  },
  ikan: {
    nama: '🐟 Ikan', viewBox: '0 0 120 120',
    areas: [
      { id: 'badan', label: 'badan', el: 'ellipse', attrs: { cx: 54, cy: 62, rx: 34, ry: 22 } },
      { id: 'ekor', label: 'ekor', el: 'polygon', attrs: { points: '86,62 108,44 108,80' } },
      { id: 'sirip', label: 'sirip', el: 'polygon', attrs: { points: '48,42 66,42 57,58' } },
    ],
    deco: [{ el: 'circle', attrs: { cx: 40, cy: 58, r: 4, fill: '#333' } }],
    target: { badan: '#e67e22', ekor: '#f1c40f', sirip: '#f1c40f' },
  },
  balon: {
    nama: '🎈 Balon', viewBox: '0 0 120 120',
    deco: [{ el: 'path', attrs: { d: 'M60 96 q10 14 -4 24', fill: 'none', stroke: '#333', strokeWidth: 2 } }],
    areas: [
      { id: 'balon', label: 'balon', el: 'ellipse', attrs: { cx: 60, cy: 54, rx: 30, ry: 38 } },
      { id: 'simpul', label: 'simpul', el: 'polygon', attrs: { points: '55,90 65,90 60,98' } },
    ],
    target: { balon: '#e74c3c', simpul: '#e74c3c' },
  },
  bunga: {
    nama: '🌸 Bunga', viewBox: '0 0 120 120',
    areas: [
      { id: 'tangkai', label: 'tangkai', el: 'rect', attrs: { x: 57, y: 58, width: 6, height: 48, rx: 3 } },
      { id: 'daun', label: 'daun', el: 'ellipse', attrs: { cx: 44, cy: 84, rx: 14, ry: 7, transform: 'rotate(-20 44 84)' } },
      { id: 'k1', label: 'kelopak', el: 'circle', attrs: { cx: 60, cy: 32, r: 14 } },
      { id: 'k2', label: 'kelopak', el: 'circle', attrs: { cx: 40, cy: 46, r: 14 } },
      { id: 'k3', label: 'kelopak', el: 'circle', attrs: { cx: 80, cy: 46, r: 14 } },
      { id: 'k4', label: 'kelopak', el: 'circle', attrs: { cx: 48, cy: 66, r: 14 } },
      { id: 'k5', label: 'kelopak', el: 'circle', attrs: { cx: 72, cy: 66, r: 14 } },
      { id: 'tengah', label: 'tengah', el: 'circle', attrs: { cx: 60, cy: 50, r: 13 } },
    ],
    target: { tangkai: '#2ecc71', daun: '#2ecc71', k1: '#e74c3c', k2: '#e74c3c', k3: '#e74c3c', k4: '#e74c3c', k5: '#e74c3c', tengah: '#f1c40f' },
  },
};

export const TEMPLATE_OPSI = Object.entries(TEMPLATES).map(([id, t]) => ({ id, nama: t.nama }));
