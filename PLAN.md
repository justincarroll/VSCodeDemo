# Sudoku Web App Plan

## Product Goals
- Build a web Sudoku game with `Easy`, `Medium`, and `Hard` modes.
- `Hard` should target very difficult (diabolical-style) puzzles.
- No hints.
- "Show mistakes" is always off.
- Include notes and undo/redo so mistakes are recoverable.
- Simple flow: start screen -> choose difficulty -> play -> win modal with options.

## Technical Constraints
- Use a well-known open-source Sudoku engine with permissive licensing.
- Prebuild puzzle packs (no runtime puzzle sharing, no seed links in v1).
- Keep implementation web-standard and maintainable.

## Execution Steps
1. Scaffold Vite + React + TypeScript project structure.
2. Add engine dependency and generation scripts for prebuilt packs.
3. Generate and store puzzle packs for each difficulty.
4. Implement Sudoku state model (givens, entries, notes, selection).
5. Implement input UX (keyboard, notes mode, erasing).
6. Implement undo/redo history.
7. Implement validation/conflict highlighting (without hinting correctness).
8. Implement start screen and mode selection flow.
9. Implement gameplay screen with timer and controls.
10. Implement win detection and post-win actions (back/start, next same difficulty).
11. Add local persistence for in-progress game.
12. Smoke-test build and summarize results.

## Definition of Done
- App starts and runs locally.
- User can choose difficulty and play from prebuilt puzzles.
- Notes, undo/redo, and win flow all work.
- No hint feature exists.
- Puzzle packs are prebuilt and loaded by difficulty.
