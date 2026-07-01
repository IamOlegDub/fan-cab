import { SelectedSlot } from '@/app/team/page';
import { Player } from '@/types/player';
import { SquadDraft } from '@/types/squad';
import { isValidStarters } from './isValidStarters';

export function isValidStarterSwap(
    draft: SquadDraft,
    players: Record<string, Player>,
    selectedSlot: SelectedSlot,
    targetSection: 'starters' | 'bench',
    targetIndex: number,
) {
    const selectedPlayerId = draft[selectedSlot.section][selectedSlot.index];
    const targetPlayerId = draft[targetSection][targetIndex];

    const nextStarters = [...draft.starters];

    if (selectedSlot.section === 'starters') {
        nextStarters[selectedSlot.index] = targetPlayerId;
    }

    if (targetSection === 'starters') {
        nextStarters[targetIndex] = selectedPlayerId;
    }

    return isValidStarters(nextStarters, players);
}
