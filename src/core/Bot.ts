const TOP_ROW_MASKS = [32n, 4096n, 524288n, 67108864n, 8589934592n, 1099511627776n, 140737488355328n];
const BOTTOM_MASKS = [1n, 128n, 16384n, 2097152n, 268435456n, 34359738368n, 4398046511104n];

const EVAL_MASKS: bigint[] = [];
const EVAL_WEIGHTS: number[] = [];
const weightsMatrix = [
    [3, 4, 5, 7, 5, 4, 3],
    [4, 6, 8, 10, 8, 6, 4],
    [5, 8, 11, 13, 11, 8, 5],
    [5, 8, 11, 13, 11, 8, 5],
    [4, 6, 8, 10, 8, 6, 4],
    [3, 4, 5, 7, 5, 4, 3]
];
for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 7; c++) {
        EVAL_MASKS.push(1n << BigInt(c * 7 + r));
        EVAL_WEIGHTS.push(weightsMatrix[r][c]);
    }
}

export class Bot {
    
    public getMove(position: bigint, mask: bigint, difficulty: string = 'EASY'): number {
        switch (difficulty) {
            case 'EASY':
                return this.choosingMove(position, mask, [50, 70, 30], 1);
            case 'MEDIUM':
                return this.choosingMove(position, mask, [90, 80, 50], 3);
            case 'HARD':
                return this.choosingMove(position, mask, [100, 100, 80], 5);
            case 'EXTREME':
                return this.choosingMove(position, mask, [100, 100, 100], 7);
            default:
                return this.choosingMove(position, mask, [100, 100, 100], 7);
        }
    }

    private choosingMove(position: bigint, mask: bigint, probabilities: number[], depth: number): number {
        if (probabilities[0] >= Math.random() * 100) {
            const winningCol = this.getWinningMove(position, mask);
            if (winningCol !== null) return winningCol;
        }

        if (probabilities[1] >= Math.random() * 100) {
            const blockingCol = this.getBlockingMove(position, mask);
            if (blockingCol !== null) return blockingCol;
        }

        let validMoves = this.getSafeMoves(position, mask);
        if (validMoves.length === 0) {
            validMoves = this.getAllLegalMoves(mask);
            if (validMoves.length === 0) return -1;
        }

        if (probabilities[2] < Math.random() * 100) {
            return validMoves[Math.floor(Math.random() * validMoves.length)];
        }

        let bestMove = validMoves[0];
        let maxScore = -Infinity;
        let scores = new Map<number, number>();

        for (const col of validMoves) {
            const newMask = mask | (mask + BOTTOM_MASKS[col]);
            const newPosition = position ^ mask;
            
            const score = -this.evaluateMoveWithDepth(newPosition, newMask, depth - 1);
            scores.set(col, score);

            if (score > maxScore) {
                maxScore = score;
                bestMove = col;
            }
        }

        return bestMove;
    }

    private getWinningMove(position: bigint, mask: bigint): number | null {
        for (let col = 0; col < 7; col++) {
            if (!this.isValidMove(mask, col)) continue;
            
            const newMove = (mask + BOTTOM_MASKS[col]) & ~mask;
            if (this.checkWin(position | newMove)) {
                return col;
            }
        }
        return null;
    }

    private getBlockingMove(position: bigint, mask: bigint): number | null {
        const opponentPosition = position ^ mask;
        return this.getWinningMove(opponentPosition, mask);
    }

    private getSafeMoves(position: bigint, mask: bigint): number[] {
        const safeMoves: number[] = [];
        const opponentPosition = position ^ mask;

        for (let col = 0; col < 7; col++) {
            if (!this.isValidMove(mask, col)) continue;

            const myMove = (mask + BOTTOM_MASKS[col]) & ~mask;
            const tempMask = mask | myMove;

            if (!this.isValidMove(tempMask, col)) {
                safeMoves.push(col);
                continue;
            }

            const opponentNextMove = (tempMask + BOTTOM_MASKS[col]) & ~tempMask;
            const testOpponentPos = opponentPosition | opponentNextMove;

            if (!this.checkWin(testOpponentPos)) {
                safeMoves.push(col);
            }
        }
        return safeMoves;
    }

    private evaluateBoard(position: bigint, mask: bigint): number {
        let score = 0;
        const opponentPosition = position ^ mask;

        for (let i = 0; i < 42; i++) {
            if ((position & EVAL_MASKS[i]) !== 0n) {
                score += EVAL_WEIGHTS[i];
            } else if ((opponentPosition & EVAL_MASKS[i]) !== 0n) {
                score -= EVAL_WEIGHTS[i];
            }
        }
        return score;
    }

    private evaluateMoveWithDepth(position: bigint, mask: bigint, depth: number): number {
        if (this.checkWin(position ^ mask)) {
            return -100000 - depth;
        }
        
        if (this.getAllLegalMoves(mask).length === 0) return 0;
        
        if (depth === 0) {
            return this.evaluateBoard(position, mask);
        }

        let maxScore = -Infinity;
        const validMoves = this.getAllLegalMoves(mask);

        for (const col of validMoves) {
            const newMask = mask | (mask + BOTTOM_MASKS[col]);
            const newPosition = position ^ mask;

            const score = -this.evaluateMoveWithDepth(newPosition, newMask, depth - 1);
            if (score > maxScore) {
                maxScore = score;
            }
        }
        return maxScore;
    }

    private checkWin(board: bigint): boolean {
        let m = board & (board >> 1n);
        if (m & (m >> 2n)) return true;

        m = board & (board >> 7n);
        if (m & (m >> 14n)) return true;

        m = board & (board >> 6n);
        if (m & (m >> 12n)) return true;

        m = board & (board >> 8n);
        if (m & (m >> 16n)) return true;

        return false;
    }

    private isValidMove(mask: bigint, col: number): boolean {
        return (mask & TOP_ROW_MASKS[col]) === 0n;
    }

    private getAllLegalMoves(mask: bigint): number[] {
        const moves: number[] = [];
        if ((mask & 32n) === 0n) moves.push(0);
        if ((mask & 4096n) === 0n) moves.push(1);
        if ((mask & 524288n) === 0n) moves.push(2);
        if ((mask & 67108864n) === 0n) moves.push(3);
        if ((mask & 8589934592n) === 0n) moves.push(4);
        if ((mask & 1099511627776n) === 0n) moves.push(5);
        if ((mask & 140737488355328n) === 0n) moves.push(6);
        return moves;
    }
}