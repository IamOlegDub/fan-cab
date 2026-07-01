import { SquadDraft } from '@/types/squad';

export function moveCaptainIfNeeded(
    draft: SquadDraft,
    oldPlayerId: string,
    newPlayerId: string,
): SquadDraft {
    return {
        ...draft,
        c1: draft.c1 === oldPlayerId ? newPlayerId : draft.c1,
        c2: draft.c2 === oldPlayerId ? newPlayerId : draft.c2,
    };
}
