import { SCORING } from '@/constants/scoring';
import type { Player } from '@/types/player';
import type { PlayerMatchContext, PlayerScoreInput } from '@/types/playerScore';

type BreakdownItem = {
    label: string;
    points: number;
};

function getTeamScores(context: PlayerMatchContext) {
    const isHome = context.playerCountry === context.homeCountry;

    return {
        teamScore: isHome ? context.homeScore : context.awayScore,
        opponentScore: isHome ? context.awayScore : context.homeScore,
    };
}

export function buildPlayerPointsBreakdown({
    player,
    score,
    context,
    isCaptain,
    basePoints,
    finalPoints,
}: {
    player: Player;
    score?: PlayerScoreInput;
    context?: PlayerMatchContext | null;
    isCaptain: boolean;
    basePoints: number;
    finalPoints: number;
}): BreakdownItem[] {
    if (!score || !score.played || !context) {
        return [{ label: 'Не виходив на поле', points: 0 }];
    }

    const { teamScore, opponentScore } = getTeamScores(context);

    const items: BreakdownItem[] = [];

    items.push({ label: 'Вийшов на поле', points: SCORING.appearance });

    if (score.played60) {
        items.push({ label: '60+ хвилин', points: SCORING.played60 });
    }

    if (score.goals > 0) {
        items.push({
            label: `Голи з гри ×${score.goals}`,
            points: score.goals * SCORING.goalFromPlay[player.position],
        });
    }

    if (score.penaltyGoals > 0) {
        items.push({
            label: `Голи з пенальті ×${score.penaltyGoals}`,
            points: score.penaltyGoals * SCORING.penaltyGoal,
        });
    }

    const totalGoals = score.goals + score.penaltyGoals;

    if (totalGoals >= 4) {
        items.push({ label: 'Покер', points: SCORING.pokerBonus });
    } else if (totalGoals >= 3) {
        items.push({ label: 'Хет-трик', points: SCORING.hatTrickBonus });
    }

    if (score.assists > 0) {
        items.push({
            label: `Асисти ×${score.assists}`,
            points: score.assists * SCORING.assist[player.position],
        });
    }

    if (score.yellowCards > 0) {
        items.push({
            label: `Жовті картки ×${score.yellowCards}`,
            points: score.yellowCards * SCORING.yellowCard,
        });
    }

    if (score.redCards > 0) {
        items.push({
            label: `Червоні картки ×${score.redCards}`,
            points: score.redCards * SCORING.redCard,
        });
    }

    if (score.ownGoals > 0) {
        items.push({
            label: `Автоголи ×${score.ownGoals}`,
            points: score.ownGoals * SCORING.ownGoal[player.position],
        });
    }

    if (score.penaltyMissed > 0) {
        items.push({
            label: `Незабиті пенальті ×${score.penaltyMissed}`,
            points: score.penaltyMissed * SCORING.penaltyMissed,
        });
    }

    if (score.penaltySaved > 0) {
        items.push({
            label: `Відбиті пенальті ×${score.penaltySaved}`,
            points: score.penaltySaved * SCORING.penaltySaved[player.position],
        });
    }

    if (player.position === 'GK' && score.saves > 0) {
        items.push({
            label: `Сейви: ${score.saves}`,
            points: Math.floor(score.saves / 4) * SCORING.every4Saves,
        });
    }

    if (score.manOfTheMatch) {
        items.push({
            label: 'Найкращий гравець матчу',
            points: SCORING.manOfTheMatch,
        });
    }

    if (opponentScore === 0) {
        items.push({
            label: 'Команда не пропустила',
            points: SCORING.cleanSheet[player.position],
        });
    }

    if (teamScore > opponentScore) {
        items.push({ label: 'Перемога команди', points: SCORING.teamWin });
    } else if (teamScore === opponentScore) {
        items.push({ label: 'Нічия команди', points: SCORING.teamDraw });
    } else {
        items.push({ label: 'Поразка команди', points: SCORING.teamLoss });
    }

    if (teamScore > 0) {
        items.push({
            label: `Голи команди ×${teamScore}`,
            points: teamScore * SCORING.teamScore,
        });
    }

    if (opponentScore > 0) {
        items.push({
            label: `Пропущені голи ×${opponentScore}`,
            points: opponentScore * SCORING.teamConceded[player.position],
        });
    }

    if (teamScore === 0) {
        items.push({
            label: 'Команда не забила',
            points: SCORING.teamDoesNotScore[player.position],
        });
    }

    if (isCaptain) {
        items.push({
            label: 'Капітан ×2',
            points: finalPoints - basePoints,
        });
    }

    return items.filter((item) => item.points !== 0);
}
