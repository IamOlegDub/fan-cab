import type { PlayerPosition } from '@/types/player';

export const SCORING = {
    appearance: 1,
    played60: 1,

    goalFromPlay: {
        GK: 10,
        DF: 5,
        MF: 4,
        FW: 3,
    } satisfies Record<PlayerPosition, number>,

    penaltyGoal: 2,

    hatTrickBonus: 1,
    pokerBonus: 2,

    assist: {
        GK: 3,
        DF: 2,
        MF: 1,
        FW: 1,
    } satisfies Record<PlayerPosition, number>,

    yellowCard: -1,
    redCard: -3,

    ownGoal: {
        GK: -2,
        DF: -3,
        MF: -4,
        FW: -4,
    } satisfies Record<PlayerPosition, number>,

    penaltyMissed: -4,

    penaltySaved: {
        GK: 4,
        DF: 7,
        MF: 7,
        FW: 7,
    } satisfies Record<PlayerPosition, number>,

    every4Saves: 1,
    manOfTheMatch: 2,

    cleanSheet: {
        GK: 2,
        DF: 3,
        MF: 1,
        FW: 0,
    } satisfies Record<PlayerPosition, number>,

    teamWin: 3,
    teamDraw: 1,
    teamLoss: -1,

    teamScore: 1,

    teamConceded: {
        GK: -1,
        DF: -2,
        MF: -1,
        FW: 0,
    } satisfies Record<PlayerPosition, number>,

    teamDoesNotScore: {
        GK: 0,
        DF: 0,
        MF: 0,
        FW: -1,
    } satisfies Record<PlayerPosition, number>,

    userTeamNoRedOrLessThan2Yellow: 2,
    userTeamAll60Plus: 2,
    userTeamNoSubs: 2,
    userTeamMoreThan3PlayersScore: 2,
    userTeamMoreThan3PlayersAssist: 2,
    userTeamMoreThan2PlayersMVP: 1,
    userTeamPlayedLessThan11Players: -3,
};
