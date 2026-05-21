const PIECES = { PAWN: 'P', ROOK: 'R', KNIGHT: 'N', BISHOP: 'B', QUEEN: 'Q', KING: 'K' };
const COLORS = { WHITE: 'white', BLACK: 'black' };

class ChessGame {
    constructor() { this.reset(); }

    reset() {
        this.board = this._initBoard();
        this.turn = COLORS.WHITE;
        this.selectedSquare = null;
        this.validMoves = [];
        this.gameOver = false;
        this.winner = null;
        this.moveCounts = { [COLORS.WHITE]: 0, [COLORS.BLACK]: 0 };
        this.moveHistory = { [COLORS.WHITE]: [], [COLORS.BLACK]: [] };
    }

    _squareName(index) {
        const { row, col } = this.indexToRowCol(index);
        return String.fromCharCode(97 + col) + (8 - row);
    }

    _notation(from, to, piece, captured, promoted) {
        const prefix = piece.type === PIECES.PAWN ? '' : piece.type;
        const sep = captured ? 'x' : '';
        const src = piece.type === PIECES.PAWN && captured
            ? this._squareName(from).charAt(0)
            : '';
        const promo = promoted ? '=' + PIECES.QUEEN : '';
        return prefix + src + sep + this._squareName(to) + promo;
    }

    _initBoard() {
        const board = Array(64).fill(null);
        const back = [PIECES.ROOK, PIECES.KNIGHT, PIECES.BISHOP, PIECES.QUEEN, PIECES.KING, PIECES.BISHOP, PIECES.KNIGHT, PIECES.ROOK];
        for (let c = 0; c < 8; c++) {
            board[c]      = { type: back[c],       color: COLORS.BLACK };
            board[8 + c]  = { type: PIECES.PAWN,   color: COLORS.BLACK };
            board[48 + c] = { type: PIECES.PAWN,   color: COLORS.WHITE };
            board[56 + c] = { type: back[c],       color: COLORS.WHITE };
        }
        return board;
    }

    rowColToIndex(row, col) { return row * 8 + col; }
    indexToRowCol(index) { return { row: Math.floor(index / 8), col: index % 8 }; }
    _inBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

    getPiece(row, col) {
        return this._inBounds(row, col) ? this.board[this.rowColToIndex(row, col)] : null;
    }

    getValidMoves(index) {
        const piece = this.board[index];
        if (!piece) return [];
        const { row, col } = this.indexToRowCol(index);
        return this._rawMoves(row, col, piece).filter(to => !this._inCheckAfter(index, to, piece.color));
    }

    _rawMoves(row, col, piece) {
        switch (piece.type) {
            case PIECES.PAWN:   return this._pawnMoves(row, col, piece.color);
            case PIECES.ROOK:   return this._slideMoves(row, col, piece.color, [[1,0],[-1,0],[0,1],[0,-1]]);
            case PIECES.KNIGHT: return this._knightMoves(row, col, piece.color);
            case PIECES.BISHOP: return this._slideMoves(row, col, piece.color, [[1,1],[1,-1],[-1,1],[-1,-1]]);
            case PIECES.QUEEN:  return this._slideMoves(row, col, piece.color, [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]);
            case PIECES.KING:   return this._kingMoves(row, col, piece.color);
            default: return [];
        }
    }

    _pawnMoves(row, col, color) {
        const moves = [];
        const dir = color === COLORS.WHITE ? -1 : 1;
        const startRow = color === COLORS.WHITE ? 6 : 1;
        if (this._inBounds(row + dir, col) && !this.getPiece(row + dir, col)) {
            moves.push(this.rowColToIndex(row + dir, col));
            if (row === startRow && !this.getPiece(row + 2 * dir, col))
                moves.push(this.rowColToIndex(row + 2 * dir, col));
        }
        for (const dc of [-1, 1]) {
            const t = this.getPiece(row + dir, col + dc);
            if (t && t.color !== color) moves.push(this.rowColToIndex(row + dir, col + dc));
        }
        return moves;
    }

    _slideMoves(row, col, color, dirs) {
        const moves = [];
        for (const [dr, dc] of dirs) {
            let r = row + dr, c = col + dc;
            while (this._inBounds(r, c)) {
                const t = this.getPiece(r, c);
                if (!t) { moves.push(this.rowColToIndex(r, c)); }
                else { if (t.color !== color) moves.push(this.rowColToIndex(r, c)); break; }
                r += dr; c += dc;
            }
        }
        return moves;
    }

    _knightMoves(row, col, color) {
        return [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]]
            .filter(([dr, dc]) => this._inBounds(row+dr, col+dc))
            .filter(([dr, dc]) => { const t = this.getPiece(row+dr, col+dc); return !t || t.color !== color; })
            .map(([dr, dc]) => this.rowColToIndex(row+dr, col+dc));
    }

    _kingMoves(row, col, color) {
        const moves = [];
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
            if (!dr && !dc) continue;
            if (!this._inBounds(row+dr, col+dc)) continue;
            const t = this.getPiece(row+dr, col+dc);
            if (!t || t.color !== color) moves.push(this.rowColToIndex(row+dr, col+dc));
        }
        return moves;
    }

    _inCheckAfter(from, to, color) {
        const saved = this.board[to];
        this.board[to] = this.board[from];
        this.board[from] = null;
        const kingIdx = this.board.findIndex(p => p && p.type === PIECES.KING && p.color === color);
        let inCheck = false;
        if (kingIdx !== -1) {
            const opp = color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
            for (let i = 0; i < 64 && !inCheck; i++) {
                const p = this.board[i];
                if (!p || p.color !== opp) continue;
                const { row, col } = this.indexToRowCol(i);
                if (this._rawMoves(row, col, p).includes(kingIdx)) inCheck = true;
            }
        }
        this.board[from] = this.board[to];
        this.board[to] = saved;
        return inCheck;
    }

    isInCheck(color) {
        const kingIdx = this.board.findIndex(p => p && p.type === PIECES.KING && p.color === color);
        if (kingIdx === -1) return false;
        const opp = color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
        for (let i = 0; i < 64; i++) {
            const p = this.board[i];
            if (!p || p.color !== opp) continue;
            const { row, col } = this.indexToRowCol(i);
            if (this._rawMoves(row, col, p).includes(kingIdx)) return true;
        }
        return false;
    }

    _hasAnyMoves(color) {
        for (let i = 0; i < 64; i++) {
            const p = this.board[i];
            if (p && p.color === color && this.getValidMoves(i).length > 0) return true;
        }
        return false;
    }

    isCheckmate(color) { return this.isInCheck(color) && !this._hasAnyMoves(color); }
    isStalemate(color) { return !this.isInCheck(color) && !this._hasAnyMoves(color); }

    selectSquare(index) {
        const piece = this.board[index];
        if (this.selectedSquare !== null) {
            if (this.validMoves.includes(index)) return this._doMove(this.selectedSquare, index);
            if (piece && piece.color === this.turn) {
                this.selectedSquare = index;
                this.validMoves = this.getValidMoves(index);
                return { type: 'selected', index };
            }
            this.selectedSquare = null;
            this.validMoves = [];
            return { type: 'deselected' };
        }
        if (piece && piece.color === this.turn) {
            this.selectedSquare = index;
            this.validMoves = this.getValidMoves(index);
            return { type: 'selected', index };
        }
        return { type: 'none' };
    }

    _doMove(from, to) {
        const piece = { ...this.board[from] };
        const captured = this.board[to] ? { ...this.board[to] } : null;
        this.board[to] = this.board[from];
        this.board[from] = null;
        const { row } = this.indexToRowCol(to);
        const promoted = piece.type === PIECES.PAWN && (row === 0 || row === 7);
        if (promoted)
            this.board[to] = { type: PIECES.QUEEN, color: piece.color };
        this.selectedSquare = null;
        this.validMoves = [];
        this.moveCounts[piece.color] += 1;
        const nextColor = this.turn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
        this.turn = nextColor;
        let notation = this._notation(from, to, piece, captured, promoted);
        const result = { type: 'moved', from, to, piece, captured, moveCounts: { ...this.moveCounts } };
        if (this.isCheckmate(nextColor)) {
            this.gameOver = true; this.winner = piece.color; result.checkmate = true;
            notation += '#';
        } else if (this.isStalemate(nextColor)) {
            this.gameOver = true; result.stalemate = true;
        } else if (this.isInCheck(nextColor)) {
            result.check = true;
            notation += '+';
        }
        const entry = { from, to, piece, captured, promoted, notation };
        this.moveHistory[piece.color].push(entry);
        result.notation = notation;
        result.moveHistory = {
            [COLORS.WHITE]: [...this.moveHistory[COLORS.WHITE]],
            [COLORS.BLACK]: [...this.moveHistory[COLORS.BLACK]],
        };
        return result;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ChessGame, PIECES, COLORS };
} else if (typeof window !== 'undefined') {
    window.ChessGame = ChessGame;
    window.PIECES = PIECES;
    window.COLORS = COLORS;
}
