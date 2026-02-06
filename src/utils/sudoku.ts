export const BOARD_SIZE = 81;

export function parseGrid(grid: string): Array<number | null> {
  if (grid.length !== BOARD_SIZE) {
    throw new Error(`Expected ${BOARD_SIZE} chars, got ${grid.length}`);
  }
  return [...grid].map((char) => {
    if (char === '.' || char === '-' || char === '0') {
      return null;
    }
    const value = Number(char);
    if (!Number.isInteger(value) || value < 1 || value > 9) {
      throw new Error(`Invalid grid character: ${char}`);
    }
    return value;
  });
}

export function computeConflicts(values: Array<number | null>): Set<number> {
  const conflicts = new Set<number>();

  const markGroup = (indices: number[]) => {
    const byValue = new Map<number, number[]>();
    for (const idx of indices) {
      const value = values[idx];
      if (value == null) {
        continue;
      }
      const list = byValue.get(value) ?? [];
      list.push(idx);
      byValue.set(value, list);
    }
    for (const dupes of byValue.values()) {
      if (dupes.length > 1) {
        for (const idx of dupes) {
          conflicts.add(idx);
        }
      }
    }
  };

  for (let row = 0; row < 9; row += 1) {
    markGroup(Array.from({ length: 9 }, (_, col) => row * 9 + col));
  }

  for (let col = 0; col < 9; col += 1) {
    markGroup(Array.from({ length: 9 }, (_, row) => row * 9 + col));
  }

  for (let boxRow = 0; boxRow < 3; boxRow += 1) {
    for (let boxCol = 0; boxCol < 3; boxCol += 1) {
      const indices: number[] = [];
      for (let row = 0; row < 3; row += 1) {
        for (let col = 0; col < 3; col += 1) {
          indices.push((boxRow * 3 + row) * 9 + (boxCol * 3 + col));
        }
      }
      markGroup(indices);
    }
  }

  return conflicts;
}

export function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function isSolved(values: Array<number | null>, solution: string): boolean {
  return values.every((value, idx) => value === Number(solution[idx]));
}

export function rowColFromIndex(index: number): { row: number; col: number } {
  return {
    row: Math.floor(index / 9),
    col: index % 9
  };
}
