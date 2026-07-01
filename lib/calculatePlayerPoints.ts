import { SCORING } from '@/constants/scoring';
import type { Player } from '@/types/player';
import type { PlayerMatchContext, PlayerScoreInput } from '@/types/playerScore';

function getTeamScores(context: PlayerMatchContext) {
    const isHome = context.playerCountry === context.homeCountry;

    return {
        teamScore: isHome ? context.homeScore : context.awayScore,
        opponentScore: isHome ? context.awayScore : context.homeScore,
    };
}

export function calculatePlayerPoints(
    player: Player,
    score: PlayerScoreInput,
    context: PlayerMatchContext,
) {
    if (!score.played) return 0;

    const { teamScore, opponentScore } = getTeamScores(context);

    let points = 0;

    points += SCORING.appearance;

    if (score.played60) points += SCORING.played60;

    points += score.goals * SCORING.goalFromPlay[player.position];
    points += score.penaltyGoals * SCORING.penaltyGoal;

    const totalGoals = score.goals + score.penaltyGoals;

    if (totalGoals >= 4) {
        points += SCORING.pokerBonus;
    } else if (totalGoals >= 3) {
        points += SCORING.hatTrickBonus;
    }

    points += score.assists * SCORING.assist[player.position];

    points += score.yellowCards * SCORING.yellowCard;
    points += score.redCards * SCORING.redCard;

    points += score.ownGoals * SCORING.ownGoal[player.position];

    points += score.penaltyMissed * SCORING.penaltyMissed;
    points += score.penaltySaved * SCORING.penaltySaved[player.position];

    if (player.position === 'GK') {
        points += Math.floor(score.saves / 4) * SCORING.every4Saves;
    }

    if (score.manOfTheMatch) {
        points += SCORING.manOfTheMatch;
    }

    if (opponentScore === 0) {
        points += SCORING.cleanSheet[player.position];
    }

    if (teamScore > opponentScore) points += SCORING.teamWin;
    if (teamScore === opponentScore) points += SCORING.teamDraw;
    if (teamScore < opponentScore) points += SCORING.teamLoss;

    points += teamScore * SCORING.teamScore;
    points += opponentScore * SCORING.teamConceded[player.position];

    if (teamScore === 0) {
        points += SCORING.teamDoesNotScore[player.position];
    }

    return points;
}
