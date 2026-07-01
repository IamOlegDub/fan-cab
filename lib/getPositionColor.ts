import { Player } from '@/types/player';

export function getPositionColor(position: Player['position']) {
    switch (position) {
        case 'GK':
            return 'bg-orange-500';
        case 'DF':
            return 'bg-sky-500';
        case 'MF':
            return 'bg-emerald-500';
        case 'FW':
            return 'bg-red-500';
        default:
            return 'bg-zinc-500';
    }
}
