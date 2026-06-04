/* Sudoku — browser port of the original Python/tkinter game.
 *
 * Puzzle logic mirrors sudoku.py: a backtracking solver, a randomized
 * full-solution builder, and a generator that only keeps a hole if the
 * puzzle stays uniquely solvable.
 */

const N = 9;     // grid size
const BOX = 3;   // sub-box size

// How many cells to remove for each difficulty (out of 81).
const DIFFICULTY = { Easy: 40, Medium: 50, Hard: 56 };

// ---------------------------------------------------------------------------
// Puzzle logic (pure functions on a 9x9 array-of-arrays; 0 means empty)
// ---------------------------------------------------------------------------
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function candidates(board, row, col) {
  const used = new Set();
  for (let i = 0; i < N; i++) {
    used.add(board[row][i]);
    used.add(board[i][col]);
  }
  const br = BOX * Math.floor(row / BOX);
  const bc = BOX * Math.floor(col / BOX);
  for (let r = br; r < br + BOX; r++) {
    for (let c = bc; c < bc + BOX; c++) {
      used.add(board[r][c]);
    }
  }
  const out = [];
  for (let d = 1; d <= 9; d++) if (!used.has(d)) out.push(d);
  return out;
}

function findEmpty(board) {
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (board[r][c] === 0) return [r, c];
    }
  }
  return null;
}

/* Backtracking solver.
 * countOnly=true returns the number of solutions (capped at 2, enough to
 * test uniqueness). Otherwise solves in place and returns true/false. */
function solve(board, countOnly = false) {
  const spot = findEmpty(board);
  if (spot === null) return countOnly ? 1 : true;
  const [row, col] = spot;
  const cands = shuffle(candidates(board, row, col));
  let total = 0;
  for (const d of cands) {
    board[row][col] = d;
    if (countOnly) {
      total += solve(board, true);
      if (total >= 2) {            // not unique; stop early
        board[row][col] = 0;
        return total;
      }
    } else if (solve(board)) {
      return true;
    }
    board[row][col] = 0;
  }
  return countOnly ? total : false;
}

function fullSolution() {
  const board = Array.from({ length: N }, () => new Array(N).fill(0));
  solve(board);
  return board;
}

const copy = (board) => board.map((row) => row.slice());

/* Return { puzzle, solution } for the given difficulty.
 * The puzzle is guaranteed to have exactly one solution. */
function generate(difficulty) {
  const solution = fullSolution();
  const puzzle = copy(solution);
  const holes = DIFFICULTY[difficulty];

  const cells = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) cells.push([r, c]);
  shuffle(cells);

  let removed = 0;
  for (const [r, c] of cells) {
    if (removed >= holes) break;
    const saved = puzzle[r][c];
    puzzle[r][c] = 0;
    // Keep the hole only if the puzzle stays uniquely solvable.
    if (solve(copy(puzzle), true) === 1) {
      removed += 1;
    } else {
      puzzle[r][c] = saved;
    }
  }
  return { puzzle, solution };
}

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------
const gridEl = document.getElementById("grid");
const statusEl = document.getElementById("status");
const padEl = document.getElementById("pad");
const difficultyEl = document.getElementById("difficulty");

let puzzle = null;
let solution = null;
let given = null;            // boolean[r][c] — locked given cells
let values = null;           // current entries, 0 = empty
let selected = null;         // [r, c] or null
let cellEls = [];            // flat array of 81 cell elements

function buildGrid() {
  gridEl.innerHTML = "";
  cellEls = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.r = r;
      cell.dataset.c = c;
      cell.addEventListener("click", () => selectCell(r, c));
      gridEl.appendChild(cell);
      cellEls.push(cell);
    }
  }
}

function buildPad() {
  padEl.innerHTML = "";
  for (let d = 1; d <= 9; d++) {
    const b = document.createElement("button");
    b.textContent = String(d);
    b.addEventListener("click", () => enterDigit(d));
    padEl.appendChild(b);
  }
  const erase = document.createElement("button");
  erase.textContent = "⌫";
  erase.title = "Clear cell";
  erase.addEventListener("click", () => enterDigit(0));
  padEl.appendChild(erase);
}

const idx = (r, c) => r * N + c;

function newGame() {
  setStatus("Generating puzzle…");
  // Let the status paint before the (synchronous) generator runs.
  setTimeout(() => {
    const result = generate(difficultyEl.value);
    puzzle = result.puzzle;
    solution = result.solution;
    given = puzzle.map((row) => row.map((v) => v !== 0));
    values = copy(puzzle);
    selected = null;
    render();
    setStatus("");
  }, 10);
}

function selectCell(r, c) {
  selected = [r, c];
  render();
}

function enterDigit(d) {
  if (!selected) return;
  const [r, c] = selected;
  if (given[r][c]) return;           // given cells are locked
  values[r][c] = d;                  // d === 0 clears
  render();
  if (isComplete()) check();
}

function isComplete() {
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++) if (values[r][c] === 0) return false;
  return true;
}

function render() {
  const selVal = selected ? values[selected[0]][selected[1]] : 0;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const el = cellEls[idx(r, c)];
      const v = values[r][c];
      el.textContent = v === 0 ? "" : String(v);
      el.className = "cell";
      if (given[r][c]) el.classList.add("given");

      if (selected) {
        const [sr, sc] = selected;
        if (sr === r && sc === c) el.classList.add("selected");
        else if (
          sr === r || sc === c ||
          (Math.floor(sr / BOX) === Math.floor(r / BOX) &&
            Math.floor(sc / BOX) === Math.floor(c / BOX))
        ) {
          el.classList.add("peer");
        }
        // highlight matching numbers
        if (v !== 0 && v === selVal && !(sr === r && sc === c)) {
          el.classList.add("same");
        }
      }
    }
  }
}

function setStatus(msg, kind = "") {
  statusEl.textContent = msg;
  statusEl.className = "status" + (kind ? " " + kind : "");
}

function check() {
  let wrong = 0;
  let empty = 0;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const el = cellEls[idx(r, c)];
      el.classList.remove("wrong");
      if (given[r][c]) continue;
      if (values[r][c] === 0) {
        empty += 1;
      } else if (values[r][c] !== solution[r][c]) {
        wrong += 1;
        el.classList.add("wrong");
      }
    }
  }
  if (wrong === 0 && empty === 0) {
    setStatus("Solved! Nicely done. 🎉", "good");
  } else if (wrong) {
    setStatus(`${wrong} cell(s) are wrong (shown in red).`, "bad");
  } else {
    setStatus(`So far so good — ${empty} cell(s) left.`);
  }
}

function revealSolution() {
  if (!confirm("Reveal the full solution?")) return;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      values[r][c] = solution[r][c];
    }
  }
  render();
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (!given[r][c]) cellEls[idx(r, c)].classList.add("revealed");
    }
  }
  setStatus("Solution revealed.");
}

// keyboard input
document.addEventListener("keydown", (e) => {
  if (!selected) return;
  if (e.key >= "1" && e.key <= "9") {
    enterDigit(Number(e.key));
    e.preventDefault();
  } else if (e.key === "0" || e.key === "Backspace" || e.key === "Delete") {
    enterDigit(0);
    e.preventDefault();
  } else if (e.key.startsWith("Arrow")) {
    let [r, c] = selected;
    if (e.key === "ArrowUp") r = (r + N - 1) % N;
    if (e.key === "ArrowDown") r = (r + 1) % N;
    if (e.key === "ArrowLeft") c = (c + N - 1) % N;
    if (e.key === "ArrowRight") c = (c + 1) % N;
    selectCell(r, c);
    e.preventDefault();
  }
});

document.getElementById("new-game").addEventListener("click", newGame);
document.getElementById("check").addEventListener("click", check);
document.getElementById("solve").addEventListener("click", revealSolution);

buildGrid();
buildPad();
newGame();
