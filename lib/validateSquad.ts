import type { Player } from '@/types/player';
import type { SquadDraft } from '@/types/squad';

type ValidationResult = {
    isValid: boolean;
    errors: string[];
};

type RoundRules = {
    maxTransfers: number;
    maxFromSameTeam: number;
};

export function validateSquad(
    draft: SquadDraft,
    players: Record<string, Player>,
    round: RoundRules,
): ValidationResult {
    const errors: string[] = [];

    const allPlayerIds = [...draft.starters, ...draft.bench];

    const uniquePlayerIds = new Set(allPlayerIds);

    if (draft.starters.length !== 11) {
        errors.push('В основі має бути 11 гравців.');
    }

    if (draft.bench.length !== 4) {
        errors.push('У запасі має бути 4 гравці.');
    }

    if (allPlayerIds.length !== uniquePlayerIds.size) {
        errors.push('У складі є дубльований гравець.');
    }

    const starters = draft.starters.map((id) => players[id]).filter(Boolean);

    const squad = allPlayerIds.map((id) => players[id]).filter(Boolean);

    const starterGK = starters.filter(
        (player) => player.position === 'GK',
    ).length;
    const starterDF = starters.filter(
        (player) => player.position === 'DF',
    ).length;

    if (starterGK !== 1) {
        errors.push('В основі має бути рівно 1 воротар.');
    }

    if (starterDF < 3) {
        errors.push('В основі має бути мінімум 3 захисники.');
    }

    const totalGK = squad.filter((player) => player.position === 'GK').length;
    const totalDF = squad.filter((player) => player.position === 'DF').length;
    const totalMF = squad.filter((player) => player.position === 'MF').length;
    const totalFW = squad.filter((player) => player.position === 'FW').length;

    if (totalGK !== 2) {
        errors.push('У команді має бути 2 воротарі.');
    }

    if (totalDF > 5) {
        errors.push('У команді максимум 5 захисників.');
    }

    if (totalMF > 5) {
        errors.push('У команді максимум 5 півзахисників.');
    }

    if (totalFW > 3) {
        errors.push('У команді максимум 3 нападники.');
    }

    if (!draft.starters.includes(draft.c1)) {
        errors.push('C1 має бути в основі.');
    }

    if (!draft.starters.includes(draft.c2)) {
        errors.push('C2 має бути в основі.');
    }

    if (draft.c1 && draft.c2 && draft.c1 === draft.c2) {
        errors.push('C1 і C2 не можуть бути одним гравцем.');
    }

    if (draft.transferIn.length > round.maxTransfers) {
        errors.push(
            `Максимум трансферів для цього туру: ${round.maxTransfers}.`,
        );
    }

    const countryCounts = [...draft.starters, ...draft.bench].reduce(
        (acc, playerId) => {
            const player = players[playerId];

            if (!player) return acc;

            acc[player.country] = (acc[player.country] ?? 0) + 1;

            return acc;
        },
        {} as Record<string, number>,
    );

    const invalidCountries = Object.entries(countryCounts).filter(
        ([, count]) => count > round.maxFromSameTeam,
    );

    if (invalidCountries.length > 0) {
        errors.push(
            `Максимум гравців з однієї збірної: ${round.maxFromSameTeam}.`,
        );
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}
