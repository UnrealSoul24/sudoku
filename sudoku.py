"""A simple Sudoku game with a tkinter GUI.

Generates a random, uniquely-solvable puzzle at three difficulty levels,
lets you fill cells, checks your work, and can reveal the solution.
"""

import random
import tkinter as tk
from tkinter import messagebox

N = 9          # grid size
BOX = 3        # sub-box size

# How many cells to remove for each difficulty (out of 81).
DIFFICULTY = {"Easy": 40, "Medium": 50, "Hard": 56}


# --------------------------------------------------------------------------- #
# Puzzle logic (pure functions on a 9x9 list-of-lists; 0 means empty)
# --------------------------------------------------------------------------- #
def _candidates(board, row, col):
    """Return the set of digits that may legally go in (row, col)."""
    used = set()
    for i in range(N):
        used.add(board[row][i])
        used.add(board[i][col])
    br, bc = BOX * (row // BOX), BOX * (col // BOX)
    for r in range(br, br + BOX):
        for c in range(bc, bc + BOX):
            used.add(board[r][c])
    return [d for d in range(1, 10) if d not in used]


def _find_empty(board):
    for r in range(N):
        for c in range(N):
            if board[r][c] == 0:
                return r, c
    return None


def _solve(board, count_only=False):
    """Backtracking solver.

    If count_only is True, returns the number of solutions (capped at 2,
    which is enough to test uniqueness). Otherwise solves in place and
    returns True/False.
    """
    spot = _find_empty(board)
    if spot is None:
        return 1 if count_only else True
    row, col = spot
    cands = _candidates(board, row, col)
    random.shuffle(cands)
    total = 0
    for d in cands:
        board[row][col] = d
        if count_only:
            total += _solve(board, count_only=True)
            if total >= 2:          # not unique; stop early
                board[row][col] = 0
                return total
        elif _solve(board):
            return True
        board[row][col] = 0
    return total if count_only else False


def _full_solution():
    """Build a complete, valid, randomized solved board."""
    board = [[0] * N for _ in range(N)]
    _solve(board)
    return board


def generate(difficulty):
    """Return (puzzle, solution) for the given difficulty.

    The puzzle is guaranteed to have exactly one solution.
    """
    solution = _full_solution()
    puzzle = [row[:] for row in solution]
    holes = DIFFICULTY[difficulty]

    cells = [(r, c) for r in range(N) for c in range(N)]
    random.shuffle(cells)
    removed = 0
    for r, c in cells:
        if removed >= holes:
            break
        saved = puzzle[r][c]
        puzzle[r][c] = 0
        # Keep the hole only if the puzzle stays uniquely solvable.
        if _solve([row[:] for row in puzzle], count_only=True) == 1:
            removed += 1
        else:
            puzzle[r][c] = saved
    return puzzle, solution


# --------------------------------------------------------------------------- #
# GUI
# --------------------------------------------------------------------------- #
class SudokuApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Sudoku")
        self.root.resizable(False, False)

        self.difficulty = tk.StringVar(value="Easy")
        self.cells = {}          # (r, c) -> Entry
        self.given = set()       # cells that are part of the puzzle (locked)
        self.puzzle = None
        self.solution = None

        self._build_controls()
        self._build_grid()
        self.new_game()

    def _build_controls(self):
        bar = tk.Frame(self.root, padx=8, pady=8)
        bar.grid(row=0, column=0)

        tk.OptionMenu(bar, self.difficulty, *DIFFICULTY).pack(side="left")
        tk.Button(bar, text="New Game", command=self.new_game).pack(side="left", padx=4)
        tk.Button(bar, text="Check", command=self.check).pack(side="left", padx=4)
        tk.Button(bar, text="Solve", command=self.solve).pack(side="left", padx=4)

    def _build_grid(self):
        outer = tk.Frame(self.root, bg="black", padx=2, pady=2)
        outer.grid(row=1, column=0, padx=8, pady=(0, 8))

        # 3x3 frame of boxes, each holding a 3x3 grid of entries — this
        # gives us the thick borders between boxes for free.
        for box_r in range(BOX):
            for box_c in range(BOX):
                box = tk.Frame(outer, bg="black", padx=1, pady=1)
                box.grid(row=box_r, column=box_c, padx=1, pady=1)
                for ir in range(BOX):
                    for ic in range(BOX):
                        r, c = box_r * BOX + ir, box_c * BOX + ic
                        e = tk.Entry(
                            box, width=2, font=("Helvetica", 20),
                            justify="center", relief="flat",
                        )
                        e.grid(row=ir, column=ic, padx=1, pady=1)
                        e.bind("<KeyRelease>", lambda ev, rc=(r, c): self._on_key(rc))
                        self.cells[(r, c)] = e

    # -- game actions ------------------------------------------------------- #
    def new_game(self):
        self.puzzle, self.solution = generate(self.difficulty.get())
        self.given.clear()
        for (r, c), e in self.cells.items():
            e.config(state="normal")
            e.delete(0, "end")
            val = self.puzzle[r][c]
            if val:
                e.insert(0, str(val))
                e.config(state="disabled", disabledforeground="black",
                         disabledbackground="#eaeaea")
                self.given.add((r, c))
            else:
                e.config(fg="#1a4fd6", bg="white")

    def _on_key(self, rc):
        """Sanitize input: keep only a single digit 1-9."""
        e = self.cells[rc]
        text = e.get()
        cleaned = "".join(ch for ch in text if ch in "123456789")[-1:]
        if cleaned != text:
            e.delete(0, "end")
            if cleaned:
                e.insert(0, cleaned)
        e.config(fg="#1a4fd6")

    def _current_board(self):
        board = [[0] * N for _ in range(N)]
        for (r, c), e in self.cells.items():
            v = e.get()
            board[r][c] = int(v) if v.isdigit() else 0
        return board

    def check(self):
        board = self._current_board()
        wrong, empty = 0, 0
        for (r, c), e in self.cells.items():
            if (r, c) in self.given:
                continue
            if board[r][c] == 0:
                empty += 1
            elif board[r][c] != self.solution[r][c]:
                wrong += 1
                e.config(fg="#d62828")

        if wrong == 0 and empty == 0:
            messagebox.showinfo("Sudoku", "Solved! Nicely done. 🎉")
        elif wrong:
            messagebox.showwarning(
                "Sudoku", f"{wrong} cell(s) are wrong (shown in red).")
        else:
            messagebox.showinfo("Sudoku", f"So far so good — {empty} cell(s) left.")

    def solve(self):
        if not messagebox.askyesno("Sudoku", "Reveal the full solution?"):
            return
        for (r, c), e in self.cells.items():
            if (r, c) in self.given:
                continue
            e.config(state="normal")
            e.delete(0, "end")
            e.insert(0, str(self.solution[r][c]))
            e.config(fg="#777777")


def main():
    root = tk.Tk()
    SudokuApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
