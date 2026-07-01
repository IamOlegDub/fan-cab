import type { Player } from '@/types/player';
import type { SquadDraft } from '@/types/squad';

export function getSelectedPlayersForRound({
    drafts,
    players,
}: {
    drafts: SquadDraft[];
    players: Record<string, Player>;
}) {
    const playerIds = new Set<string>();

    drafts.forEach((draft) => {
        [...draft.starters, ...draft.bench].forEach((playerId) => {
            playerIds.add(playerId);
        });
    });

    return Array.from(playerIds)
        .map((playerId) => players[playerId])
        .filter(Boolean)
        .sort(
            (a, b) =>
                a.country.localeCompare(b.country) ||
                a.position.localeCompare(b.position) ||
                a.name.localeCompare(b.name),
        );
}
