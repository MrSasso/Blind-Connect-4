export class Bot {
    
    public getMove(gridCopy: boolean[][], botStarting: boolean = false, difficulty: string = 'EASY'): number {
        switch (difficulty) {
            case 'EASY':
                return this.choosingMove(gridCopy, botStarting, [50, 80, 40]);
            case 'MEDIUM':
                return this.choosingMove(gridCopy, botStarting, [80, 80, 80]);
            case 'HARD':
                return this.choosingMove(gridCopy, botStarting, [100, 90, 95]);
            case 'EXTREME':
                return this.choosingMove(gridCopy, botStarting, [100, 100, 100]);
            default:
                return this.choosingMove(gridCopy, botStarting, [100, 100, 100]);
        }
        
    }

    private choosingMove(gridCopy: boolean[][], botStarting: boolean = false, probabilities: number[]): number{
        let res = [0, 1, 2, 3, 4, 5, 6];
        
        if(probabilities[0] > Math.random() * 100)
            this.winningMoves(gridCopy, botStarting, res);
        else if(probabilities[1] > Math.random() * 100)
            this.blockingMoves(gridCopy, botStarting, res);
        else if(probabilities[2] > Math.random() * 100)
            this.eraseBadMoves(gridCopy, botStarting, res);
        return res[Math.floor(Math.random() * res.length)];
    }

    private winningMoves(gridCopy: boolean[][], botStarting: boolean = false, res: number[]) {
        for(let i = 6; i >= 0; i--) {
            gridCopy[i].push(botStarting);
            this.checkWin(gridCopy, botStarting, i) ? null : res.splice(i, 1);
            gridCopy[i].pop();
        }
    }

    private blockingMoves(gridCopy: boolean[][], botStarting: boolean = false, res: number[]) {
        for(let i = 6; i >= 0; i--) {
            gridCopy[i].push(!botStarting);
            this.checkWin(gridCopy, !botStarting, i) ? null : res.splice(i, 1);
            gridCopy[i].pop();
        }
    }

    private eraseBadMoves(gridCopy: boolean[][], botStarting: boolean = false, res: number[]) {
        for(let i = 6; i >= 0; i--) {
            gridCopy[i].push(botStarting);
            gridCopy[i].push(!botStarting);
            this.checkWin(gridCopy, !botStarting, i) ? res.splice(i, 1) : null;
            gridCopy[i].pop();
            gridCopy[i].pop();
        }
    }

    private checkWin(gridCopy: boolean[][], player: boolean, lastMove: number): boolean {
        const axes = [
            [[1, 0], [-1, 0]],
            [[0, -1]],
            [[1, 1], [-1, -1]],
            [[1, -1], [-1, 1]]
        ];

        const startPos = { x: lastMove, y: gridCopy[lastMove].length - 1 };

        for(const axis of axes) {
            let counter = 1;
            for(const direction of axis) {
                let position = startPos;
                while(gridCopy[position.x + direction[0]]?.[position.y + direction[1]] === player)
                {
                    position = { x: position.x + direction[0], y: position.y + direction[1] };
                    counter++;
                }
            }
            if(counter >= 4) {
                return true;
            }
        }
        
        return false;
    }
}