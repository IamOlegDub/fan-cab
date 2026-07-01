import type { SquadDraft } from '@/types/squad';
import type { Player } from '@/types/player';
import type { PlayerScoreInput } from '@/types/playerScore';

type PlayerRoundScore = {
    playerId: string;
    points: number;
    score: PlayerScoreInput;
    match?: {
        homeCountry: string;
        awayCountry: string;
        homeScore: number;
        awayScore: number;
    };
};

export type PlayerResultRow = {
    playerId: string;
    player: Player;
    basePoints: number;
    finalPoints: number;
    isCaptain: boolean;
    captainLabel: 'C1' | 'C2' | null;
    score?: PlayerScoreInput;
    matchContext?: {
        playerCountry: string;
        homeCountry: string;
        awayCountry: string;
        homeScore: number;
        awayScore: number;
    } | null;
};

export type TeamRoundResult = {
    userCode: string;
    roundId: string;
    players: PlayerResultRow[];
    totalPoints: number;
    starters: PlayerResultRow[];
    bench: PlayerResultRow[];
};

export function calculateTeamRoundResult({
    draft,
    players,
    scores,
}: {
    draft: SquadDraft;
    players: Record<string, Player>;
    scores: Record<string, PlayerRoundScore>;
}): TeamRoundResult {
    const c1Score = scores[draft.c1];
    const c2Score = scores[draft.c2];

    const shouldDoubleC1 = Boolean(c1Score?.score.played);
    const shouldDoubleC2 = !shouldDoubleC1 && Boolean(c2Score?.score.played);

    const allPlayerIds = [...draft.starters, ...draft.bench];

    const playerRows = allPlayerIds
        .map((playerId) => {
            const player = players[playerId];

            if (!player) return null;

            const scoreDoc = scores[playerId];
            const basePoints = scoreDoc?.points ?? 0;

            const isC1 = playerId === draft.c1;
            const isC2 = playerId === draft.c2;

            const isCaptain =
                (isC1 && shouldDoubleC1) || (isC2 && shouldDoubleC2);

            const matchContext = scoreDoc?.match
                ? {
                      playerCountry: player.country,
                      homeCountry: scoreDoc.match.homeCountry,
                      awayCountry: scoreDoc.match.awayCountry,
                      homeScore: scoreDoc.match.homeScore,
                      awayScore: scoreDoc.match.awayScore,
                  }
                : null;

            return {
                playerId,
                player,
                basePoints,
                finalPoints: isCaptain ? basePoints * 2 : basePoints,
                isCaptain,
                captainLabel: isC1 ? 'C1' : isC2 ? 'C2' : null,
                score: scoreDoc?.score,
                matchContext,
            };
        })
        .filter(Boolean) as PlayerResultRow[];

    const starterIds = new Set(draft.starters);

    const starters = playerRows.filter((row) => starterIds.has(row.playerId));
    const bench = playerRows.filter((row) => !starterIds.has(row.playerId));

    return {
        userCode: draft.userCode,
        roundId: draft.roundId,
        players: playerRows,
        starters,
        bench,
        totalPoints: playerRows.reduce((sum, row) => sum + row.finalPoints, 0),
    };
}
