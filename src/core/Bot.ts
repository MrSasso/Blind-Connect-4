export class Bot {
        public getMove(gridCopy: number[][]): number {
        
        const validMoves: number[] = [];
        for (let i = 0; i < 7; i++) {
            if (gridCopy[i].length < 6) {
                validMoves.push(i);
            }
        }
        
        if (validMoves.length === 0) return 0;

        const randomIndex = Math.floor(Math.random() * validMoves.length);
        return validMoves[randomIndex];
    }
}