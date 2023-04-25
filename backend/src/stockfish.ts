import { spawn } from "child_process";

export class Stockfish {

    public stockfish: any;

    constructor() {

        let buffer: string = "";
        this.stockfish = spawn(process.env.SF_BINARY as string);
        this.stockfish.stdout.on('data', (data: string) => {
            buffer += data.toString();
            let lines: string[] = buffer.split('\n');
            buffer = lines.pop() as string;

            for(let line of lines) {
                if(line.startsWith('bestmove')) {
                    console.log("BEST MOVE: ", line);
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


}