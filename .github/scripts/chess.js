/**
 * Community Chess Engine & SVG Renderer for GitHub Profile
 * Nour Salous - Portfolio Automation
 */

const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '..', '..', 'state', 'chess.json');
const BOARD_SVG_FILE = path.join(__dirname, '..', '..', 'assets', 'chess_board.svg');
const README_FILE = path.join(__dirname, '..', '..', 'README.md');

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

// Unicode chess symbols
const GLYPHS = {
  'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
  'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
};

const PIECE_VALUES = {
  'p': 100, 'n': 320, 'b': 330, 'r': 500, 'q': 900, 'k': 20000,
  'P': 100, 'N': 320, 'B': 330, 'R': 500, 'Q': 900, 'K': 20000
};

function getInitialBoard() {
  return [
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
  ];
}

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading chess state:', e);
  }
  return {
    board: getInitialBoard(),
    turn: 'w', // 'w' (White/Human) or 'b' (Black/AI)
    moveCount: 0,
    history: [],
    lastMove: null,
    capturedByWhite: [],
    capturedByBlack: [],
    status: 'in_progress', // 'in_progress', 'checkmate_white', 'checkmate_black', 'draw'
    stats: { gamesPlayed: 1, whiteWins: 0, blackWins: 0, draws: 0 }
  };
}

function saveState(state) {
  const dir = path.dirname(STATE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

function isWhite(piece) {
  return piece && piece === piece.toUpperCase();
}

function isBlack(piece) {
  return piece && piece === piece.toLowerCase();
}

function isInside(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function squareToCoord(sq) {
  const file = sq[0].toLowerCase();
  const rank = sq[1];
  const c = FILES.indexOf(file);
  const r = RANKS.indexOf(rank);
  if (r === -1 || c === -1) return null;
  return { r, c };
}

function coordToSquare(r, c) {
  return FILES[c] + RANKS[r];
}

// Generate pseudo-legal moves for a piece at (r, c)
function getPieceMoves(board, r, c) {
  const piece = board[r][c];
  if (!piece) return [];
  const white = isWhite(piece);
  const type = piece.toLowerCase();
  const moves = [];

  const addMove = (tr, tc) => {
    if (!isInside(tr, tc)) return false;
    const target = board[tr][tc];
    if (!target) {
      moves.push({ from: { r, c }, to: { tr, tc }, capture: '' });
      return true; // continue sliding
    }
    if (white ? isBlack(target) : isWhite(target)) {
      moves.push({ from: { r, c }, to: { tr, tc }, capture: target });
    }
    return false; // hit piece, stop sliding
  };

  if (type === 'p') {
    const dir = white ? -1 : 1;
    const startRow = white ? 6 : 1;

    // 1 step forward
    if (isInside(r + dir, c) && !board[r + dir][c]) {
      moves.push({ from: { r, c }, to: { tr: r + dir, tc: c }, capture: '' });
      // 2 steps forward
      if (r === startRow && !board[r + dir * 2][c]) {
        moves.push({ from: { r, c }, to: { tr: r + dir * 2, tc: c }, capture: '' });
      }
    }

    // Captures
    for (const dc of [-1, 1]) {
      const tr = r + dir, tc = c + dc;
      if (isInside(tr, tc) && board[tr][tc]) {
        const target = board[tr][tc];
        if (white ? isBlack(target) : isWhite(target)) {
          moves.push({ from: { r, c }, to: { tr, tc }, capture: target });
        }
      }
    }
  } else if (type === 'n') {
    const offsets = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    for (const [dr, dc] of offsets) {
      addMove(r + dr, c + dc);
    }
  } else if (type === 'b' || type === 'r' || type === 'q') {
    const directions = [];
    if (type === 'b' || type === 'q') {
      directions.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
    }
    if (type === 'r' || type === 'q') {
      directions.push([-1, 0], [1, 0], [0, -1], [0, 1]);
    }
    for (const [dr, dc] of directions) {
      let tr = r + dr, tc = c + dc;
      while (isInside(tr, tc)) {
        const canContinue = addMove(tr, tc);
        if (!canContinue) break;
        tr += dr;
        tc += dc;
      }
    }
  } else if (type === 'k') {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr !== 0 || dc !== 0) addMove(r + dr, c + dc);
      }
    }
  }

  return moves;
}

function getAllLegalMoves(board, turn) {
  const moves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      if (turn === 'w' && isWhite(piece)) {
        moves.push(...getPieceMoves(board, r, c));
      } else if (turn === 'b' && isBlack(piece)) {
        moves.push(...getPieceMoves(board, r, c));
      }
    }
  }
  return moves;
}

function applyMove(board, move) {
  const piece = board[move.from.r][move.from.c];
  const captured = board[move.to.tr][move.to.tc];

  board[move.from.r][move.from.c] = '';
  // Pawn promotion to Queen
  if (piece === 'P' && move.to.tr === 0) {
    board[move.to.tr][move.to.tc] = 'Q';
  } else if (piece === 'p' && move.to.tr === 7) {
    board[move.to.tr][move.to.tc] = 'q';
  } else {
    board[move.to.tr][move.to.tc] = piece;
  }

  return { piece, captured };
}

function computeBlackAIMove(board) {
  const moves = getAllLegalMoves(board, 'b');
  if (moves.length === 0) return null;

  // Score each move
  let bestScore = -Infinity;
  let bestMove = moves[0];

  for (const m of moves) {
    let score = 0;
    // Captures
    if (m.capture) {
      score += (PIECE_VALUES[m.capture] || 100) * 10;
    }
    // Center control (d5, e5, d4, e4)
    if ((m.to.tr === 3 || m.to.tr === 4) && (m.to.tc === 3 || m.to.tc === 4)) {
      score += 35;
    }
    // Developing minor pieces (Knights and Bishops moving toward center)
    const movingPiece = board[m.from.r][m.from.c];
    if (movingPiece === 'n' || movingPiece === 'b') {
      if (m.from.r === 0) score += 40;
    }
    // Advance pawns
    if (movingPiece === 'p') {
      score += (m.to.tr - m.from.r) * 10;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMove = m;
    }
  }

  return bestMove;
}

function renderBoardSVG(state) {
  const board = state.board;
  const status = state.status;
  const lastMove = state.lastMove;

  const width = 880;
  const height = 520;
  const sqSize = 52;
  const boardX = 40;
  const boardY = 50;

  // Board square rendering
  let squaresSVG = '';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const x = boardX + c * sqSize;
      const y = boardY + r * sqSize;
      const isLight = (r + c) % 2 === 0;
      let fill = isLight ? '#1a2744' : '#0e172a';

      // Highlight last move
      if (lastMove && ((lastMove.fromR === r && lastMove.fromC === c) || (lastMove.toR === r && lastMove.toC === c))) {
        fill = isLight ? '#2a4365' : '#1e3a5f';
      }

      squaresSVG += `<rect x="${x}" y="${y}" width="${sqSize}" height="${sqSize}" fill="${fill}" />\n`;

      // Render piece glyph
      const piece = board[r][c];
      if (piece) {
        const white = isWhite(piece);
        const glyph = GLYPHS[piece] || piece;
        const pieceFill = white ? '#ffffff' : '#f472b6';
        const glowFilter = white ? 'filter="url(#whiteGlow)"' : 'filter="url(#blackGlow)"';

        squaresSVG += `
          <text x="${x + sqSize / 2}" y="${y + sqSize / 2 + 2}" font-family="'Segoe UI Symbol', 'DejaVu Sans', sans-serif" font-size="34" font-weight="bold" fill="${pieceFill}" text-anchor="middle" dominant-baseline="central" ${glowFilter}>${glyph}</text>
        `;
      }
    }
  }

  // File labels (a-h) & Rank labels (1-8)
  let coordsSVG = '';
  for (let i = 0; i < 8; i++) {
    // Files top & bottom
    const fx = boardX + i * sqSize + sqSize / 2;
    coordsSVG += `<text x="${fx}" y="${boardY - 10}" font-family="'Orbitron', sans-serif" font-size="11" font-weight="700" fill="#38bdf8" text-anchor="middle">${FILES[i]}</text>\n`;
    coordsSVG += `<text x="${fx}" y="${boardY + 8 * sqSize + 18}" font-family="'Orbitron', sans-serif" font-size="11" font-weight="700" fill="#38bdf8" text-anchor="middle">${FILES[i]}</text>\n`;

    // Ranks left & right
    const ry = boardY + i * sqSize + sqSize / 2 + 4;
    coordsSVG += `<text x="${boardX - 16}" y="${ry}" font-family="'Orbitron', sans-serif" font-size="11" font-weight="700" fill="#38bdf8" text-anchor="middle">${RANKS[i]}</text>\n`;
    coordsSVG += `<text x="${boardX + 8 * sqSize + 16}" y="${ry}" font-family="'Orbitron', sans-serif" font-size="11" font-weight="700" fill="#38bdf8" text-anchor="middle">${RANKS[i]}</text>\n`;
  }

  // Status & Telemetry
  let statusBadge = "YOUR TURN · WHITE TO PLAY";
  let statusColor = "#00f0ff";
  if (status === 'checkmate_white') {
    statusBadge = "🏆 CHECKMATE! HUMAN WON!";
    statusColor = "#00ffa3";
  } else if (status === 'checkmate_black') {
    statusBadge = "👾 CHECKMATE! CYBERBOT WON!";
    statusColor = "#ff2bd6";
  } else if (status === 'draw') {
    statusBadge = "🤝 STALEMATE · DRAW GAME!";
    statusColor = "#ffd166";
  }

  const whiteCapturedText = state.capturedByWhite && state.capturedByWhite.length > 0
    ? state.capturedByWhite.map(p => GLYPHS[p] || p).join(' ')
    : 'None';
  const blackCapturedText = state.capturedByBlack && state.capturedByBlack.length > 0
    ? state.capturedByBlack.map(p => GLYPHS[p] || p).join(' ')
    : 'None';

  const lastMoveDesc = state.lastMove
    ? `${state.lastMove.side === 'w' ? 'White' : 'Black'}: ${state.lastMove.notation}`
    : 'New game ready';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Community Chess: current board state">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#030712" />
      <stop offset="50%" stop-color="#0a1128" />
      <stop offset="100%" stop-color="#030712" />
    </linearGradient>

    <linearGradient id="panelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0c162d" />
      <stop offset="100%" stop-color="#070c1a" />
    </linearGradient>

    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00f0ff" />
      <stop offset="50%" stop-color="#a855f7" />
      <stop offset="100%" stop-color="#ff2bd6" />
    </linearGradient>

    <filter id="whiteGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="2.5" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    <filter id="blackGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="2.5" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    <pattern id="stardust" width="40" height="40" patternUnits="userSpaceOnUse">
      <circle cx="10" cy="10" r="0.8" fill="#38bdf8" opacity="0.08" />
    </pattern>
  </defs>

  <!-- Outer background -->
  <rect width="100%" height="100%" rx="18" fill="url(#bgGrad)" stroke="#1e293b" stroke-width="2" />
  <rect width="100%" height="100%" rx="18" fill="url(#stardust)" />

  <rect x="2" y="2" width="${width - 4}" height="${height - 4}" rx="18" fill="none" stroke="url(#borderGrad)" stroke-width="1.8" stroke-dasharray="140 1800" opacity="0.8">
    <animate attributeName="stroke-dashoffset" values="1940; 0" dur="9s" repeatCount="indefinite" />
  </rect>

  <!-- Board Frame -->
  <rect x="${boardX - 4}" y="${boardY - 4}" width="${8 * sqSize + 8}" height="${8 * sqSize + 8}" rx="8" fill="#080e1c" stroke="#38bdf8" stroke-width="2" opacity="0.9" />

  <!-- Chess Board Squares & Pieces -->
  ${squaresSVG}

  <!-- Coordinate Labels -->
  ${coordsSVG}

  <!-- Right Side HUD Panel -->
  <rect x="500" y="44" width="345" height="432" rx="16" fill="url(#panelGrad)" stroke="#1e293b" stroke-width="1.5" />

  <g transform="translate(525, 80)">
    <!-- Header -->
    <text x="0" y="0" font-family="'Orbitron', sans-serif" font-weight="900" font-size="18" fill="#f8fafc" letter-spacing="2">♟️ COMMUNITY CHESS</text>
    <text x="0" y="24" font-family="'JetBrains Mono', monospace" font-size="12" font-weight="700" fill="${statusColor}">◆ ${statusBadge}</text>

    <!-- Divider -->
    <line x1="0" y1="42" x2="295" y2="42" stroke="#1e293b" stroke-width="1" />

    <!-- Last Move -->
    <text x="0" y="70" font-family="'Orbitron', sans-serif" font-size="11" font-weight="700" fill="#94a3b8">LAST MOVE:</text>
    <text x="0" y="92" font-family="'JetBrains Mono', monospace" font-size="14" font-weight="600" fill="#38bdf8">${lastMoveDesc}</text>

    <!-- Divider -->
    <line x1="0" y1="112" x2="295" y2="112" stroke="#1e293b" stroke-width="1" />

    <!-- Captured Pieces -->
    <text x="0" y="140" font-family="'Orbitron', sans-serif" font-size="11" font-weight="700" fill="#94a3b8">WHITE CAPTURES (YOU):</text>
    <text x="0" y="162" font-family="'Segoe UI Symbol', sans-serif" font-size="16" fill="#f472b6">${whiteCapturedText}</text>

    <text x="0" y="195" font-family="'Orbitron', sans-serif" font-size="11" font-weight="700" fill="#94a3b8">CYBERBOT CAPTURES:</text>
    <text x="0" y="217" font-family="'Segoe UI Symbol', sans-serif" font-size="16" fill="#00f0ff">${blackCapturedText}</text>

    <!-- Divider -->
    <line x1="0" y1="237" x2="295" y2="237" stroke="#1e293b" stroke-width="1" />

    <!-- Record Stats -->
    <text x="0" y="265" font-family="'Orbitron', sans-serif" font-size="11" font-weight="700" fill="#94a3b8">TOURNAMENT STATS:</text>
    <text x="0" y="287" font-family="'JetBrains Mono', monospace" font-size="12" fill="#cbd5e1">Human: <tspan fill="#00ffa3" font-weight="700">${state.stats.whiteWins}W</tspan> · Bot: <tspan fill="#ff2bd6" font-weight="700">${state.stats.blackWins}W</tspan> · Draws: <tspan fill="#ffd166" font-weight="700">${state.stats.draws}</tspan></text>

    <!-- Instructions -->
    <rect x="-8" y="315" width="310" height="42" rx="10" fill="#091428" stroke="#00f0ff" stroke-width="1" opacity="0.8" />
    <text x="147" y="341" font-family="'Orbitron', sans-serif" font-size="10.5" font-weight="800" fill="#00f0ff" text-anchor="middle" letter-spacing="1">CLICK A MOVE LINK BELOW TO PLAY!</text>
  </g>
</svg>`;

  fs.writeFileSync(BOARD_SVG_FILE, svg, 'utf8');
}

function generateMovesMarkdown(state) {
  const board = state.board;
  const legalMoves = getAllLegalMoves(board, 'w');

  // Group moves by origin square
  const grouped = {};
  for (const m of legalMoves) {
    const fromSq = coordToSquare(m.from.r, m.from.c).toUpperCase();
    const toSq = coordToSquare(m.to.tr, m.to.tc).toUpperCase();
    if (!grouped[fromSq]) grouped[fromSq] = [];
    grouped[fromSq].push(toSq);
  }

  let tableMD = `| FROM | TO (Click any link to submit your move!) |\n| :---: | :--------------------------------------- |\n`;

  const keys = Object.keys(grouped).sort();
  for (const fromSq of keys) {
    const toLinks = grouped[fromSq].map(toSq => {
      const title = encodeURIComponent(`Chess: Move ${fromSq} to ${toSq}`);
      const body = encodeURIComponent(`Click 'Submit new issue' to make this chess move (${fromSq} to ${toSq})!`);
      const url = `https://github.com/NourSalous/NourSalous/issues/new?title=${title}&body=${body}`;
      return `[**${toSq}**](${url})`;
    }).join(' · ');

    tableMD += `| **${fromSq}** | ${toLinks} |\n`;
  }

  return tableMD;
}

function updateReadmeChessSection(state) {
  if (!fs.existsSync(README_FILE)) return;
  let readme = fs.readFileSync(README_FILE, 'utf8');

  const startMarker = '<!-- BEGIN CHESS MOVES -->';
  const endMarker = '<!-- END CHESS MOVES -->';

  const startIndex = readme.indexOf(startMarker);
  const endIndex = readme.indexOf(endMarker);

  if (startIndex !== -1 && endIndex !== -1) {
    const movesMD = generateMovesMarkdown(state);
    const updated = readme.substring(0, startIndex + startMarker.length) + '\n\n' + movesMD + '\n' + readme.substring(endIndex);
    fs.writeFileSync(README_FILE, updated, 'utf8');
    console.log('README.md chess moves list successfully refreshed.');
  }
}

function handleAction(action, fromSq = null, toSq = null, username = 'Visitor') {
  const state = loadState();

  if (action === 'reset') {
    state.board = getInitialBoard();
    state.turn = 'w';
    state.moveCount = 0;
    state.history = [];
    state.lastMove = null;
    state.capturedByWhite = [];
    state.capturedByBlack = [];
    state.status = 'in_progress';
    state.stats.gamesPlayed++;

    saveState(state);
    renderBoardSVG(state);
    updateReadmeChessSection(state);

    return {
      success: true,
      message: `🔄 Chess board has been reset by @${username}! New tournament game started. White (Human) to move!`
    };
  }

  if (action === 'move') {
    if (state.status !== 'in_progress') {
      return {
        success: false,
        message: `⚠️ This game has already concluded (${state.status})! Click **Start New Game** in the README to begin a fresh match.`
      };
    }

    const fromCoord = squareToCoord(fromSq);
    const toCoord = squareToCoord(toSq);

    if (!fromCoord || !toCoord) {
      return {
        success: false,
        message: `⚠️ Invalid squares: ${fromSq} to ${toSq}. Expected squares like E2 to E4.`
      };
    }

    // Verify move is legal for White
    const legalMoves = getAllLegalMoves(state.board, 'w');
    const valid = legalMoves.find(m => m.from.r === fromCoord.r && m.from.c === fromCoord.c && m.to.tr === toCoord.r && m.to.tc === toCoord.c);

    if (!valid) {
      return {
        success: false,
        message: `⚠️ Move ${fromSq.toUpperCase()} to ${toSq.toUpperCase()} is not legal in the current position!`
      };
    }

    // Apply White's move
    const whiteResult = applyMove(state.board, valid);
    if (whiteResult.captured) {
      state.capturedByWhite.push(whiteResult.captured);
    }
    state.moveCount++;
    state.lastMove = {
      side: 'w',
      from: fromSq.toUpperCase(),
      to: toSq.toUpperCase(),
      fromR: fromCoord.r,
      fromC: fromCoord.c,
      toR: toCoord.r,
      toC: toCoord.c,
      notation: `${fromSq.toUpperCase()} ➔ ${toSq.toUpperCase()}`,
      user: username
    };
    state.history.push(state.lastMove);

    // Check if black king is captured (simplified checkmate)
    const hasBlackKing = state.board.some(row => row.includes('k'));
    if (!hasBlackKing) {
      state.status = 'checkmate_white';
      state.stats.whiteWins++;
      saveState(state);
      renderBoardSVG(state);
      updateReadmeChessSection(state);
      return {
        success: true,
        message: `🎉 **CHECKMATE!** @${username} defeated CyberBot with ${fromSq.toUpperCase()} to ${toSq.toUpperCase()}! 🏆`
      };
    }

    // CyberBot (Black) AI turn
    const botMove = computeBlackAIMove(state.board);
    if (botMove) {
      const botFromSq = coordToSquare(botMove.from.r, botMove.from.c).toUpperCase();
      const botToSq = coordToSquare(botMove.to.tr, botMove.to.tc).toUpperCase();
      const botResult = applyMove(state.board, botMove);

      if (botResult.captured) {
        state.capturedByBlack.push(botResult.captured);
      }
      state.lastMove = {
        side: 'b',
        from: botFromSq,
        to: botToSq,
        fromR: botMove.from.r,
        fromC: botMove.from.c,
        toR: botMove.to.tr,
        toC: botMove.to.tc,
        notation: `${botFromSq} ➔ ${botToSq}`,
        user: 'CyberBot'
      };
      state.history.push(state.lastMove);

      const hasWhiteKing = state.board.some(row => row.includes('K'));
      if (!hasWhiteKing) {
        state.status = 'checkmate_black';
        state.stats.blackWins++;
        saveState(state);
        renderBoardSVG(state);
        updateReadmeChessSection(state);
        return {
          success: true,
          message: `👾 **CHECKMATE!** CyberBot countered with **${botFromSq} to ${botToSq}** and won this game! Click Reset to try again.`
        };
      }

      saveState(state);
      renderBoardSVG(state);
      updateReadmeChessSection(state);

      return {
        success: true,
        message: `✅ @${username} moved **${fromSq.toUpperCase()} to ${toSq.toUpperCase()}**.\n🤖 CyberBot responded with **${botFromSq} to ${botToSq}**.\n\n👉 **Your turn (White)!** Choose your next move from the legal moves table.`
      };
    }
  }

  saveState(state);
  renderBoardSVG(state);
  updateReadmeChessSection(state);
  return { success: true, message: 'Chess board state refreshed.' };
}

// Parses titles: "Chess: Move E2 to E4", "chess: e2e4", "chess|move|e2|e4", "Chess: reset", "Chess: Start new game"
function parseTitle(title) {
  if (!title) return { action: null, fromSq: null, toSq: null };
  const clean = title.trim();

  // Reset check
  if (/chess:?\s*(reset|start\s*new\s*game)/i.test(clean) || /chess\|reset/i.test(clean)) {
    return { action: 'reset', fromSq: null, toSq: null };
  }

  // "Chess: Move E2 to E4" or "Move E2 to E4"
  const matchMove1 = clean.match(/move\s+([a-h][1-8])\s+(?:to\s+)?([a-h][1-8])/i);
  if (matchMove1) {
    return { action: 'move', fromSq: matchMove1[1], toSq: matchMove1[2] };
  }

  // "chess: e2e4" or "e2e4"
  const matchMove2 = clean.match(/([a-h][1-8])\s*([a-h][1-8])/i);
  if (matchMove2) {
    return { action: 'move', fromSq: matchMove2[1], toSq: matchMove2[2] };
  }

  return { action: null, fromSq: null, toSq: null };
}

function main() {
  const args = process.argv.slice(2);
  let title = '';
  let username = 'Visitor';
  let action = '';
  let fromSq = null;
  let toSq = null;

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
    } else if (args[i] === '--from' && args[i + 1]) {
      fromSq = args[i + 1];
      i++;
    } else if (args[i] === '--to' && args[i + 1]) {
      toSq = args[i + 1];
      i++;
    }
  }

  if (title) {
    const parsed = parseTitle(title);
    if (parsed.action) {
      action = parsed.action;
      fromSq = parsed.fromSq;
      toSq = parsed.toSq;
    }
  }

  if (!action) {
    const state = loadState();
    renderBoardSVG(state);
    updateReadmeChessSection(state);
    console.log('Chess board SVG and legal moves rendered.');
    return;
  }

  const result = handleAction(action, fromSq, toSq, username);
  console.log(result.message);

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `message=${encodeURIComponent(result.message)}\n`);
  }
}

if (require.main === module) {
  main();
}

module.exports = { handleAction, loadState, saveState, renderBoardSVG, parseTitle, getAllLegalMoves };
