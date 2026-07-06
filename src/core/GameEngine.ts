export class GameEngine {
    private grid: number[][];
    public currentPlayer: number;
    public lives: number;

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

        if (this.checkWinFrom(colIndex, rowIndex, this.currentPlayer)) {
            return { status: 'WIN', livesLeft: this.lives, winner: this.currentPlayer };
        }

        if (this.isBoardFull()) {
            return { status: 'DRAW', livesLeft: this.lives };
        }

        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        return { status: 'NEXT_TURN', livesLeft: this.lives };
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

        for (const axis of axes) {
            let count = 0;

            for (const [dc, dr] of axis) {
                let c = col + dc;
                let r = row + dr;

                while (c >= 0 && c < 7 && r >= 0 && r < 6 && this.getToken(c, r) === player) {
                    count++;
                    c += dc;
                    r += dr;
                }
            }

            if (count >= 3) {
                return true;
            }
        }

        return false;
    }

    public getGridCopy(): number[][] {
        return this.grid.map(col => [...col]);
    }
}