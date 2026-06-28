import { Timestamp } from 'firebase/firestore';

export type Round = {
    id: string;
    name: string;
    deadline: Timestamp;
    isLocked: boolean;
    maxTransfers: number;
    maxFromSameTeam: number;
};
