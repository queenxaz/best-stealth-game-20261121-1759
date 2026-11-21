// main.ts — EMBERWATCH's hand-in program (Node 22, standard library only).
// It copies this repository's game/ and screenshots/ into the output
// directory and writes /output/dossier.json with the vendored make.fun
// library, exactly as the bounty asks.
//
// The grader runs this on a read-only filesystem with a fresh, empty
// /output, so the program only ever creates directories and copies files
// into them — it never deletes, clears or moves anything, and it never
// assumes the output directory already holds anything.
//
// Local check:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Create the output tree (mkdir only — nothing here is ever removed).
mkdirSync(outputDir, { recursive: true });
mkdirSync(join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });

// Hand in the game as it stands in this repository.
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The dossier the judge reads, written by the kit's library with the gate's
// own caps: 160 KiB of source text, at most 4 screenshots of 256 KiB each,
// game/ within 993 files and 48 MiB, paths within 1000 bytes.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
