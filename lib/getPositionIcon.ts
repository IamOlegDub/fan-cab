import { PlayerPosition } from '@/types/player';

export function getPositionIcon(position: PlayerPosition | string) {
    switch (position) {
        case 'GK':
            return '🟠';
        case 'DF':
            return '🔵';
        case 'MF':
            return '🟢';
        case 'FW':
            return '🔴';
        default:
            return '⚪';
    }
}
