'use client';

import { auth, db } from '@/lib/firebase';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';

import { MATCHES } from '@/constants/matches';
import { MatchSelector } from '@/components/admin/MatchSelector';
import { getSelectedPlayersForRound } from '@/lib/getSelectedPlayersForRound';
import type { Player } from '@/types/player';
import type { SquadDraft } from '@/types/squad';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { PlayerScoreSheet } from '@/components/admin/PlayerScoreSheet';
import type { PlayerScoreInput } from '@/types/playerScore';

export default function AdminPage() {
    const [secret, setSecret] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [message, setMessage] = useState('');
    const [selectedRoundId, setSelectedRoundId] = useState('round_116');
    const [selectedMatchId, setSelectedMatchId] = useState('');
    const [players, setPlayers] = useState<Record<string, Player>>({});
    const [drafts, setDrafts] = useState<SquadDraft[]>([]);
    const [homeScore, setHomeScore] = useState('');
    const [awayScore, setAwayScore] = useState('');
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
    const [savedScores, setSavedScores] = useState<
        Record<string, PlayerScoreInput>
    >({});
    const [savedMatchScores, setSavedMatchScores] = useState<
        Record<string, { homeScore: number | null; awayScore: number | null }>
    >({});

    const selectedMatch = MATCHES.find((match) => match.id === selectedMatchId);

    const selectedPlayers = getSelectedPlayersForRound({
        drafts,
        players,
    });

    const matchPlayers = selectedMatch
        ? selectedPlayers.filter(
              (player) =>
                  player.country === selectedMatch.homeCountry ||
                  player.country === selectedMatch.awayCountry,
          )
        : [];

    const parsedHomeScore = homeScore === '' ? null : Number(homeScore);
    const parsedAwayScore = awayScore === '' ? null : Number(awayScore);

    const selectedPlayerMatchContext =
        selectedPlayer &&
        selectedMatch &&
        parsedHomeScore !== null &&
        parsedAwayScore !== null
            ? {
                  playerCountry: selectedPlayer.country,
                  homeCountry: selectedMatch.homeCountry,
                  awayCountry: selectedMatch.awayCountry,
                  homeScore: parsedHomeScore,
                  awayScore: parsedAwayScore,
              }
            : null;

    useEffect(() => {
        async function loadRoundData() {
            const playersSnap = await getDocs(collection(db, 'players'));

            const playersMap: Record<string, Player> = {};

            playersSnap.forEach((playerDoc) => {
                playersMap[playerDoc.id] = {
                    id: playerDoc.id,
                    ...(playerDoc.data() as Omit<Player, 'id'>),
                };
            });

            setPlayers(playersMap);

            const draftsQuery = query(
                collection(db, 'squadDrafts'),
                where('roundId', '==', selectedRoundId),
            );

            const draftsSnap = await getDocs(draftsQuery);

            setDrafts(
                draftsSnap.docs.map(
                    (draftDoc) => draftDoc.data() as SquadDraft,
                ),
            );

            const scoresQuery = query(
                collection(db, 'playerRoundScores'),
                where('roundId', '==', selectedRoundId),
            );

            const scoresSnap = await getDocs(scoresQuery);

            const scoresMap: Record<string, PlayerScoreInput> = {};
            const matchScoresMap: Record<
                string,
                { homeScore: number | null; awayScore: number | null }
            > = {};

            scoresSnap.forEach((scoreDoc) => {
                const data = scoreDoc.data();

                if (data.playerId && data.score) {
                    scoresMap[data.playerId] = data.score as PlayerScoreInput;
                }

                if (data.matchId && data.match) {
                    matchScoresMap[data.matchId] = {
                        homeScore: data.match.homeScore ?? null,
                        awayScore: data.match.awayScore ?? null,
                    };
                }
            });

            setSavedScores(scoresMap);
            setSavedMatchScores(matchScoresMap);
        }

        loadRoundData();
    }, [selectedRoundId]);

    async function getIdToken() {
        const user = auth.currentUser;

        if (!user) {
            throw new Error('Not authenticated');
        }

        return user.getIdToken();
    }

    async function handleExportRound() {
        const token = await getIdToken();
        setIsExporting(true);
        setMessage('');

        try {
            const response = await fetch('/api/admin/export-round', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    roundId: 'round_116',
                }),
            });

            if (!response.ok) {
                throw new Error('Export failed');
            }

            setMessage('Склади експортовано в Google Sheets');
        } catch {
            setMessage('Помилка експорту');
        } finally {
            setIsExporting(false);
        }
    }

    async function setRoundLock(roundId: string, isLocked: boolean) {
        const token = await getIdToken();
        setIsExporting(true);
        setMessage('');

        try {
            const response = await fetch('/api/admin/set-round-lock', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ roundId, isLocked }),
            });

            if (!response.ok) throw new Error();

            setMessage(isLocked ? 'Тур заблоковано' : 'Тур розблоковано');
        } catch {
            setMessage('Помилка зміни статусу туру');
        } finally {
            setIsExporting(false);
        }
    }

    async function createRound18() {
        const token = await getIdToken();
        setIsExporting(true);
        setMessage('');

        try {
            const response = await fetch('/api/admin/create-next-round', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    fromRoundId: 'round_116',
                    toRoundId: 'round_18',
                    toRoundName: '1/8',
                    maxTransfers: 4,
                    maxFromSameTeam: 2,
                }),
            });

            if (!response.ok) throw new Error();

            setMessage('1/8 створено зі складів 1/16');
        } catch {
            setMessage('Помилка створення 1/8');
        } finally {
            setIsExporting(false);
        }
    }

    return (
        <main className="mx-auto min-h-screen max-w-md bg-zinc-950 p-4 pb-24 text-white">
            <h1 className="mb-5 text-2xl font-bold">Admin</h1>

            <details className="rounded-2xl bg-zinc-900 p-4 mb-5">
                <summary className="cursor-pointer text-lg font-bold">
                    Керування складами
                </summary>

                <div className="mt-4 space-y-3">
                    <button
                        type="button"
                        disabled={isExporting || !secret}
                        onClick={handleExportRound}
                        className="w-full rounded-xl bg-zinc-800 py-3 font-semibold"
                    >
                        {isExporting ? 'Експорт...' : 'Експортувати всі склади'}
                    </button>

                    <button
                        type="button"
                        disabled={isExporting || !secret}
                        onClick={() => setRoundLock('round_116', true)}
                        className="w-full rounded-xl bg-red-600 py-3 font-semibold"
                    >
                        Заблокувати 1/16
                    </button>

                    <button
                        type="button"
                        disabled={isExporting || !secret}
                        onClick={() => setRoundLock('round_116', false)}
                        className="w-full rounded-xl bg-zinc-800 py-3 font-semibold"
                    >
                        Розблокувати 1/16
                    </button>

                    <button
                        type="button"
                        disabled={isExporting || !secret}
                        onClick={createRound18}
                        className="w-full rounded-xl bg-blue-600 py-3 font-semibold"
                    >
                        Створити 1/8 зі складів 1/16
                    </button>
                </div>
            </details>

            <section className="mb-4 rounded-2xl bg-zinc-900 p-4">
                <h2 className="mb-3 text-lg font-bold">Поточний тур</h2>

                <select
                    value={selectedRoundId}
                    onChange={(event) => setSelectedRoundId(event.target.value)}
                    className="w-full rounded-xl bg-zinc-800 px-3 py-3 text-white"
                >
                    <option value="round_116">1/16</option>
                    <option value="round_18">1/8</option>
                </select>
            </section>

            <section className="mb-4 rounded-2xl bg-zinc-900 p-4">
                <h2 className="mb-3 text-lg font-bold">Матч і бали</h2>

                <MatchSelector
                    roundId={selectedRoundId}
                    selectedMatchId={selectedMatchId}
                    matches={MATCHES}
                    onChange={(matchId) => {
                        setSelectedMatchId(matchId);

                        const savedMatchScore = savedMatchScores[matchId];

                        setHomeScore(
                            savedMatchScore?.homeScore === null ||
                                savedMatchScore?.homeScore === undefined
                                ? ''
                                : String(savedMatchScore.homeScore),
                        );

                        setAwayScore(
                            savedMatchScore?.awayScore === null ||
                                savedMatchScore?.awayScore === undefined
                                ? ''
                                : String(savedMatchScore.awayScore),
                        );
                    }}
                />

                {selectedMatch && (
                    <section className="mt-4 rounded-2xl bg-zinc-900 p-4">
                        <h2 className="mb-3 text-lg font-bold text-white">
                            Рахунок матчу
                        </h2>

                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="number"
                                value={homeScore}
                                onChange={(event) =>
                                    setHomeScore(event.target.value)
                                }
                                placeholder={selectedMatch.homeCountry}
                                className="rounded-xl bg-zinc-800 px-3 py-3 text-white"
                            />

                            <input
                                type="number"
                                value={awayScore}
                                onChange={(event) =>
                                    setAwayScore(event.target.value)
                                }
                                placeholder={selectedMatch.awayCountry}
                                className="rounded-xl bg-zinc-800 px-3 py-3 text-white"
                            />
                        </div>
                    </section>
                )}

                {selectedMatch && (
                    <section className="mt-4 rounded-2xl bg-zinc-900 p-4">
                        <h2 className="mb-3 text-lg font-bold text-white">
                            Гравці матчу
                        </h2>

                        {matchPlayers.length === 0 ? (
                            <p className="text-sm text-zinc-400">
                                Немає вибраних гравців з цих країн.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {matchPlayers.map((player) => (
                                    <button
                                        key={player.id}
                                        type="button"
                                        onClick={() =>
                                            setSelectedPlayer(player)
                                        }
                                        className="w-full rounded-xl bg-zinc-800 p-3 text-left"
                                    >
                                        <div className="font-semibold text-white">
                                            {player.name}
                                        </div>

                                        <div className="text-sm text-zinc-400">
                                            {player.position} · {player.country}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                <PlayerScoreSheet
                    key={selectedPlayer?.id ?? 'empty-player'}
                    player={selectedPlayer}
                    initialScore={
                        selectedPlayer
                            ? savedScores[selectedPlayer.id]
                            : undefined
                    }
                    matchContext={selectedPlayerMatchContext}
                    onClose={() => setSelectedPlayer(null)}
                    onSave={async (score: PlayerScoreInput, points: number) => {
                        if (!selectedPlayer || !selectedMatch) return;

                        await setDoc(
                            doc(
                                db,
                                'playerRoundScores',
                                `${selectedRoundId}_${selectedPlayer.id}`,
                            ),
                            {
                                roundId: selectedRoundId,
                                matchId: selectedMatch.id,

                                playerId: selectedPlayer.id,
                                playerName: selectedPlayer.name,
                                position: selectedPlayer.position,
                                country: selectedPlayer.country,

                                score,
                                points,

                                match: {
                                    homeCountry: selectedMatch.homeCountry,
                                    awayCountry: selectedMatch.awayCountry,
                                    homeScore: parsedHomeScore,
                                    awayScore: parsedAwayScore,
                                },

                                updatedAt: serverTimestamp(),
                            },
                            { merge: true },
                        );

                        setSavedScores((previous) => ({
                            ...previous,
                            [selectedPlayer.id]: score,
                        }));

                        setSavedMatchScores((previous) => ({
                            ...previous,
                            [selectedMatch.id]: {
                                homeScore: parsedHomeScore,
                                awayScore: parsedAwayScore,
                            },
                        }));
                    }}
                />
            </section>
            {message && (
                <div className="mt-4 rounded-xl bg-zinc-900 p-3 text-sm">
                    {message}
                </div>
            )}
        </main>
    );
}
