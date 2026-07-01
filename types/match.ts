export type MatchStatus = 'scheduled' | 'live' | 'finished';

export type Match = {
    id: string;
    roundId: string;
    stage: string;

    homeCountry: string;
    awayCountry: string;

    homeScore: number | null;
    awayScore: number | null;

    status: MatchStatus;

    createdAt?: unknown;
    updatedAt?: unknown;
};
