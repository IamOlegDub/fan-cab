'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import type { Player } from '@/types/player';
import type { SquadDraft } from '@/types/squad';
import type { PlayerScoreInput } from '@/types/playerScore';
import {
    calculateTeamRoundResult,
    type TeamRoundResult,
} from '@/lib/results/calculateTeamRoundResult';
import { PlayerPointsSheet } from '@/components/results/PlayerPointsSheet';
import type { PlayerResultRow } from '@/lib/results/calculateTeamRoundResult';
import { PAST_ROUND_RESULTS, PAST_ROUNDS } from '@/constants/pastRoundResults';
import { PlayersGroup } from '@/components/results/PlayersGroup';

function getPastTotal(userCode: string) {
    return PAST_ROUNDS.reduce(
        (sum, round) => sum + (PAST_ROUND_RESULTS[round.id]?.[userCode] ?? 0),
        0,
    );
}

type PlayerRoundScore = {
    playerId: string;
    points: number;
    score: PlayerScoreInput;
};

type TeamResultWithTotals = TeamRoundResult & {
    totalPoints: number;
    round116Points: number;
};

export default function ResultsPage() {
    const [results, setResults] = useState<TeamResultWithTotals[]>([]);
    const [selectedPlayerRow, setSelectedPlayerRow] =
        useState<PlayerResultRow | null>(null);
    const [openedTeam, setOpenedTeam] = useState<string | null>(null);
    const [openedRoundKey, setOpenedRoundKey] = useState<string | null>(null);

    useEffect(() => {
        async function loadResults() {
            const selectedRoundId = 'round_116';

            const playersSnap = await getDocs(collection(db, 'players'));
            const draftsSnap = await getDocs(collection(db, 'squadDrafts'));
            const scoresSnap = await getDocs(
                collection(db, 'playerRoundScores'),
            );

            const players: Record<string, Player> = {};

            playersSnap.forEach((docSnap) => {
                players[docSnap.id] = {
                    id: docSnap.id,
                    ...(docSnap.data() as Omit<Player, 'id'>),
                };
            });

            const scores: Record<string, PlayerRoundScore> = {};

            scoresSnap.forEach((docSnap) => {
                const data = docSnap.data() as PlayerRoundScore & {
                    roundId: string;
                };

                if (data.roundId === selectedRoundId) {
                    scores[data.playerId] = data;
                }
            });

            const roundDrafts = draftsSnap.docs
                .map((docSnap) => docSnap.data() as SquadDraft)
                .filter((draft) => draft.roundId === selectedRoundId);

            const calculated = roundDrafts
                .map((draft) => {
                    const round116 = calculateTeamRoundResult({
                        draft,
                        players,
                        scores,
                    });

                    return {
                        ...round116,
                        totalPoints:
                            getPastTotal(draft.userCode) + round116.totalPoints,
                        round116Points: round116.totalPoints,
                    };
                })
                .sort((a, b) => b.totalPoints - a.totalPoints);

            setResults(calculated);
        }

        loadResults();
    }, []);

    return (
        <main className="mx-auto min-h-screen max-w-md bg-zinc-950 p-4 pb-24 text-white">
            <h1 className="mb-5 text-2xl font-bold">Результати</h1>

            <div className="space-y-3">
                {results.map((team, index) => {
                    const isOpen = openedTeam === team.userCode;

                    return (
                        <section
                            key={team.userCode}
                            className="rounded-2xl bg-zinc-900 p-4"
                        >
                            <button
                                type="button"
                                onClick={() =>
                                    setOpenedTeam(isOpen ? null : team.userCode)
                                }
                                className="flex w-full items-center justify-between text-left"
                            >
                                <div>
                                    <div className="text-sm text-zinc-400">
                                        #{index + 1}
                                    </div>
                                    <div className="text-xl font-bold">
                                        {team.userCode}
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className="text-2xl font-bold">
                                        {team.totalPoints}
                                    </div>
                                    <div className="text-xs text-zinc-400">
                                        балів
                                    </div>
                                </div>
                            </button>

                            {isOpen && (
                                <div className="mt-4 space-y-2">
                                    {PAST_ROUNDS.map((round) => (
                                        <div
                                            key={round.id}
                                            className="rounded-xl bg-zinc-800 p-3"
                                        >
                                            <div className="flex justify-between">
                                                <span>{round.label}</span>
                                                <span className="font-bold">
                                                    {PAST_ROUND_RESULTS[
                                                        round.id
                                                    ]?.[team.userCode] ?? 0}
                                                </span>
                                            </div>
                                        </div>
                                    ))}

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setOpenedRoundKey(
                                                openedRoundKey ===
                                                    `${team.userCode}_round_116`
                                                    ? null
                                                    : `${team.userCode}_round_116`,
                                            )
                                        }
                                        className="w-full rounded-xl bg-blue-600 p-3 text-left font-semibold"
                                    >
                                        <div className="flex justify-between">
                                            <span>1/16</span>
                                            <span>{team.round116Points}</span>
                                        </div>
                                    </button>

                                    {openedRoundKey ===
                                        `${team.userCode}_round_116` && (
                                        <div className="space-y-4 pt-2">
                                            <PlayersGroup
                                                title="Основа"
                                                rows={team.starters}
                                                onPlayerClick={
                                                    setSelectedPlayerRow
                                                }
                                            />

                                            <PlayersGroup
                                                title="Запас"
                                                rows={team.bench}
                                                onPlayerClick={
                                                    setSelectedPlayerRow
                                                }
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>
                    );
                })}
            </div>
            <PlayerPointsSheet
                row={selectedPlayerRow}
                onClose={() => setSelectedPlayerRow(null)}
            />
        </main>
    );
}
