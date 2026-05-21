const { ChessGame, PIECES, COLORS } = require('../src/chess.js');

describe('ChessGame', () => {
    let game;
    beforeEach(() => { game = new ChessGame(); });

    describe('initialization', () => {
        test('board has 64 squares', () => expect(game.board.length).toBe(64));

        test('white pawns on row 6', () => {
            for (let c = 0; c < 8; c++)
                expect(game.getPiece(6, c)).toEqual({ type: PIECES.PAWN, color: COLORS.WHITE });
        });

        test('black pawns on row 1', () => {
            for (let c = 0; c < 8; c++)
                expect(game.getPiece(1, c)).toEqual({ type: PIECES.PAWN, color: COLORS.BLACK });
        });

        test('back ranks placed correctly', () => {
            const order = [PIECES.ROOK, PIECES.KNIGHT, PIECES.BISHOP, PIECES.QUEEN, PIECES.KING, PIECES.BISHOP, PIECES.KNIGHT, PIECES.ROOK];
            for (let c = 0; c < 8; c++) {
                expect(game.getPiece(0, c)).toEqual({ type: order[c], color: COLORS.BLACK });
                expect(game.getPiece(7, c)).toEqual({ type: order[c], color: COLORS.WHITE });
            }
        });

        test('middle rows are empty', () => {
            for (let r = 2; r < 6; r++)
                for (let c = 0; c < 8; c++)
                    expect(game.getPiece(r, c)).toBeNull();
        });

        test('starts on white turn', () => expect(game.turn).toBe(COLORS.WHITE));
        test('game not over at start', () => expect(game.gameOver).toBe(false));
        test('not in check at start', () => {
            expect(game.isInCheck(COLORS.WHITE)).toBe(false);
            expect(game.isInCheck(COLORS.BLACK)).toBe(false);
        });
    });

    describe('pawn movement', () => {
        test('white pawn moves one square forward', () => {
            const moves = game.getValidMoves(game.rowColToIndex(6, 4));
            expect(moves).toContain(game.rowColToIndex(5, 4));
        });

        test('white pawn double move from start', () => {
            const moves = game.getValidMoves(game.rowColToIndex(6, 4));
            expect(moves).toContain(game.rowColToIndex(4, 4));
        });

        test('black pawn moves forward', () => {
            const moves = game.getValidMoves(game.rowColToIndex(1, 4));
            expect(moves).toContain(game.rowColToIndex(2, 4));
        });

        test('pawn blocked cannot move', () => {
            game.board[game.rowColToIndex(5, 0)] = { type: PIECES.PAWN, color: COLORS.WHITE };
            const moves = game.getValidMoves(game.rowColToIndex(6, 0));
            expect(moves).not.toContain(game.rowColToIndex(5, 0));
            expect(moves).not.toContain(game.rowColToIndex(4, 0));
        });

        test('pawn captures diagonally', () => {
            game.board[game.rowColToIndex(5, 1)] = { type: PIECES.PAWN, color: COLORS.BLACK };
            const moves = game.getValidMoves(game.rowColToIndex(6, 0));
            expect(moves).toContain(game.rowColToIndex(5, 1));
        });

        test('pawn cannot capture friendly piece', () => {
            game.board[game.rowColToIndex(5, 1)] = { type: PIECES.PAWN, color: COLORS.WHITE };
            const moves = game.getValidMoves(game.rowColToIndex(6, 0));
            expect(moves).not.toContain(game.rowColToIndex(5, 1));
        });
    });

    describe('knight movement', () => {
        test('knight jumps over pieces', () => {
            const moves = game.getValidMoves(game.rowColToIndex(7, 1));
            expect(moves).toContain(game.rowColToIndex(5, 0));
            expect(moves).toContain(game.rowColToIndex(5, 2));
        });

        test('knight cannot land on friendly square', () => {
            const moves = game.getValidMoves(game.rowColToIndex(7, 1));
            expect(moves).not.toContain(game.rowColToIndex(7, 0));
        });
    });

    describe('rook movement', () => {
        test('rook blocked by own pieces at start', () => {
            const moves = game.getValidMoves(game.rowColToIndex(7, 0));
            expect(moves).toHaveLength(0);
        });

        test('rook moves along rank and file when clear', () => {
            game.board[game.rowColToIndex(7, 0)] = { type: PIECES.ROOK, color: COLORS.WHITE };
            game.board[game.rowColToIndex(6, 0)] = null;
            const moves = game.getValidMoves(game.rowColToIndex(7, 0));
            expect(moves).toContain(game.rowColToIndex(6, 0));
        });
    });

    describe('turn management', () => {
        test('white selects own piece', () => {
            expect(game.selectSquare(game.rowColToIndex(6, 0)).type).toBe('selected');
        });

        test('white cannot select black piece', () => {
            expect(game.selectSquare(game.rowColToIndex(1, 0)).type).toBe('none');
        });

        test('turn switches after move', () => {
            game.selectSquare(game.rowColToIndex(6, 4));
            game.selectSquare(game.rowColToIndex(4, 4));
            expect(game.turn).toBe(COLORS.BLACK);
        });

        test('black can move after white', () => {
            game.selectSquare(game.rowColToIndex(6, 4));
            game.selectSquare(game.rowColToIndex(4, 4));
            expect(game.selectSquare(game.rowColToIndex(1, 4)).type).toBe('selected');
        });
    });

    describe('capture', () => {
        test('pawn captures and returns captured piece info', () => {
            // e4
            game.selectSquare(game.rowColToIndex(6, 4));
            game.selectSquare(game.rowColToIndex(4, 4));
            // d5
            game.selectSquare(game.rowColToIndex(1, 3));
            game.selectSquare(game.rowColToIndex(3, 3));
            // exd5
            game.selectSquare(game.rowColToIndex(4, 4));
            const result = game.selectSquare(game.rowColToIndex(3, 3));
            expect(result.type).toBe('moved');
            expect(result.captured).toMatchObject({ type: PIECES.PAWN, color: COLORS.BLACK });
        });
    });

    describe('check and checkmate', () => {
        test('scholars mate results in checkmate', () => {
            // e4
            game.selectSquare(game.rowColToIndex(6, 4));
            game.selectSquare(game.rowColToIndex(4, 4));
            // e5
            game.selectSquare(game.rowColToIndex(1, 4));
            game.selectSquare(game.rowColToIndex(3, 4));
            // Bc4
            game.selectSquare(game.rowColToIndex(7, 5));
            game.selectSquare(game.rowColToIndex(4, 2));
            // Nc6
            game.selectSquare(game.rowColToIndex(0, 1));
            game.selectSquare(game.rowColToIndex(2, 2));
            // Qh5
            game.selectSquare(game.rowColToIndex(7, 3));
            game.selectSquare(game.rowColToIndex(3, 7));
            // Nf6
            game.selectSquare(game.rowColToIndex(0, 6));
            game.selectSquare(game.rowColToIndex(2, 5));
            // Qxf7#
            game.selectSquare(game.rowColToIndex(3, 7));
            const result = game.selectSquare(game.rowColToIndex(1, 5));
            expect(result.checkmate).toBe(true);
            expect(game.gameOver).toBe(true);
            expect(game.winner).toBe(COLORS.WHITE);
        });

        test('move cannot expose own king to check', () => {
            // Place black rook attacking white king through white piece
            game.board = Array(64).fill(null);
            game.board[game.rowColToIndex(7, 4)] = { type: PIECES.KING, color: COLORS.WHITE };
            game.board[game.rowColToIndex(7, 3)] = { type: PIECES.ROOK, color: COLORS.WHITE };
            game.board[game.rowColToIndex(7, 0)] = { type: PIECES.ROOK, color: COLORS.BLACK };
            // White rook on d1 is pinned — moving it would expose king
            const moves = game.getValidMoves(game.rowColToIndex(7, 3));
            // Can only move along rank 7 (not off the pin line)
            for (const m of moves) {
                const { row } = game.indexToRowCol(m);
                expect(row).toBe(7);
            }
        });
    });

    describe('pawn promotion', () => {
        test('pawn promotes to queen on reaching last rank', () => {
            game.board = Array(64).fill(null);
            game.board[game.rowColToIndex(7, 4)] = { type: PIECES.KING, color: COLORS.WHITE };
            game.board[game.rowColToIndex(0, 4)] = { type: PIECES.KING, color: COLORS.BLACK };
            game.board[game.rowColToIndex(1, 0)] = { type: PIECES.PAWN, color: COLORS.WHITE };
            const result = game._doMove(game.rowColToIndex(1, 0), game.rowColToIndex(0, 0));
            expect(result.type).toBe('moved');
            expect(game.board[game.rowColToIndex(0, 0)]).toMatchObject({ type: PIECES.QUEEN, color: COLORS.WHITE });
        });
    });

    describe('reset', () => {
        test('restores initial state after moves', () => {
            game.selectSquare(game.rowColToIndex(6, 4));
            game.selectSquare(game.rowColToIndex(4, 4));
            game.reset();
            expect(game.turn).toBe(COLORS.WHITE);
            expect(game.gameOver).toBe(false);
            expect(game.getPiece(6, 4)).toEqual({ type: PIECES.PAWN, color: COLORS.WHITE });
            expect(game.getPiece(4, 4)).toBeNull();
        });
    });

    describe('move counter', () => {
        test('move counts start at zero for both players', () => {
            expect(game.moveCounts[COLORS.WHITE]).toBe(0);
            expect(game.moveCounts[COLORS.BLACK]).toBe(0);
        });

        test('white move increments only white count', () => {
            game.selectSquare(game.rowColToIndex(6, 4));
            game.selectSquare(game.rowColToIndex(4, 4));
            expect(game.moveCounts[COLORS.WHITE]).toBe(1);
            expect(game.moveCounts[COLORS.BLACK]).toBe(0);
        });

        test('black move increments only black count', () => {
            game.selectSquare(game.rowColToIndex(6, 4));
            game.selectSquare(game.rowColToIndex(4, 4));
            game.selectSquare(game.rowColToIndex(1, 4));
            game.selectSquare(game.rowColToIndex(3, 4));
            expect(game.moveCounts[COLORS.WHITE]).toBe(1);
            expect(game.moveCounts[COLORS.BLACK]).toBe(1);
        });

        test('counts accumulate across multiple moves', () => {
            // 1. e4 e5  2. Nf3 Nc6
            game.selectSquare(game.rowColToIndex(6, 4));
            game.selectSquare(game.rowColToIndex(4, 4));
            game.selectSquare(game.rowColToIndex(1, 4));
            game.selectSquare(game.rowColToIndex(3, 4));
            game.selectSquare(game.rowColToIndex(7, 6));
            game.selectSquare(game.rowColToIndex(5, 5));
            game.selectSquare(game.rowColToIndex(0, 1));
            game.selectSquare(game.rowColToIndex(2, 2));
            expect(game.moveCounts[COLORS.WHITE]).toBe(2);
            expect(game.moveCounts[COLORS.BLACK]).toBe(2);
        });

        test('selecting a piece without moving does not change counts', () => {
            game.selectSquare(game.rowColToIndex(6, 4));
            expect(game.moveCounts[COLORS.WHITE]).toBe(0);
            expect(game.moveCounts[COLORS.BLACK]).toBe(0);
        });

        test('move result reports current move counts', () => {
            game.selectSquare(game.rowColToIndex(6, 4));
            const result = game.selectSquare(game.rowColToIndex(4, 4));
            expect(result.type).toBe('moved');
            expect(result.moveCounts).toEqual({ [COLORS.WHITE]: 1, [COLORS.BLACK]: 0 });
        });

        test('reset zeroes the move counts', () => {
            game.selectSquare(game.rowColToIndex(6, 4));
            game.selectSquare(game.rowColToIndex(4, 4));
            game.reset();
            expect(game.moveCounts[COLORS.WHITE]).toBe(0);
            expect(game.moveCounts[COLORS.BLACK]).toBe(0);
        });
    });
});
