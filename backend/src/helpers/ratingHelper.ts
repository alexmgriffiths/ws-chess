export enum GameResult {
    LOSS = -1,
    DRAW = 0.5,
    WIN = 1
}

const globalRatingDifference: number = 400;

export function calculateEloRating(playerRating: number, opponentRating: number, playerResult: GameResult) {
  const K_FACTOR = getKFactor(playerRating, opponentRating);

  const expectedScore =
    1 / (1 + Math.pow(10, (opponentRating - playerRating) / globalRatingDifference));
  const actualScore = playerResult;

  const ratingChange = K_FACTOR * (actualScore - expectedScore);

  return Math.round(playerRating + ratingChange);
}

function getKFactor(playerRating: number, opponentRating: number) {
    const MIN_K_FACTOR = 16; // minimum K factor to use
    const MAX_K_FACTOR = 32; // maximum K factor to use
    const RATING_DIFFERENCE_THRESHOLD = globalRatingDifference; // rating difference at which the K factor is capped
  
    // calculate the absolute difference in ratings
    const ratingDifference = Math.abs(playerRating - opponentRating);
  
    // cap the rating difference at the threshold
    const cappedRatingDifference = Math.min(ratingDifference, RATING_DIFFERENCE_THRESHOLD);
  
    // calculate the K factor based on the capped rating difference
    const kFactor = MIN_K_FACTOR + ((MAX_K_FACTOR - MIN_K_FACTOR) * (cappedRatingDifference / RATING_DIFFERENCE_THRESHOLD));
  
    return kFactor;
}