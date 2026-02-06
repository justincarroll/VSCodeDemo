import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Difficulty = 'easy' | 'medium' | 'hard';

interface GeneratedPuzzle {
  id: string;
  difficulty: Difficulty;
  puzzle: string;
  solution: string;
}

const OUT_DIR = resolve(process.cwd(), 'src/data');
const COUNT = 40;

const knownSolutions = [
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179',
  '417369825632158947958724316825437169791586432346912758289643571573291684164875293',
  '295743861431865927876192543387459216612387495549216738763524189928671354154938672'
];

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

function carve(solution: string, blanks: number, seed: number): string {
  const indices = Array.from({ length: 81 }, (_, i) => i);
  const rand = seeded(seed);
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const chars = [...solution];
  for (let i = 0; i < blanks; i += 1) {
    chars[indices[i]] = '.';
  }
  return chars.join('');
}

async function generateWithEngine(difficulty: Difficulty, count: number): Promise<GeneratedPuzzle[]> {
  const { getSudoku } = (await import('sudoku-gen')) as {
    getSudoku: (difficulty?: string) => { puzzle: string; solution: string };
  };

  const target = difficulty === 'hard' ? 'expert' : difficulty;
  const items: GeneratedPuzzle[] = [];

  while (items.length < count) {
    const generated = getSudoku(target);
    if (!generated?.puzzle || !generated?.solution) {
      continue;
    }

    const puzzle = generated.puzzle.replace(/[^1-9.-]/g, '').replace(/-/g, '.');
    const solution = generated.solution.replace(/[^1-9]/g, '');

    if (puzzle.length !== 81 || solution.length !== 81) {
      continue;
    }

    items.push({
      id: `${difficulty}-${items.length + 1}`,
      difficulty,
      puzzle,
      solution
    });
  }

  return items;
}

function generateFallback(difficulty: Difficulty, count: number): GeneratedPuzzle[] {
  const blanksByDifficulty: Record<Difficulty, number> = {
    easy: 36,
    medium: 46,
    hard: 54
  };
  const blanks = blanksByDifficulty[difficulty];

  return Array.from({ length: count }, (_, index) => {
    const solution = knownSolutions[index % knownSolutions.length];
    return {
      id: `${difficulty}-${index + 1}`,
      difficulty,
      puzzle: carve(solution, blanks, index + 11),
      solution
    };
  });
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    let puzzles: GeneratedPuzzle[];
    try {
      puzzles = await generateWithEngine(difficulty, COUNT);
      console.log(`Generated ${COUNT} ${difficulty} puzzles using sudoku-gen.`);
    } catch {
      puzzles = generateFallback(difficulty, COUNT);
      console.log(`Generated ${COUNT} ${difficulty} puzzles using fallback generator.`);
    }

    writeFileSync(resolve(OUT_DIR, `puzzles.${difficulty}.json`), JSON.stringify(puzzles, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
