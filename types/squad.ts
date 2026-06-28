export type SquadDraft = {
    userCode: string;
    roundId: string;

    starters: string[];
    bench: string[];

    c1: string;
    c2: string;

    originalStarters: string[];
    originalBench: string[];

    originalC1: string;
    originalC2: string;

    transferIn: string[];
    transferOut: string[];

    submittedAt: Date | null;
    updatedAt: Date | null;
};
