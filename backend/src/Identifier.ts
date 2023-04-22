import fs from 'fs';

export function parsePGNFile() {
    const fileContent = fs.readFileSync("eco.pgn", 'utf8');
    const games = [];
    let game: any = {};
    const lines = fileContent.split('\n').map(line => line.trim());
  
    for (const line of lines) {
      if (line.startsWith('[Site ')) {
        // start of a new game
        game = {
          site: line.substring(7, line.length - 2),
          white: '',
          black: '',
          moves: ''
        };
      } else if (line.startsWith('[White ')) {
        game.white = line.substring(8, line.length - 2);
      } else if (line.startsWith('[Black ')) {
        game.black = line.substring(8, line.length - 2);
      } else if (line.match(/^\d+\./)) {
        // move in the game
        game.moves = line
      } else if (line.trim() === '') {
        // end of game
        games[game.moves] = game;
      }
    }
  
    return games;
}
