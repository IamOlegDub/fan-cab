import { Player } from '@/types/player';

export function isValidStarters(
    starterIds: string[],
    players: Record<string, Player>,
) {
    const counts = starterIds.reduce(
        (acc, playerId) => {
            const player = players[playerId];

            if (!player) return acc;

            acc[player.position] += 1;

            return acc;
        },
        {
            GK: 0,
            DF: 0,
            MF: 0,
            FW: 0,
        },
    );

    return counts.GK === 1 && counts.DF >= 3 && counts.FW <= 3;
}
