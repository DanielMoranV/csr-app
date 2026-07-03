// Copia los assets de pdfjs-dist (cmaps y standard_fonts) a public/pdfjs.
// Reemplaza el antiguo `cp -r` del package.json, que no existe en Windows/cmd.
import { cpSync, mkdirSync } from 'node:fs';

const targets = [
    ['node_modules/pdfjs-dist/cmaps', 'public/pdfjs/cmaps'],
    ['node_modules/pdfjs-dist/standard_fonts', 'public/pdfjs/standard_fonts']
];

mkdirSync('public/pdfjs', { recursive: true });
for (const [src, dest] of targets) {
    cpSync(src, dest, { recursive: true });
    console.log(`copiado: ${src} → ${dest}`);
}
