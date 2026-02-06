import { useEffect, useMemo, useState } from 'react';
import easyPack from './data/puzzles.easy.json';
import mediumPack from './data/puzzles.medium.json';
import hardPack from './data/puzzles.hard.json';
import type { Difficulty, Puzzle } from './types';
import { computeConflicts, formatTime, isSolved, parseGrid, rowColFromIndex } from './utils/sudoku';

type Screen = 'start' | 'play' | 'won';

interface Snapshot {
  entries: Array<number | null>;
  notes: number[][];
}

interface GameSession {
  difficulty: Difficulty;
  puzzleIndex: number;
  puzzle: Puzzle;
  givens: boolean[];
  entries: Array<number | null>;
  notes: number[][];
  selected: number | null;
  notesMode: boolean;
  undo: Snapshot[];
  redo: Snapshot[];
  elapsedSeconds: number;
}

const STORAGE_KEY = 'sudoku-v1';

const puzzlePacks: Record<Difficulty, Puzzle[]> = {
  easy: easyPack as Puzzle[],
  medium: mediumPack as Puzzle[],
  hard: hardPack as Puzzle[]
};

function cloneNotes(notes: number[][]): number[][] {
  return notes.map((values) => [...values]);
}

function snapshotOf(session: GameSession): Snapshot {
  return {
    entries: [...session.entries],
    notes: cloneNotes(session.notes)
  };
}

function puzzleAt(difficulty: Difficulty, index: number): { puzzle: Puzzle; index: number } {
  const pack = puzzlePacks[difficulty];
  const safeIndex = ((index % pack.length) + pack.length) % pack.length;
  return {
    puzzle: pack[safeIndex],
    index: safeIndex
  };
}

function createSession(difficulty: Difficulty, puzzleIndex: number): GameSession {
  const { puzzle, index } = puzzleAt(difficulty, puzzleIndex);
  const entries = parseGrid(puzzle.puzzle);
  const givens = entries.map((value) => value != null);
  return {
    difficulty,
    puzzleIndex: index,
    puzzle,
    givens,
    entries,
    notes: Array.from({ length: 81 }, () => []),
    selected: null,
    notesMode: false,
    undo: [],
    redo: [],
    elapsedSeconds: 0
  };
}

function App() {
  const [screen, setScreen] = useState<Screen>('start');
  const [session, setSession] = useState<GameSession | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as { screen: Screen; session: GameSession | null };
      if (parsed.session) {
        setSession(parsed.session);
        setScreen(parsed.screen === 'start' ? 'play' : parsed.screen);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (!session || screen === 'start') {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ screen, session }));
  }, [screen, session]);

  useEffect(() => {
    if (screen !== 'play') {
      return;
    }
    const timer = window.setInterval(() => {
      setSession((prev) => (prev ? { ...prev, elapsedSeconds: prev.elapsedSeconds + 1 } : prev));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [screen]);

  const conflicts = useMemo(() => (session ? computeConflicts(session.entries) : new Set<number>()), [session]);

  useEffect(() => {
    if (!session || screen !== 'play') {
      return;
    }
    const complete = session.entries.every((value) => value != null);
    if (!complete || conflicts.size > 0) {
      return;
    }
    if (isSolved(session.entries, session.puzzle.solution)) {
      setScreen('won');
    }
  }, [conflicts, screen, session]);

  useEffect(() => {
    if (screen !== 'play' || !session) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (!session) {
        return;
      }
      const selected = session.selected;

      const moveSelection = (deltaRow: number, deltaCol: number) => {
        const base = selected ?? 40;
        const { row, col } = rowColFromIndex(base);
        const nextRow = (row + deltaRow + 9) % 9;
        const nextCol = (col + deltaCol + 9) % 9;
        setSession((prev) => (prev ? { ...prev, selected: nextRow * 9 + nextCol } : prev));
      };

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        moveSelection(-1, 0);
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        moveSelection(1, 0);
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        moveSelection(0, -1);
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        moveSelection(0, 1);
        return;
      }

      if (event.key.toLowerCase() === 'n') {
        event.preventDefault();
        setSession((prev) => (prev ? { ...prev, notesMode: !prev.notesMode } : prev));
        return;
      }

      if (selected == null || session.givens[selected]) {
        return;
      }

      if (event.key >= '1' && event.key <= '9') {
        event.preventDefault();
        const value = Number(event.key);
        applyNumber(value);
        return;
      }

      if (event.key === 'Backspace' || event.key === 'Delete' || event.key === '0') {
        event.preventDefault();
        clearCell();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screen, session]);

  const applyWithHistory = (mutator: (draft: GameSession) => void) => {
    setSession((prev) => {
      if (!prev) {
        return prev;
      }
      const draft: GameSession = {
        ...prev,
        entries: [...prev.entries],
        notes: cloneNotes(prev.notes),
        undo: [...prev.undo],
        redo: [...prev.redo]
      };
      const before = snapshotOf(draft);
      mutator(draft);
      draft.undo.push(before);
      if (draft.undo.length > 200) {
        draft.undo.shift();
      }
      draft.redo = [];
      return draft;
    });
  };

  const applyNumber = (value: number) => {
    applyWithHistory((draft) => {
      const index = draft.selected;
      if (index == null || draft.givens[index]) {
        return;
      }
      if (draft.notesMode) {
        const notes = new Set(draft.notes[index]);
        if (notes.has(value)) {
          notes.delete(value);
        } else {
          notes.add(value);
        }
        draft.notes[index] = [...notes].sort((a, b) => a - b);
      } else {
        draft.entries[index] = value;
        draft.notes[index] = [];
      }
    });
  };

  const clearCell = () => {
    applyWithHistory((draft) => {
      const index = draft.selected;
      if (index == null || draft.givens[index]) {
        return;
      }
      draft.entries[index] = null;
      draft.notes[index] = [];
    });
  };

  const undo = () => {
    setSession((prev) => {
      if (!prev || prev.undo.length === 0) {
        return prev;
      }
      const current = snapshotOf(prev);
      const previous = prev.undo[prev.undo.length - 1];
      return {
        ...prev,
        entries: [...previous.entries],
        notes: cloneNotes(previous.notes),
        undo: prev.undo.slice(0, -1),
        redo: [...prev.redo, current]
      };
    });
  };

  const redo = () => {
    setSession((prev) => {
      if (!prev || prev.redo.length === 0) {
        return prev;
      }
      const current = snapshotOf(prev);
      const next = prev.redo[prev.redo.length - 1];
      return {
        ...prev,
        entries: [...next.entries],
        notes: cloneNotes(next.notes),
        undo: [...prev.undo, current],
        redo: prev.redo.slice(0, -1)
      };
    });
  };

  const startNew = (difficulty: Difficulty, index = 0) => {
    setSession(createSession(difficulty, index));
    setScreen('play');
  };

  const backToStart = () => {
    setSession(null);
    setScreen('start');
  };

  if (screen === 'start') {
    return (
      <main className="app-shell">
        <section className="card start-card">
          <h1>Sudoku</h1>
          <p>Choose a mode to start a new game.</p>
          <div className="start-actions">
            <button onClick={() => startNew('easy')}>Easy</button>
            <button onClick={() => startNew('medium')}>Medium</button>
            <button onClick={() => startNew('hard')}>Hard</button>
          </div>
        </section>
      </main>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <main className="app-shell">
      <section className="card game-card">
        <header className="game-header">
          <h1>Sudoku</h1>
          <div className="meta">
            <span className="pill">{session.difficulty.toUpperCase()}</span>
            <span className="pill">{formatTime(session.elapsedSeconds)}</span>
          </div>
        </header>

        <div className="board">
          {session.entries.map((value, index) => {
            const given = session.givens[index];
            const selected = index === session.selected;
            const conflicting = conflicts.has(index);
            const notes = session.notes[index];
            const col = index % 9;
            const row = Math.floor(index / 9);

            return (
              <button
                key={index}
                className={[
                  'cell',
                  given ? 'given' : '',
                  selected ? 'selected' : '',
                  conflicting ? 'conflict' : '',
                  col % 3 === 0 ? 'box-left' : '',
                  row % 3 === 0 ? 'box-top' : ''
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setSession((prev) => (prev ? { ...prev, selected: index } : prev))}
                type="button"
              >
                {value ? <span>{value}</span> : <small>{notes.join(' ')}</small>}
              </button>
            );
          })}
        </div>

        <div className="controls">
          <button onClick={() => setSession((prev) => (prev ? { ...prev, notesMode: !prev.notesMode } : prev))}>
            Notes: {session.notesMode ? 'On' : 'Off'}
          </button>
          <button disabled={session.undo.length === 0} onClick={undo}>
            Undo
          </button>
          <button disabled={session.redo.length === 0} onClick={redo}>
            Redo
          </button>
          <button onClick={clearCell}>Erase</button>
          <button onClick={backToStart}>Back</button>
        </div>

        <div className="digit-pad">
          {Array.from({ length: 9 }, (_, i) => i + 1).map((digit) => (
            <button key={digit} onClick={() => applyNumber(digit)}>
              {digit}
            </button>
          ))}
        </div>
      </section>

      {screen === 'won' && (
        <section className="win-modal">
          <div className="card win-card">
            <h2>Puzzle complete</h2>
            <p>Time: {formatTime(session.elapsedSeconds)}</p>
            <div className="start-actions">
              <button onClick={backToStart}>Back to start</button>
              <button onClick={() => startNew(session.difficulty, session.puzzleIndex + 1)}>Next puzzle</button>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

export default App;
