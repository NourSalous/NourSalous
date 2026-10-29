/**
 * Community Connect Four Engine & SVG Renderer for GitHub Profile
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
    turn: 1, // 1 = human (cyan), 2 = AI (violet)
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

  // 3. Avoid giving the opponent an immediate winning slot right above
  const safeCols = available.filter(c => {
    const copy = cloneBoard(board);
    const r = dropPiece(copy, c, 2);
    if (r > 0) {
      copy[r - 1][c] = 1;
      const hWin = checkWin(copy);
      if (hWin && hWin.winner === 1) return false;
    }
    return true;
  });

  const candidates = safeCols.length > 0 ? safeCols : available;

  // Center column priority
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
  const lastMove = state.lastMove;

  const width = 880;
  const height = 480;

  // Grid offsets: 7 cols across, 6 rows down
  const startX = 145;
  const startY = 120;
  const slotSpacing = 98;
  const radius = 30;

  let statusText = "COMMUNITY CONNECT FOUR · YOUR MOVE (CYAN 🔴)";
  let statusSub = "Click any column (1–7) below to drop your disc!";
  let statusColor = "#00f0ff";

  if (status === 'finished') {
    if (winner === 1) {
      statusText = "🎉 VICTORY! HUMAN WON!";
      statusSub = `${state.lastPlayer ? '@' + state.lastPlayer : 'You'} scored 4-in-a-row! Reset to start a new match.`;
      statusColor = "#00ffa3";
    } else if (winner === 2) {
      statusText = "👾 CYBERBOT WON THIS MATCH!";
      statusSub = "The AI connected four. Click Reset Game below to play again!";
      statusColor = "#ff2bd6";
    } else if (winner === 'draw') {
      statusText = "🤝 STALEMATE! IT'S A DRAW!";
      statusSub = "The board is completely filled. Reset to start a rematch!";
      statusColor = "#ffd166";
    }
  } else if (lastMove) {
    statusSub = `Last move: ${lastMove.user ? '@' + lastMove.user : 'Player'} dropped in Col ${lastMove.col}. AI responded in Col ${lastMove.player === 2 ? lastMove.col : 'auto'}.`;
  }

  // Winning line coordinates if exists
  let laserLineSVG = '';
  if (winLine && winLine.length === 4) {
    const x1 = startX + winLine[0][1] * slotSpacing;
    const y1 = startY + winLine[0][0] * slotSpacing;
    const x2 = startX + winLine[3][1] * slotSpacing;
    const y2 = startY + winLine[3][0] * slotSpacing;
    laserLineSVG = `
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#ffd166" stroke-width="8" stroke-linecap="round" filter="url(#glowStrong)">
        <animate attributeName="stroke-width" values="6; 11; 6" dur="1s" repeatCount="indefinite" />
      </line>
    `;
  }

  // Generate slots
  let slotsSVG = '';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cx = startX + c * slotSpacing;
      const cy = startY + r * 56;
      const val = board[r][c];

      const isWinningSlot = winLine && winLine.some(([wr, wc]) => wr === r && wc === c);
      const isLastDrop = lastMove && (lastMove.row - 1 === r && lastMove.col - 1 === c);

      if (val === 0) {
        // Empty slot
        slotsSVG += `
          <circle cx="${cx}" cy="${cy}" r="${radius}" fill="#080c16" stroke="#1c273e" stroke-width="2" />
        `;
      } else if (val === 1) {
        // Human (Cyan)
        slotsSVG += `
          <circle cx="${cx}" cy="${cy}" r="${radius}" fill="url(#discCyan)" stroke="#38bdf8" stroke-width="1.8" filter="url(#glow)" />
          <circle cx="${cx}" cy="${cy}" r="${radius * 0.65}" fill="none" stroke="#e0f2fe" stroke-width="1.2" opacity="0.6" />
        `;
        if (isLastDrop) {
          slotsSVG += `
            <circle cx="${cx}" cy="${cy}" r="${radius + 3}" fill="none" stroke="#00f0ff" stroke-width="2" stroke-dasharray="4 4" opacity="0.8" />
          `;
        }
        if (isWinningSlot) {
          slotsSVG += `
            <circle cx="${cx}" cy="${cy}" r="${radius + 4}" fill="none" stroke="#ffd166" stroke-width="3">
              <animate attributeName="r" values="${radius + 2}; ${radius + 7}; ${radius + 2}" dur="1.2s" repeatCount="indefinite" />
            </circle>
          `;
        }
      } else if (val === 2) {
        // AI (Neon Pink / Violet)
        slotsSVG += `
          <circle cx="${cx}" cy="${cy}" r="${radius}" fill="url(#discPurp)" stroke="#f472b6" stroke-width="1.8" filter="url(#glow)" />
          <circle cx="${cx}" cy="${cy}" r="${radius * 0.65}" fill="none" stroke="#fce7f3" stroke-width="1.2" opacity="0.6" />
        `;
        if (isLastDrop) {
          slotsSVG += `
            <circle cx="${cx}" cy="${cy}" r="${radius + 3}" fill="none" stroke="#ff2bd6" stroke-width="2" stroke-dasharray="4 4" opacity="0.8" />
          `;
        }
        if (isWinningSlot) {
          slotsSVG += `
            <circle cx="${cx}" cy="${cy}" r="${radius + 4}" fill="none" stroke="#ffd166" stroke-width="3">
              <animate attributeName="r" values="${radius + 2}; ${radius + 7}; ${radius + 2}" dur="1.2s" repeatCount="indefinite" />
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
      <g transform="translate(${cx}, 72)">
        <rect x="-14" y="-12" width="28" height="24" rx="6" fill="#0d1424" stroke="${colColor}" stroke-width="1.5" />
        <text x="0" y="4" font-family="'Orbitron', sans-serif" font-weight="800" font-size="12" fill="${colColor}" text-anchor="middle">${c + 1}</text>
      </g>
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Community Connect Four: the current game">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#070a13" />
      <stop offset="50%" stop-color="#0c1224" />
      <stop offset="100%" stop-color="#070a13" />
    </linearGradient>

    <linearGradient id="cabinet" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#0b1020" />
    </linearGradient>

    <linearGradient id="laserBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00f0ff" />
      <stop offset="50%" stop-color="#a855f7" />
      <stop offset="100%" stop-color="#ff2bd6" />
    </linearGradient>

    <radialGradient id="discCyan" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#7dd3fc" />
      <stop offset="45%" stop-color="#00f0ff" />
      <stop offset="100%" stop-color="#0284c7" />
    </radialGradient>

    <radialGradient id="discPurp" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#f472b6" />
      <stop offset="45%" stop-color="#ff2bd6" />
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

    <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#38bdf8" stroke-opacity="0.04" />
    </pattern>
  </defs>

  <!-- Outer Frame -->
  <rect x="2" y="2" width="${width - 4}" height="${height - 4}" rx="18" fill="url(#bg)" stroke="#1e293b" stroke-width="2" />
  <rect x="2" y="2" width="${width - 4}" height="${height - 4}" rx="18" fill="url(#grid)" />

  <!-- Animated Laser Accent -->
  <rect x="2" y="2" width="${width - 4}" height="${height - 4}" rx="18" fill="none" stroke="url(#laserBorder)" stroke-width="2" stroke-dasharray="140 1800" opacity="0.8" filter="url(#glow)">
    <animate attributeName="stroke-dashoffset" values="1940; 0" dur="8s" repeatCount="indefinite" />
  </rect>

  <!-- Header Title -->
  <text x="440" y="32" font-family="'Orbitron', -apple-system, sans-serif" font-weight="900" font-size="17" fill="#f8fafc" text-anchor="middle" letter-spacing="3">
    🎲 COMMUNITY CONNECT FOUR
  </text>
  
  <text x="440" y="52" font-family="'JetBrains Mono', monospace" font-weight="600" font-size="12" fill="${statusColor}" text-anchor="middle" letter-spacing="1">
    ${statusText}
  </text>

  <!-- Column Selector Badges at top of grid -->
  ${colHeadersSVG}

  <!-- Board Cabinet -->
  <rect x="90" y="94" width="700" height="340" rx="16" fill="url(#cabinet)" stroke="#1e293b" stroke-width="2" />

  <!-- Slots -->
  ${slotsSVG}

  <!-- Winning Line -->
  ${laserLineSVG}

  <!-- Footer HUD -->
  <g transform="translate(105, 458)">
    <circle cx="8" cy="-5" r="5" fill="#00f0ff" filter="url(#glow)" />
    <text x="20" y="-1" font-family="'Inter', sans-serif" font-size="11.5" font-weight="600" fill="#94a3b8">You (Human): <tspan fill="#f8fafc" font-weight="700">${state.stats.humanWins} Wins</tspan></text>

    <circle cx="210" cy="-5" r="5" fill="#ff2bd6" filter="url(#glow)" />
    <text x="222" y="-1" font-family="'Inter', sans-serif" font-size="11.5" font-weight="600" fill="#94a3b8">AI Bot: <tspan fill="#f8fafc" font-weight="700">${state.stats.aiWins} Wins</tspan></text>

    <text x="390" y="-1" font-family="'Inter', sans-serif" font-size="11.5" font-weight="600" fill="#94a3b8">Draws: <tspan fill="#f8fafc" font-weight="700">${state.stats.draws}</tspan></text>

    <text x="540" y="-1" font-family="'Orbitron', sans-serif" font-size="10" font-weight="700" fill="#38bdf8">DROP A PIECE USING THE LINKS BELOW ⬇</text>
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
        message: `⚠️ Game is already completed (Winner: ${state.winner === 1 ? 'Human' : state.winner === 2 ? 'AI Bot' : 'Draw'})! Please click **Reset Game** in the README to start a new match.`
      };
    }

    const colIndex = parseInt(col, 10) - 1;
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

// CLI parsing: supports "Connect Four: drop X", "Connect Four: reset", "connect4|drop|X", "connect4|reset"
function parseTitle(title) {
  if (!title) return { action: null, col: null };
  const clean = title.trim();

  // Pattern 1: Connect Four: drop 3 or Connect Four: drop col 3
  const matchGitSkins = clean.match(/^connect\s*four:?\s*(drop|reset)\s*([0-9]?)/i);
  if (matchGitSkins) {
    const act = matchGitSkins[1].toLowerCase();
    const c = matchGitSkins[2] ? matchGitSkins[2] : null;
    return { action: act, col: c };
  }

  // Pattern 2: connect4|drop|3 or connect4|reset
  const parts = clean.split('|');
  if (parts[0].toLowerCase() === 'connect4') {
    return { action: parts[1] ? parts[1].toLowerCase() : null, col: parts[2] ? parts[2] : null };
  }

  return { action: null, col: null };
}

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
    const parsed = parseTitle(title);
    if (parsed.action) {
      action = parsed.action;
      if (parsed.col) col = parsed.col;
    }
  }

  if (!action) {
    const state = loadState();
    renderBoardSVG(state);
    console.log('Connect 4 board SVG rendered.');
    return;
  }

  const result = handleAction(action, col, username);
  console.log(result.message);

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `message=${encodeURIComponent(result.message)}\n`);
  }
}

if (require.main === module) {
  main();
}

module.exports = { handleAction, loadState, saveState, renderBoardSVG, parseTitle };
