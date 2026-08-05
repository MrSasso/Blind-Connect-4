// Costanti precalcolate a tempo di esecuzione per evitare nuove allocazioni
const TOP_ROW_MASKS = [32n, 4096n, 524288n, 67108864n, 8589934592n, 1099511627776n, 140737488355328n];
const BOTTOM_MASKS = [1n, 128n, 16384n, 2097152n, 268435456n, 34359738368n, 4398046511104n];

const GRID_MASKS: bigint[][] = Array.from({ length: 7 }, (_, c) => 
    Array.from({ length: 6 }, (_, r) => 1n << BigInt(c * 7 + r))
);

export class GameEngine {
    public positionP1: bigint;
    public positionP2: bigint;
    public currentPlayer: number;
    public lives: number;
    
    public winningCells: {c: number, r: number}[] = [];
    public lastMove: {col: number, player: number} | null = null;

    constructor() {
        this.positionP1 = 0n;
        this.positionP2 = 0n;
        this.currentPlayer = 1;
        this.lives = 3;
        this.resetGame();
    }

    public resetGame() {
        this.positionP1 = 0n;
        this.positionP2 = 0n;
        this.currentPlayer = 1;
        this.lives = 3;
        this.winningCells = [];
        this.lastMove = null;
    }

    public get mask(): bigint {
        return this.positionP1 | this.positionP2;
    }

    public playMove(colIndex: number): { status: string, livesLeft: number, winner?: number } {
        const topRowBit = TOP_ROW_MASKS[colIndex];
        
        if ((this.mask & topRowBit) !== 0n) {
            this.lives--;
            if (this.lives <= 0) {
                return { status: 'GAME_OVER_LIVES', livesLeft: 0 };
            }
            return { status: 'ERROR_FULL', livesLeft: this.lives };
        }

        const currentMask = this.mask;
        const newMove = (currentMask + BOTTOM_MASKS[colIndex]) & ~currentMask;
        
        if (this.currentPlayer === 1) {
            this.positionP1 |= newMove;
        } else {
            this.positionP2 |= newMove;
        }

        this.lastMove = { col: colIndex, player: this.currentPlayer };

        const currentPos = this.currentPlayer === 1 ? this.positionP1 : this.positionP2;

        if (this.checkWin(currentPos)) {
            this.extractWinningCells(currentPos);
            return { status: 'WIN', livesLeft: this.lives, winner: this.currentPlayer };
        }

        if (this.isBoardFull()) {
            return { status: 'DRAW', livesLeft: this.lives };
        }

        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        return { status: 'NEXT_TURN', livesLeft: this.lives };
    }

    public getGridCopy(): number[][] {
        const grid: number[][] = Array.from({ length: 7 }, () => []);
        for (let c = 0; c < 7; c++) {
            for (let r = 0; r < 6; r++) {
                const bit = GRID_MASKS[c][r];
                if ((this.positionP1 & bit) !== 0n) {
                    grid[c].push(1);
                } else if ((this.positionP2 & bit) !== 0n) {
                    grid[c].push(2);
                } else {
                    break;
                }
            }
        }
        return grid;
    }

    private isBoardFull(): boolean {
        for (let c = 0; c < 7; c++) {
            if ((this.mask & TOP_ROW_MASKS[c]) === 0n) {
                return false;
            }
        }
        return true;
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

    private extractWinningCells(board: bigint) {
        let winBits = 0n;
        
        let m = board & (board >> 1n);
        let w = m & (m >> 2n);
        if (w !== 0n) winBits |= w | (w << 1n) | (w << 2n) | (w << 3n);

        m = board & (board >> 7n);
        w = m & (m >> 14n);
        if (w !== 0n) winBits |= w | (w << 7n) | (w << 14n) | (w << 21n);

        m = board & (board >> 6n);
        w = m & (m >> 12n);
        if (w !== 0n) winBits |= w | (w << 6n) | (w << 12n) | (w << 18n);

        m = board & (board >> 8n);
        w = m & (m >> 16n);
        if (w !== 0n) winBits |= w | (w << 8n) | (w << 16n) | (w << 24n);

        this.winningCells = [];
        for (let c = 0; c < 7; c++) {
            for (let r = 0; r < 6; r++) {
                if ((winBits & GRID_MASKS[c][r]) !== 0n) {
                    this.winningCells.push({ c, r });
                }
            }
        }
    }
}