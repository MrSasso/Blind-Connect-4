export class Bot {
    
    public getMove(gridCopy: number[][], difficulty: string = 'EASY'): number {
        const validMoves = this.getValidMoves(gridCopy);
        if (validMoves.length === 0) return 0;

        const totalPieces = gridCopy.reduce((sum, col) => sum + col.length, 0);
        const botPlayer = (totalPieces % 2 === 0) ? 1 : 2;
        const humanPlayer = botPlayer === 1 ? 2 : 1;

        switch (difficulty) {
            case 'EASY':
                return this.getRandomMove(validMoves);
            case 'MEDIUM':
                return this.getMinimaxMove(gridCopy, 2, botPlayer, humanPlayer);
            case 'HARD':
                return this.getMinimaxMove(gridCopy, 5, botPlayer, humanPlayer);
            case 'EXTREME':
                return this.getMinimaxMove(gridCopy, 7, botPlayer, humanPlayer);
            default:
                return this.getRandomMove(validMoves);
        }
    }

    private getRandomMove(validMoves: number[]): number {
        const randomIndex = Math.floor(Math.random() * validMoves.length);
        return validMoves[randomIndex];
    }

    private getMinimaxMove(grid: number[][], depth: number, botPlayer: number, humanPlayer: number): number {
        const validMoves = this.getValidMoves(grid);
        let bestScore = -Infinity;
        let bestMove = validMoves[Math.floor(Math.random() * validMoves.length)];

        for (const col of validMoves) {
            grid[col].push(botPlayer);
            
            const score = this.minimax(grid, depth - 1, -Infinity, Infinity, false, botPlayer, humanPlayer);
            
            grid[col].pop(); 

            if (score > bestScore) {
                bestScore = score;
                bestMove = col;
            }
        }
        return bestMove;
    }

    private minimax(grid: number[][], depth: number, alpha: number, beta: number, isMaximizing: boolean, botPlayer: number, humanPlayer: number): number {
        if (this.checkWin(grid, botPlayer)) return 1000000 + depth;
        if (this.checkWin(grid, humanPlayer)) return -1000000 - depth;
        
        const validMoves = this.getValidMoves(grid);
        if (validMoves.length === 0) return 0;

        if (depth === 0) {
            return this.evaluateBoard(grid, botPlayer, humanPlayer);
        }

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const col of validMoves) {
                grid[col].push(botPlayer);
                const evalScore = this.minimax(grid, depth - 1, alpha, beta, false, botPlayer, humanPlayer);
                grid[col].pop();
                
                maxEval = Math.max(maxEval, evalScore);
                alpha = Math.max(alpha, evalScore);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const col of validMoves) {
                grid[col].push(humanPlayer);
                const evalScore = this.minimax(grid, depth - 1, alpha, beta, true, botPlayer, humanPlayer);
                grid[col].pop();
                
                minEval = Math.min(minEval, evalScore);
                beta = Math.min(beta, evalScore);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    }


    private evaluateBoard(grid: number[][], botPlayer: number, humanPlayer: number): number {
        let score = 0;

        const centerCol = grid[3];
        let centerCount = 0;
        for (let r = 0; r < centerCol.length; r++) {
            if (centerCol[r] === botPlayer) centerCount++;
        }
        score += centerCount * 3;

        for (let r = 0; r < 6; r++) {
            for (let c = 0; c < 4; c++) {
                const window = [this.getToken(grid, c, r), this.getToken(grid, c + 1, r), this.getToken(grid, c + 2, r), this.getToken(grid, c + 3, r)];
                score += this.evaluateWindow(window, botPlayer, humanPlayer);
            }
        }
        for (let c = 0; c < 7; c++) {
            for (let r = 0; r < 3; r++) {
                const window = [this.getToken(grid, c, r), this.getToken(grid, c, r + 1), this.getToken(grid, c, r + 2), this.getToken(grid, c, r + 3)];
                score += this.evaluateWindow(window, botPlayer, humanPlayer);
            }
        }
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 4; c++) {
                const window = [this.getToken(grid, c, r), this.getToken(grid, c + 1, r + 1), this.getToken(grid, c + 2, r + 2), this.getToken(grid, c + 3, r + 3)];
                score += this.evaluateWindow(window, botPlayer, humanPlayer);
            }
        }
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 4; c++) {
                const window = [this.getToken(grid, c, r + 3), this.getToken(grid, c + 1, r + 2), this.getToken(grid, c + 2, r + 1), this.getToken(grid, c + 3, r)];
                score += this.evaluateWindow(window, botPlayer, humanPlayer);
            }
        }
        return score;
    }

    private evaluateWindow(window: number[], botPlayer: number, humanPlayer: number): number {
        let score = 0;
        let botCount = 0;
        let humanCount = 0;
        let emptyCount = 0;

        for (const token of window) {
            if (token === botPlayer) botCount++;
            else if (token === humanPlayer) humanCount++;
            else emptyCount++;
        }

        if (botCount === 4) score += 10000; 
        else if (botCount === 3 && emptyCount === 1) score += 5;
        else if (botCount === 2 && emptyCount === 2) score += 2;

        if (humanCount === 3 && emptyCount === 1) score -= 80;

        return score;
    }


    private getValidMoves(grid: number[][]): number[] {
        const validMoves: number[] = [];
        for (let i = 0; i < 7; i++) {
            if (grid[i].length < 6) validMoves.push(i);
        }
        return validMoves;
    }

    private getToken(grid: number[][], c: number, r: number): number {
        if (c < 0 || c >= 7) return 0;
        if (r < 0 || r >= grid[c].length) return 0; 
        return grid[c][r];
    }

    private checkWin(grid: number[][], player: number): boolean {
        for (let c = 0; c < 4; c++) {
            for (let r = 0; r < 6; r++) {
                if (this.getToken(grid, c, r) === player && this.getToken(grid, c+1, r) === player &&
                    this.getToken(grid, c+2, r) === player && this.getToken(grid, c+3, r) === player) return true;
            }
        }
        for (let c = 0; c < 7; c++) {
            for (let r = 0; r < 3; r++) {
                if (this.getToken(grid, c, r) === player && this.getToken(grid, c, r+1) === player &&
                    this.getToken(grid, c, r+2) === player && this.getToken(grid, c, r+3) === player) return true;
            }
        }
        for (let c = 0; c < 4; c++) {
            for (let r = 0; r < 3; r++) {
                if (this.getToken(grid, c, r) === player && this.getToken(grid, c+1, r+1) === player &&
                    this.getToken(grid, c+2, r+2) === player && this.getToken(grid, c+3, r+3) === player) return true;
            }
        }
        for (let c = 0; c < 4; c++) {
            for (let r = 3; r < 6; r++) {
                if (this.getToken(grid, c, r) === player && this.getToken(grid, c+1, r-1) === player &&
                    this.getToken(grid, c+2, r-2) === player && this.getToken(grid, c+3, r-3) === player) return true;
            }
        }
        return false;
    }
}