/**
 * Connect 4 Engine & SVG Renderer for GitHub Profile
 * Nour Salous - Portfolio Automation
 */

const fs = require('fs');
const path = require('path');

const ROWS = 6;
const COLS = 7;
const STATE_FILE = path.join(__dirname, '..', '..', 'state', 'connect4.json');
const BOARD_SVG_FILE = path.join(__dirname, '..', '..', 'assets', 'connect4_board.svg');

function getEmptyBoard() {
  const b = [];
  for (let r = 0; r < ROWS; r++) {
    b.push(new Array(COLS).fill(0));
  }
  return b;
}

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error loading state:', e);
  }
  return {
    board: getEmptyBoard(),
    turn: 1, // 1 = human (cyan), 2 = AI (magenta/violet)
    status: 'in_progress',
    winner: null,
    winningLine: null,
    lastMove: null,
    lastPlayer: null,
    stats: { gamesPlayed: 0, humanWins: 0, aiWins: 0, draws: 0 }
  };
}

function saveState(state) {
  const dir = path.dirname(STATE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

function dropPiece(board, col, player) {
  if (col < 0 || col >= COLS) return -1;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === 0) {
      board[r][col] = player;
      return r;
    }
  }
  return -1; // column full
}

function checkWin(board) {
  // Horizontal
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      const p = board[r][c];
      if (p !== 0 && p === board[r][c + 1] && p === board[r][c + 2] && p === board[r][c + 3]) {
        return { winner: p, line: [[r, c], [r, c + 1], [r, c + 2], [r, c + 3]] };
      }
    }
  }

  // Vertical
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r <= ROWS - 4; r++) {
      const p = board[r][c];
      if (p !== 0 && p === board[r + 1][c] && p === board[r + 2][c] && p === board[r + 3][c]) {
        return { winner: p, line: [[r, c], [r + 1, c], [r + 2, c], [r + 3, c]] };
      }
    }
  }

  // Diagonal Down-Right (\)
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      const p = board[r][c];
      if (p !== 0 && p === board[r + 1][c + 1] && p === board[r + 2][c + 2] && p === board[r + 3][c + 3]) {
        return { winner: p, line: [[r, c], [r + 1, c + 1], [r + 2, c + 2], [r + 3, c + 3]] };
      }
    }
  }

  // Diagonal Down-Left (/)
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 3; c < COLS; c++) {
      const p = board[r][c];
      if (p !== 0 && p === board[r + 1][c - 1] && p === board[r + 2][c - 2] && p === board[r + 3][c - 3]) {
        return { winner: p, line: [[r, c], [r + 1, c - 1], [r + 2, c - 2], [r + 3, c - 3]] };
      }
    }
  }

  // Draw check
  const isFull = board.every(row => row.every(cell => cell !== 0));
  if (isFull) {
    return { winner: 'draw', line: null };
  }

  return null;
}

function cloneBoard(board) {
  return board.map(row => [...row]);
}

function getAvailableCols(board) {
  const cols = [];
  for (let c = 0; c < COLS; c++) {
    if (board[0][c] === 0) cols.push(c);
  }
  return cols;
}

function computeAIMove(board) {
  const available = getAvailableCols(board);
  if (available.length === 0) return -1;

  // 1. Can AI (2) win immediately?
  for (const c of available) {
    const copy = cloneBoard(board);
    dropPiece(copy, c, 2);
    const win = checkWin(copy);
    if (win && win.winner === 2) return c;
  }

  // 2. Can Human (1) win immediately? Block them!
  for (const c of available) {
    const copy = cloneBoard(board);
    dropPiece(copy, c, 1);
    const win = checkWin(copy);
    if (win && win.winner === 1) return c;
  }

  // 3. Avoid dropping into a col that directly gives the human an immediate winning slot right above
  const safeCols = available.filter(c => {
    const copy = cloneBoard(board);
    const r = dropPiece(copy, c, 2);
    if (r > 0) {
      // simulate human dropping in the cell above
      copy[r - 1][c] = 1;
      const hWin = checkWin(copy);
      if (hWin && hWin.winner === 1) return false;
    }
    return true;
  });

  const candidates = safeCols.length > 0 ? safeCols : available;

  // 4. Center-priority ordering: col 3 is best, then 2, 4, then 1, 5, then 0, 6
  const preference = [3, 2, 4, 1, 5, 0, 6];
  for (const p of preference) {
    if (candidates.includes(p)) return p;
  }

  return candidates[Math.floor(Math.random() * candidates.length)];
}

function renderBoardSVG(state) {
  const board = state.board;
  const status = state.status;
  const winner = state.winner;
  const winLine = state.winningLine;

  const width = 850;
  const height = 530;

  // Grid offsets
  const startX = 145;
  const startY = 145;
  const slotSpacing = 80;
  const radius = 27;

  let statusText = "YOUR TURN · CLICK A COLUMN TO DROP (CYAN)";
  let statusColor = "#00f0ff";

  if (status === 'finished') {
    if (winner === 1) {
      statusText = "VICTORY! HUMAN WON (CYAN)! RESET TO PLAY AGAIN";
      statusColor = "#00ffa3";
    } else if (winner === 2) {
      statusText = "GAME OVER · CYBER AI BOT WON! RESET TO RETRY";
      statusColor = "#ff2bd6";
    } else if (winner === 'draw') {
      statusText = "STALEMATE · DRAW GAME! RESET TO PLAY AGAIN";
      statusColor = "#ffd166";
    }
  }

  // Winning line coordinates if exists
  let laserLineSVG = '';
  if (winLine && winLine.length === 4) {
    const x1 = startX + winLine[0][1] * slotSpacing;
    const y1 = startY + winLine[0][0] * slotSpacing;
    const x2 = startX + winLine[3][1] * slotSpacing;
    const y2 = startY + winLine[3][0] * slotSpacing;
    laserLineSVG = `
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#ffd166" stroke-width="6" stroke-linecap="round" filter="url(#glowStrong)">
        <animate attributeName="stroke-width" values="4; 8; 4" dur="1s" repeatCount="indefinite" />
      </line>
    `;
  }

  // Generate slots
  let slotsSVG = '';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cx = startX + c * slotSpacing;
      const cy = startY + r * slotSpacing;
      const val = board[r][c];

      const isWinningSlot = winLine && winLine.some(([wr, wc]) => wr === r && wc === c);

      if (val === 0) {
        // Empty slot
        slotsSVG += `
          <circle cx="${cx}" cy="${cy}" r="${radius}" fill="#080c18" stroke="#17223b" stroke-width="2" />
        `;
      } else if (val === 1) {
        // Human (Cyan)
        const glowAttr = isWinningSlot ? 'filter="url(#glowStrong)"' : 'filter="url(#glow)"';
        slotsSVG += `
          <circle cx="${cx}" cy="${cy}" r="${radius}" fill="url(#discCyan)" stroke="#38bdf8" stroke-width="1.5" ${glowAttr} />
          <circle cx="${cx}" cy="${cy}" r="${radius * 0.65}" fill="none" stroke="#e0f2fe" stroke-width="1" opacity="0.6" />
        `;
        if (isWinningSlot) {
          slotsSVG += `
            <circle cx="${cx}" cy="${cy}" r="${radius + 4}" fill="none" stroke="#ffd166" stroke-width="2.5">
              <animate attributeName="r" values="${radius + 2}; ${radius + 6}; ${radius + 2}" dur="1.2s" repeatCount="indefinite" />
            </circle>
          `;
        }
      } else if (val === 2) {
        // AI (Neon Pink / Violet)
        const glowAttr = isWinningSlot ? 'filter="url(#glowStrong)"' : 'filter="url(#glow)"';
        slotsSVG += `
          <circle cx="${cx}" cy="${cy}" r="${radius}" fill="url(#discPurp)" stroke="#f472b6" stroke-width="1.5" ${glowAttr} />
          <circle cx="${cx}" cy="${cy}" r="${radius * 0.65}" fill="none" stroke="#fce7f3" stroke-width="1" opacity="0.6" />
        `;
        if (isWinningSlot) {
          slotsSVG += `
            <circle cx="${cx}" cy="${cy}" r="${radius + 4}" fill="none" stroke="#ffd166" stroke-width="2.5">
              <animate attributeName="r" values="${radius + 2}; ${radius + 6}; ${radius + 2}" dur="1.2s" repeatCount="indefinite" />
            </circle>
          `;
        }
      }
    }
  }

  // Column numbers at top
  let colHeadersSVG = '';
  for (let c = 0; c < COLS; c++) {
    const cx = startX + c * slotSpacing;
    const isColFull = board[0][c] !== 0;
    const colColor = isColFull ? '#475569' : '#00f0ff';
    colHeadersSVG += `
      <g transform="translate(${cx}, 92)">
        <circle cx="0" cy="0" r="14" fill="#0c1427" stroke="${colColor}" stroke-width="1.5" />
        <text x="0" y="4" font-family="'Orbitron', sans-serif" font-weight="700" font-size="11" fill="${colColor}" text-anchor="middle">${c + 1}</text>
        <path d="M -3 18 L 0 22 L 3 18" fill="none" stroke="${colColor}" stroke-width="1.5" opacity="0.8" />
      </g>
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#050811" />
      <stop offset="50%" stop-color="#090f20" />
      <stop offset="100%" stop-color="#050811" />
    </linearGradient>

    <linearGradient id="boardFrame" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0e172e" />
      <stop offset="100%" stop-color="#0a1021" />
    </linearGradient>

    <linearGradient id="boardBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00f0ff" />
      <stop offset="50%" stop-color="#a855f7" />
      <stop offset="100%" stop-color="#ff2bd6" />
    </linearGradient>

    <radialGradient id="discCyan" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#67e8f9" />
      <stop offset="40%" stop-color="#00f0ff" />
      <stop offset="100%" stop-color="#0369a1" />
    </radialGradient>

    <radialGradient id="discPurp" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#f472b6" />
      <stop offset="40%" stop-color="#ff2bd6" />
      <stop offset="100%" stop-color="#7e22ce" />
    </radialGradient>

    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3.5" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    <filter id="glowStrong" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    <pattern id="gridPattern" width="30" height="30" patternUnits="userSpaceOnUse">
      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#38bdf8" stroke-opacity="0.04" />
    </pattern>
  </defs>

  <!-- Outer background -->
  <rect width="100%" height="100%" fill="url(#bg)" rx="18" />
  <rect width="100%" height="100%" fill="url(#gridPattern)" rx="18" />

  <!-- Header Section -->
  <text x="425" y="36" font-family="'Orbitron', sans-serif" font-weight="900" font-size="20" fill="#f8fafc" text-anchor="middle" letter-spacing="3">
    CYBER CONNECT 4 · NOUR vs COMMUNITY
  </text>
  
  <text x="425" y="60" font-family="'JetBrains Mono', monospace" font-weight="600" font-size="12" fill="${statusColor}" text-anchor="middle" letter-spacing="1.5">
    ◆ ${statusText} ◆
  </text>

  <!-- Column Selector Arrows -->
  ${colHeadersSVG}

  <!-- Connect 4 Board Plate -->
  <rect x="95" y="115" width="660" height="365" rx="18" fill="url(#boardFrame)" stroke="#1e293b" stroke-width="2" />
  <rect x="95" y="115" width="660" height="365" rx="18" fill="none" stroke="url(#boardBorder)" stroke-width="2" stroke-dasharray="140 1600" opacity="0.8" filter="url(#glow)">
    <animate attributeName="stroke-dashoffset" values="1740; 0" dur="9s" repeatCount="indefinite" />
  </rect>

  <!-- Slots -->
  ${slotsSVG}

  <!-- Laser winning line if won -->
  ${laserLineSVG}

  <!-- Footer Stats & Legend -->
  <g transform="translate(110, 508)">
    <circle cx="10" cy="-6" r="6" fill="#00f0ff" filter="url(#glow)" />
    <text x="24" y="-2" font-family="'Inter', sans-serif" font-size="11.5" font-weight="600" fill="#94a3b8">You (Human): <tspan fill="#f8fafc" font-weight="700">${state.stats.humanWins} Wins</tspan></text>

    <circle cx="210" cy="-6" r="6" fill="#ff2bd6" filter="url(#glow)" />
    <text x="224" y="-2" font-family="'Inter', sans-serif" font-size="11.5" font-weight="600" fill="#94a3b8">AI Bot: <tspan fill="#f8fafc" font-weight="700">${state.stats.aiWins} Wins</tspan></text>

    <text x="400" y="-2" font-family="'Inter', sans-serif" font-size="11.5" font-weight="600" fill="#94a3b8">Draws: <tspan fill="#f8fafc" font-weight="700">${state.stats.draws}</tspan></text>
    <text x="540" y="-2" font-family="'Orbitron', sans-serif" font-size="10" font-weight="700" fill="#38bdf8">CLICK A COLUMN LINK BELOW TO PLAY!</text>
  </g>
</svg>`;

  fs.writeFileSync(BOARD_SVG_FILE, svg, 'utf8');
}

function handleAction(action, col = null, username = 'Visitor') {
  const state = loadState();

  if (action === 'reset') {
    state.board = getEmptyBoard();
    state.status = 'in_progress';
    state.winner = null;
    state.winningLine = null;
    state.lastMove = null;
    state.lastPlayer = null;
    state.turn = 1;
    state.stats.gamesPlayed++;

    saveState(state);
    renderBoardSVG(state);
    return {
      success: true,
      message: `🔄 Connect 4 board has been reset by @${username}! New game started. Your turn (Cyan)!`
    };
  }

  if (action === 'drop') {
    if (state.status === 'finished') {
      return {
        success: false,
        message: `⚠️ Game is already completed (Winner: ${state.winner === 1 ? 'Human' : state.winner === 2 ? 'AI Bot' : 'Draw'})! Please click **Reset Game** to start a new match.`
      };
    }

    const colIndex = parseInt(col, 10) - 1; // 1-indexed to 0-indexed
    if (isNaN(colIndex) || colIndex < 0 || colIndex >= COLS) {
      return {
        success: false,
        message: `⚠️ Invalid column: ${col}. Must be between 1 and 7.`
      };
    }

    // Drop player's piece (1)
    const row = dropPiece(state.board, colIndex, 1);
    if (row === -1) {
      return {
        success: false,
        message: `⚠️ Column ${col} is already full! Please choose another column.`
      };
    }

    state.lastMove = { col: colIndex + 1, row: row + 1, player: 1, user: username };
    state.lastPlayer = username;

    // Check if human won
    const winHuman = checkWin(state.board);
    if (winHuman) {
      state.status = 'finished';
      state.winner = winHuman.winner;
      state.winningLine = winHuman.line;
      if (winHuman.winner === 1) state.stats.humanWins++;
      else if (winHuman.winner === 'draw') state.stats.draws++;

      saveState(state);
      renderBoardSVG(state);

      return {
        success: true,
        message: winHuman.winner === 1
          ? `🎉 **CONNECT FOUR!** Congratulations @${username}, you defeated the AI Bot! 🏆\n\nClick **Reset Game** in the README to start a rematch!`
          : `🤝 **STALEMATE!** The board is completely full. Draw game! Click **Reset Game** to play again.`
      };
    }

    // AI's Turn
    const aiCol = computeAIMove(state.board);
    if (aiCol !== -1) {
      const aiRow = dropPiece(state.board, aiCol, 2);
      const winAI = checkWin(state.board);

      if (winAI) {
        state.status = 'finished';
        state.winner = winAI.winner;
        state.winningLine = winAI.line;
        if (winAI.winner === 2) state.stats.aiWins++;
        else if (winAI.winner === 'draw') state.stats.draws++;

        saveState(state);
        renderBoardSVG(state);

        return {
          success: true,
          message: winAI.winner === 2
            ? `👾 **AI BOT VICTORY!** The Cyber AI dropped a piece in Column ${aiCol + 1} and scored 4-in-a-row! Better luck next time.\n\nClick **Reset Game** in the README to try again!`
            : `🤝 **STALEMATE!** The board is full. Draw game! Click **Reset Game** to play again.`
        };
      }

      state.lastMove = { col: aiCol + 1, row: aiRow + 1, player: 2, user: 'CyberBot' };
      saveState(state);
      renderBoardSVG(state);

      return {
        success: true,
        message: `✅ @${username} dropped in **Column ${col}**.\n🤖 CyberBot responded with a drop in **Column ${aiCol + 1}**.\n\n👉 **It is your turn!** Choose a column (1–7) to drop your next disc.`
      };
    }
  }

  saveState(state);
  renderBoardSVG(state);
  return { success: true, message: 'Board updated.' };
}

// CLI parsing
function main() {
  const args = process.argv.slice(2);
  let title = '';
  let username = 'Visitor';
  let action = '';
  let col = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--title' && args[i + 1]) {
      title = args[i + 1];
      i++;
    } else if (args[i] === '--user' && args[i + 1]) {
      username = args[i + 1];
      i++;
    } else if (args[i] === '--action' && args[i + 1]) {
      action = args[i + 1];
      i++;
    } else if (args[i] === '--col' && args[i + 1]) {
      col = args[i + 1];
      i++;
    }
  }

  if (title) {
    // Expected format: connect4|drop|3 or connect4|reset
    const parts = title.trim().split('|');
    if (parts[0] === 'connect4') {
      action = parts[1];
      if (action === 'drop') col = parts[2];
    }
  }

  if (!action) {
    // If no action, just render the current board
    const state = loadState();
    renderBoardSVG(state);
    console.log('Connect 4 board SVG rendered.');
    return;
  }

  const result = handleAction(action, col, username);
  console.log(result.message);

  // If in GitHub Actions, set step output
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `message=${encodeURIComponent(result.message)}\n`);
  }
}

if (require.main === module) {
  main();
}

module.exports = { handleAction, loadState, saveState, renderBoardSVG };
