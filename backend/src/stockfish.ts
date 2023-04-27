import { spawn } from "child_process";

export class Stockfish {

    public stockfish: any;
    public bestMove: string | null;

    constructor() {
        this.bestMove = null;
        let buffer: string = "";
        this.stockfish = spawn(process.env.SF_BINARY as string);
        
        // TODO: Configure the difficulty here
        this.write("setoption name Skill Level value 1\n");
        this.write("setoption name Hash value 1\n");
        this.write("setoption name UCI_LimitStrength true\n");
        this.stockfish.stdout.on('data', (data: string) => {
            buffer += data.toString();
            let lines: string[] = buffer.split('\n');
            buffer = lines.pop() as string;

            for(let line of lines) {
                if(line.startsWith('bestmove')) {
                    console.log("BEST MOVE: ", line);
                    this.bestMove = line.trim().split(' ')[1];
                } else {
                    //console.log("INFO: ", line);
                }
            }
        });
        
    }

    write(query: string) {
        this.stockfish.stdin.write(query + "\n");
    }

    setDifficulty(level: number) {
        this.write("setoption name Skill Level value " + level);
    }

    setPosition(position: string) {
        this.write('position ' + position);
    }

    loadFen(fen: string) {
        this.setPosition("fen " + fen);
    }

    // Todo: Calculate this based on fen not per class
    // Otherwise each game will have to have it's own instance of Stockfish running :(
    async getBestMove(): Promise<string> {
        return new Promise((resolve) => {
            if(this.bestMove !== null) {
                resolve(this.bestMove);
            } else {
                setTimeout(async () => {
                    resolve(await this.getBestMove());
                }, 100);
            }
        });
    }

}