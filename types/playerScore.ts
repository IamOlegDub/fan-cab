export type PlayerScoreInput = {
    played: boolean;
    played60: boolean;

    goals: number;
    penaltyGoals: number;
    assists: number;

    yellowCards: number;
    redCards: number;

    ownGoals: number;
    penaltyMissed: number;
    penaltySaved: number;

    saves: number;
    manOfTheMatch: boolean;
};

export type TeamResult = 'win' | 'draw' | 'loss';

export type PlayerMatchContext = {
    playerCountry: string;
    homeCountry: string;
    awayCountry: string;
    homeScore: number;
    awayScore: number;
};
