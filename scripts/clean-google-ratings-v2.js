import { readdir, readFile, writeFile } from 'fs/promises';

const dir = new URL('../app/content/articles/', import.meta.url);
const files = await readdir(dir);

for (const file of files) {
  if (!file.endsWith('.md')) continue;
  let content = await readFile(new URL(file, dir), 'utf-8');
  const before = content;

  // All patterns: "Noté X/5 sur Google" with any surrounding text
  content = content.replace(/[,.]?\s*[Nn]ot[eé] \d[.,]?\d?\/5 sur Google[^.]*\./g, '.');
  content = content.replace(/[,.]?\s*[Nn]ot[eé] \d[.,]?\d?\/5 sur Google[^,]*/g, '');
  // "noté X/5 sur Google" at start of sentence
  content = content.replace(/[Nn]ot[eé] \d[.,]?\d?\/5 sur Google[^.]*\.\s*/g, '');
  // Clean double dots/spaces
  content = content.replace(/\.\s*\./g, '.').replace(/  +/g, ' ');

  if (content !== before) {
    await writeFile(new URL(file, dir), content);
    console.log(`✅ ${file}`);
  }
}

// Verify
for (const file of files) {
  if (!file.endsWith('.md')) continue;
  const content = await readFile(new URL(file, dir), 'utf-8');
  const matches = content.match(/sur Google|\d\/5/g);
  if (matches) console.log(`⚠️ ${file}: ${matches.length} restants`);
}
