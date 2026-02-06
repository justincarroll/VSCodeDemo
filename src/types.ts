export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Puzzle {
  id: string;
  difficulty: Difficulty;
  puzzle: string;
  solution: string;
}
