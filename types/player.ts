export type PlayerPosition = 'GK' | 'DF' | 'MF' | 'FW';

export type Player = {
    id: string;
    name: string;
    position: PlayerPosition;
    country: string;
    team?: string; // клуб/збірна, для ліміту 1 з команди
};
