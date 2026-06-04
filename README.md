# Sudoku

A simple Sudoku game with a desktop GUI, written in pure Python using
`tkinter` (no third-party dependencies).

![grid](https://img.shields.io/badge/python-3.8%2B-blue)

## Features

- Random puzzle generator with **Easy / Medium / Hard** difficulty
- Every generated puzzle is guaranteed to have **exactly one solution**
- Click a cell and type `1`–`9` to fill it in
- **Check** highlights wrong entries in red and tells you how many cells remain
- **Solve** reveals the full solution
- Given (starting) numbers are locked and can't be edited

## Requirements

- Python 3.8 or newer (`tkinter` ships with the standard CPython installer)

## Run

```bash
python sudoku.py
```

## How to play

1. Pick a difficulty from the dropdown and press **New Game**.
2. Click an empty (white) cell and type a digit `1`–`9`.
3. Press **Check** at any time to validate your progress.
4. Stuck? Press **Solve** to reveal the answer.

## How it works

The puzzle is built by generating a complete, valid board via randomized
backtracking, then removing cells one at a time — only keeping a removal if
the puzzle still solves uniquely. See `sudoku.py` for the details.

## License

MIT
