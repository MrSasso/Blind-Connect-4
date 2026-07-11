export class GameEngine {
    private grid: number[][];
    public currentPlayer: number;
    public lives: number;
    
    public winningCells: {c: number, r: number}[] = [];
    public lastMove: {col: number, player: number} | null = null;

    constructor() {
        this.grid = [];
        this.currentPlayer = 1;
        this.lives = 3;
        this.resetGame();
    }

    public resetGame() {
        this.grid = Array.from({ length: 7 }, () => []);
        this.currentPlayer = 1;
        this.lives = 3;
        this.winningCells = [];
        this.lastMove = null;
    }

    public playMove(colIndex: number): { status: string, livesLeft: number, winner?: number } {
        const column = this.grid[colIndex];

        if (column.length >= 6) {
            this.lives--;
            if (this.lives <= 0) {
                return { status: 'GAME_OVER_LIVES', livesLeft: 0 };
            }
            return { status: 'ERROR_FULL', livesLeft: this.lives };
        }

        column.push(this.currentPlayer);
        const rowIndex = column.length - 1; 
        
        this.lastMove = { col: colIndex, player: this.currentPlayer };

        if (this.checkWinFrom(colIndex, rowIndex, this.currentPlayer)) {
            return { status: 'WIN', livesLeft: this.lives, winner: this.currentPlayer };
        }

        if (this.isBoardFull()) {
            return { status: 'DRAW', livesLeft: this.lives };
        }

        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        return { status: 'NEXT_TURN', livesLeft: this.lives };
    }

    public getGridCopy(): number[][] {
        return this.grid.map(col => [...col]);
    }

    private isBoardFull(): boolean {
        return this.grid.every(col => col.length === 6);
    }

    private getToken(c: number, r: number): number {
        if (c < 0 || c >= 7) return 0; 
        if (r < 0 || r >= this.grid[c].length) return 0; 
        return this.grid[c][r];
    }

    private checkWinFrom(col: number, row: number, player: number): boolean {
        const axes = [
            [[1, 0], [-1, 0]],
            [[0, -1]],
            [[1, 1], [-1, -1]], 
            [[1, -1], [-1, 1]]  
        ];

        let hasWon = false;
        let allWinningCells: {c: number, r: number}[] = [];

        for (const axis of axes) {
            let count = 1; 
            let currentAxisCells = [{c: col, r: row}];

            for (const [dc, dr] of axis) {
                let c = col + dc;
                let r = row + dr;

                while (c >= 0 && c < 7 && r >= 0 && r < 6 && this.getToken(c, r) === player) {
                    count++;
                    currentAxisCells.push({c, r});
                    c += dc;
                    r += dr;
                }
            }

            if (count >= 4) {
                hasWon = true;
                allWinningCells.push(...currentAxisCells); 
            }
        }

        if (hasWon) {
            this.winningCells = allWinningCells; 
            return true;
        }

        return false;
    }
}