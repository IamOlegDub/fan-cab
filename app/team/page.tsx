'use client';

import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
    doc,
    getDoc,
    getDocs,
    collection,
    updateDoc,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import type { Player, PlayerPosition } from '@/types/player';
import type { SquadDraft } from '@/types/squad';
import { validateSquad } from '@/lib/validateSquad';
import type { Round } from '@/types/round';
import { useAlert } from '@/hooks/useAlert';
import { AlertToast } from '@/components/AlertToast';
import { COUNTRIES } from '@/constants/countries';
import Image from 'next/image';

type UserProfile = {
    code: string;
    email: string;
    role: 'player' | 'admin';
};

type SelectedSlot = {
    section: 'starters' | 'bench';
    index: number;
    playerId: string;
};

export default function TeamPage() {
    const router = useRouter();
    const { alert, showAlert } = useAlert();

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [players, setPlayers] = useState<Record<string, Player>>({});
    const [draft, setDraft] = useState<SquadDraft | null>(null);
    const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
    const [round, setRound] = useState<Round | null>(null);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    async function handleSaveDraft() {
        if (!draft || !profile || !round) return;

        const deadlineDate = getDate(round.deadline);
        const isDeadlinePassed = new Date() >= deadlineDate;

        if (isDeadlinePassed || round.isLocked) {
            showAlert('Дедлайн минув. Редагування заблоковано.', 'error');
            return;
        }

        const result = validateSquad(draft, players, round);

        if (!result.isValid) {
            setValidationErrors(result.errors);
            return;
        }

        const draftId = `${profile.code}_round_116`;

        if (!validation?.isValid) {
            showAlert('Спочатку виправ недотримані правила складу', 'error');
            return;
        }
        setIsSaving(true);
        try {
            await updateDoc(doc(db, 'squadDrafts', draftId), {
                starters: draft.starters,
                bench: draft.bench,
                c1: draft.c1,
                c2: draft.c2,
                transferIn: draft.transferIn,
                transferOut: draft.transferOut,
                submittedAt: new Date(),
                updatedAt: new Date(),
            });

            setValidationErrors([]);
            showAlert('Draft збережено');
        } finally {
            setIsSaving(false);
        }
    }
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                router.push('/login');
                return;
            }

            const profileSnap = await getDoc(doc(db, 'users', user.uid));

            if (!profileSnap.exists()) {
                router.push('/claim-team');
                return;
            }

            const userProfile = profileSnap.data() as UserProfile;
            setProfile(userProfile);

            const playersSnap = await getDocs(collection(db, 'players'));

            const roundSnap = await getDoc(doc(db, 'rounds', 'round_116'));

            if (roundSnap.exists()) {
                const roundData = roundSnap.data();

                const loadedRound: Round = {
                    id: roundSnap.id,
                    name: roundData.name,
                    deadline: roundData.deadline,
                    isLocked: roundData.isLocked,
                    maxTransfers: Number(roundData.maxTransfers ?? 4),
                    maxFromSameTeam: Number(roundData.maxFromSameTeam ?? 1),
                };

                setRound(loadedRound);
            }

            const playersMap: Record<string, Player> = {};

            playersSnap.forEach((playerDoc) => {
                playersMap[playerDoc.id] = {
                    id: playerDoc.id,
                    ...(playerDoc.data() as Omit<Player, 'id'>),
                };
            });

            setPlayers(playersMap);

            const draftId = `${userProfile.code}_round_116`;
            const draftSnap = await getDoc(doc(db, 'squadDrafts', draftId));

            if (draftSnap.exists()) {
                setDraft(draftSnap.data() as SquadDraft);
            }
        });

        return () => unsubscribe();
    }, [router]);

    const selectedPlayer = selectedSlot ? players[selectedSlot.playerId] : null;

    const replacementPlayers =
        draft && selectedPlayer && selectedSlot && round
            ? Object.values(players).map((player) => {
                  const currentSquadIds = [...draft.starters, ...draft.bench];

                  //   const oldPlayerId =
                  //       draft[selectedSlot.section][selectedSlot.index];

                  //   const nextSquadIds = currentSquadIds.map((playerId) =>
                  //       playerId === oldPlayerId ? player.id : playerId,
                  //   );

                  //   const countryCounts = nextSquadIds.reduce(
                  //       (acc, playerId) => {
                  //           const squadPlayer = players[playerId];

                  //           if (!squadPlayer) return acc;

                  //           acc[squadPlayer.country] =
                  //               (acc[squadPlayer.country] ?? 0) + 1;

                  //           return acc;
                  //       },
                  //       {} as Record<string, number>,
                  //   );

                  const isSamePosition =
                      player.position === selectedPlayer.position;

                  const isAlreadyInSquad = currentSquadIds.includes(player.id);

                  const isMaxTransfersReached =
                      draft.transferIn.length >= round.maxTransfers;

                  return {
                      player,
                      isDisabled:
                          !isSamePosition ||
                          isAlreadyInSquad ||
                          isMaxTransfersReached,
                      disabledReason: !isSamePosition
                          ? 'Інша позиція'
                          : isAlreadyInSquad
                            ? 'Вже у складі'
                            : isMaxTransfersReached
                              ? `Ліміт трансферів: ${round.maxTransfers}`
                              : '',
                  };
              })
            : [];

    function handleMoveBenchPlayer(index: number, direction: 'up' | 'down') {
        if (!draft) return;

        const playerId = draft.bench[index];
        const player = players[playerId];

        if (!player || player.position === 'GK') return;

        const nextIndex = direction === 'up' ? index - 1 : index + 1;
        const targetPlayerId = draft.bench[nextIndex];
        const targetPlayer = targetPlayerId ? players[targetPlayerId] : null;

        if (nextIndex < 0 || nextIndex >= draft.bench.length) return;

        // GK у запасі не рухаємо і не даємо польовим стати перед ним
        if (targetPlayer?.position === 'GK') return;

        const nextBench = [...draft.bench];

        [nextBench[index], nextBench[nextIndex]] = [
            nextBench[nextIndex],
            nextBench[index],
        ];

        setDraft({
            ...draft,
            bench: nextBench,
        });

        setSelectedSlot({
            section: 'bench',
            index: nextIndex,
            playerId,
        });
    }

    function handleReplacePlayer(newPlayerId: string) {
        if (!draft || !selectedSlot || !round) return;
        console.log('round in handler', round);
        const oldPlayerId = draft[selectedSlot.section][selectedSlot.index];
        const oldPlayer = players[oldPlayerId];
        const newPlayer = players[newPlayerId];

        if (!oldPlayer || !newPlayer) return;

        if (draft.transferIn.length >= round.maxTransfers) {
            showAlert(
                `Максимум трансферів для цього туру: ${round.maxTransfers}`,
                'error',
            );
            return;
        }

        if (oldPlayer.position !== newPlayer.position) {
            return;
        }
        console.log({
            oldPlayer,
            newPlayer,
            oldPlayerId,
            newPlayerId,
            maxFromSameTeam: round.maxFromSameTeam,
        });
        // if (
        //     !isValidMaxFromSameTeamAfterTransfer({
        //         draft,
        //         players,
        //         oldPlayerId,
        //         newPlayerId,
        //         maxFromSameTeam: round.maxFromSameTeam,
        //     })
        // ) {
        //     showAlert(
        //         `Не можна більше ${round.maxFromSameTeam} гравця з однієї збірної`,
        //         'error',
        //     );
        //     return;
        // }

        const updatedDraft = {
            ...draft,
            [selectedSlot.section]: draft[selectedSlot.section].map(
                (playerId, index) =>
                    index === selectedSlot.index ? newPlayerId : playerId,
            ),
            transferOut: [...draft.transferOut, oldPlayerId],
            transferIn: [...draft.transferIn, newPlayerId],
        };

        setDraft(moveCaptainIfNeeded(updatedDraft, oldPlayerId, newPlayerId));
        setSelectedSlot(null);
    }

    function handleSetCaptain(captainType: 'c1' | 'c2') {
        if (!draft || !selectedSlot) return;

        if (selectedSlot.section !== 'starters') return;

        const playerId = draft.starters[selectedSlot.index];

        setDraft({
            ...draft,
            [captainType]: playerId,
        });

        setSelectedSlot(null);
    }

    function handleSwapWithSquadPlayer(
        targetSection: 'starters' | 'bench',
        targetIndex: number,
    ) {
        if (!draft || !selectedSlot) return;

        const selectedPlayerId =
            draft[selectedSlot.section][selectedSlot.index];
        const targetPlayerId = draft[targetSection][targetIndex];

        if (
            !isValidStarterSwap(
                draft,
                players,
                selectedSlot,
                targetSection,
                targetIndex,
            )
        ) {
            return;
        }

        const updatedDraft = {
            ...draft,
            starters: [...draft.starters],
            bench: [...draft.bench],
        };

        updatedDraft[selectedSlot.section][selectedSlot.index] = targetPlayerId;
        updatedDraft[targetSection][targetIndex] = selectedPlayerId;

        setDraft(
            moveCaptainIfNeeded(updatedDraft, selectedPlayerId, targetPlayerId),
        );
        setSelectedSlot(null);
    }

    function handleRestoreTransfer(index: number) {
        if (!draft) return;

        const playerIn = draft.transferIn[index];
        const playerOut = draft.transferOut[index];

        const replaceBack = (playerId: string) =>
            playerId === playerIn ? playerOut : playerId;

        const restoredDraft: SquadDraft = {
            ...draft,
            starters: draft.starters.map(replaceBack),
            bench: draft.bench.map(replaceBack),

            c1: draft.c1 === playerIn ? playerOut : draft.c1,
            c2: draft.c2 === playerIn ? playerOut : draft.c2,

            transferIn: draft.transferIn.filter(
                (_, itemIndex) => itemIndex !== index,
            ),
            transferOut: draft.transferOut.filter(
                (_, itemIndex) => itemIndex !== index,
            ),
        };

        setDraft(restoredDraft);
        showAlert('Трансфер скасовано', 'success');
    }

    function handleRestoreAllTransfers() {
        if (!draft) return;

        setDraft({
            ...draft,
            starters: draft.originalStarters ?? draft.starters,
            bench: draft.originalBench ?? draft.bench,
            c1: draft.originalC1 ?? draft.c1,
            c2: draft.originalC2 ?? draft.c2,
            transferIn: [],
            transferOut: [],
        });

        showAlert('Склад повернуто до початку туру', 'success');
    }

    if (!profile) {
        return <main className="p-6">Loading...</main>;
    }

    const validation =
        draft && round
            ? validateSquad(draft, players, {
                  maxTransfers: round.maxTransfers,
                  maxFromSameTeam: round.maxFromSameTeam,
              })
            : null;

    const isDraftValid = validation?.isValid ?? false;
    console.log('isDraftValid', isDraftValid);
    const currentValidationErrors = validation?.errors ?? [];
    const isLocked = round?.isLocked ?? false;
    return (
        <>
            <AlertToast alert={alert} />
            <main className="min-h-screen bg-zinc-950 px-4 py-5 text-white">
                <div className="mx-auto max-w-md space-y-5">
                    <header className="flex items-start justify-between gap-3">
                        <div>
                            <h1 className="text-2xl font-bold">Мій склад</h1>
                            <p className="text-sm text-zinc-400">
                                Команда: {profile.code} · 1/16
                            </p>
                        </div>

                        <button
                            className="rounded-lg bg-zinc-800 px-3 py-2 text-sm"
                            onClick={() => signOut(auth)}
                        >
                            Вийти
                        </button>
                    </header>

                    {draft && round && (
                        <div className="mb-4 rounded-xl bg-zinc-900 p-4">
                            <div className="text-sm text-zinc-400">
                                Трансфери
                            </div>

                            <div className="mt-1 text-xl font-bold text-white">
                                {draft.transferIn.length} / {round.maxTransfers}
                            </div>

                            <div className="mt-1 text-xs text-zinc-500">
                                Залишилось:{' '}
                                {Math.max(
                                    round.maxTransfers -
                                        draft.transferIn.length,
                                    0,
                                )}
                            </div>
                        </div>
                    )}

                    {!draft ? (
                        <div className="rounded-xl bg-zinc-900 p-4 text-sm text-zinc-300">
                            Draft не знайдено.
                        </div>
                    ) : (
                        <>
                            <SquadSection
                                title="🔥 Основа"
                                section="starters"
                                playerIds={draft.starters}
                                players={players}
                                c1={draft.c1}
                                c2={draft.c2}
                                onSelectSlot={setSelectedSlot}
                            />

                            <SquadSection
                                title="🪑 Запас"
                                section="bench"
                                playerIds={draft.bench}
                                players={players}
                                c1={draft.c1}
                                c2={draft.c2}
                                onSelectSlot={setSelectedSlot}
                            />

                            {draft && draft.transferIn.length > 0 && (
                                <div className="mb-4 rounded-xl bg-zinc-900 p-4">
                                    <div className="mb-3 font-semibold text-white">
                                        Мої трансфери
                                    </div>

                                    <div className="space-y-2">
                                        {draft.transferIn.map(
                                            (playerInId, index) => {
                                                const playerOutId =
                                                    draft.transferOut[index];

                                                const playerIn =
                                                    players[playerInId];
                                                const playerOut =
                                                    players[playerOutId];

                                                if (!playerIn || !playerOut)
                                                    return null;

                                                return (
                                                    <div
                                                        key={`${playerOutId}-${playerInId}`}
                                                        className="rounded-xl bg-zinc-800 p-3"
                                                    >
                                                        <div className="text-sm text-zinc-400">
                                                            OUT:{' '}
                                                            {playerOut.name}
                                                        </div>

                                                        <div className="text-sm text-white">
                                                            IN: {playerIn.name}
                                                        </div>

                                                        <button
                                                            type="button"
                                                            className="mt-2 text-xs font-semibold text-red-400"
                                                            onClick={() =>
                                                                handleRestoreTransfer(
                                                                    index,
                                                                )
                                                            }
                                                        >
                                                            Скасувати трансфер
                                                        </button>
                                                    </div>
                                                );
                                            },
                                        )}
                                    </div>
                                </div>
                            )}
                            {validationErrors.length > 0 && (
                                <div className="space-y-1 rounded-xl bg-red-950 p-4 text-sm text-red-200">
                                    {validationErrors.map((error) => (
                                        <div key={error}>• {error}</div>
                                    ))}
                                </div>
                            )}
                            {draft && draft.transferIn.length > 0 && (
                                <button
                                    type="button"
                                    className="mt-3 w-full rounded-xl bg-zinc-800 px-4 py-3 text-sm font-semibold text-white"
                                    onClick={handleRestoreAllTransfers}
                                >
                                    Скасувати всі трансфери
                                </button>
                            )}

                            {currentValidationErrors.length > 0 && (
                                <div className="mb-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
                                    <div className="mb-2 font-semibold text-amber-100">
                                        Є недотримані правила:
                                    </div>

                                    <ul className="list-disc space-y-1 pl-4">
                                        {currentValidationErrors.map(
                                            (error) => (
                                                <li key={error}>{error}</li>
                                            ),
                                        )}
                                    </ul>
                                </div>
                            )}
                            <button
                                className="w-full rounded-xl bg-blue-600 py-3 font-semibold active:scale-[0.99] disabled:bg-zinc-700 disabled:text-zinc-400"
                                disabled={!isDraftValid || isSaving || isLocked}
                                onClick={handleSaveDraft}
                            >
                                Зберегти
                            </button>
                        </>
                    )}
                </div>

                {selectedSlot && selectedPlayer && draft && (
                    <PlayerActionSheet
                        selectedSlot={selectedSlot}
                        selectedPlayer={selectedPlayer}
                        draft={draft}
                        players={players}
                        replacementPlayers={replacementPlayers}
                        onClose={() => setSelectedSlot(null)}
                        onReplace={handleReplacePlayer}
                        onSwapWithSquadPlayer={handleSwapWithSquadPlayer}
                        onSetCaptain={handleSetCaptain}
                        onMoveBenchPlayer={handleMoveBenchPlayer}
                    />
                )}
            </main>
        </>
    );
}

function SquadSection({
    title,
    section,
    playerIds,
    players,
    c1,
    c2,
    onSelectSlot,
}: {
    title: string;
    section: 'starters' | 'bench';
    playerIds: string[];
    players: Record<string, Player>;
    c1: string;
    c2: string;
    onSelectSlot: (slot: SelectedSlot) => void;
}) {
    return (
        <section className="space-y-2">
            <h2 className="text-lg font-semibold">{title}</h2>

            <div className="space-y-2">
                {playerIds.map((playerId, index) => {
                    const player = players[playerId];

                    if (!player) {
                        return (
                            <div
                                key={playerId}
                                className="rounded-xl bg-red-950 p-3 text-sm"
                            >
                                Missing player: {playerId}
                            </div>
                        );
                    }

                    const captain =
                        c1 === player.id ? 'C1' : c2 === player.id ? 'C2' : '';

                    return (
                        <button
                            key={`${section}-${player.id}-${index}`}
                            type="button"
                            className="flex w-full items-center gap-3 rounded-xl bg-zinc-900 p-3 text-left active:scale-[0.99]"
                            onClick={() =>
                                onSelectSlot({
                                    section,
                                    index,
                                    playerId: player.id,
                                })
                            }
                        >
                            <div className="w-9 text-center text-xs font-bold">
                                {getPositionIcon(player.position)}
                                <div>{player.position}</div>
                            </div>

                            <div className="min-w-0 flex-1">
                                <div className="truncate font-semibold">
                                    {player.name}
                                </div>
                                <div className="flex gap-2 text-sm text-zinc-400">
                                    {player.country}
                                    <div className="inline-flex items-center">
                                        {COUNTRIES[player.country]?.flag && (
                                            <Image
                                                src={`/flags/${COUNTRIES[player.country].flag}.svg`}
                                                alt={
                                                    COUNTRIES[player.country]
                                                        .name
                                                }
                                                width={18}
                                                height={12}
                                                className="rounded-sm"
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {captain && (
                                <div className="rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-bold text-emerald-300">
                                    {captain}
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </section>
    );
}

function PlayerActionSheet({
    selectedSlot,
    selectedPlayer,
    draft,
    players,
    replacementPlayers,
    onClose,
    onReplace,
    onSwapWithSquadPlayer,
    onSetCaptain,
    onMoveBenchPlayer,
}: {
    selectedSlot: SelectedSlot;
    selectedPlayer: Player;
    draft: SquadDraft;
    players: Record<string, Player>;
    replacementPlayers: {
        player: Player;
        isDisabled: boolean;
        disabledReason: string;
    }[];
    onClose: () => void;
    onSetCaptain: (captainType: 'c1' | 'c2') => void;
    onReplace: (playerId: string) => void;
    onSwapWithSquadPlayer: (
        targetSection: 'starters' | 'bench',
        targetIndex: number,
    ) => void;
    onMoveBenchPlayer: (index: number, direction: 'up' | 'down') => void;
}) {
    const [mode, setMode] = useState<'actions' | 'swap' | 'transfer'>(
        'actions',
    );
    const [search, setSearch] = useState('');
    const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

    const oppositeSection =
        selectedSlot.section === 'starters' ? 'bench' : 'starters';

    const swapCandidates = draft[oppositeSection]
        .map((playerId, index) => {
            const player = players[playerId];

            return {
                player,
                index,
                isDisabled: !isValidStarterSwap(
                    draft,
                    players,
                    selectedSlot,
                    oppositeSection,
                    index,
                ),
            };
        })
        .filter((item) => item.player);

    const searchValue = search.trim().toLowerCase();

    const filteredTransferPlayers = replacementPlayers.filter(({ player }) => {
        const country = COUNTRIES[player.country];

        return (
            player.name.toLowerCase().includes(searchValue) ||
            player.country.toLowerCase().includes(searchValue) ||
            country?.name.toLowerCase().includes(searchValue)
        );
    });

    const groupedTransferPlayers = filteredTransferPlayers.reduce(
        (acc, item) => {
            const country = item.player.country;

            if (!acc[country]) {
                acc[country] = [];
            }

            acc[country].push(item);

            return acc;
        },
        {} as Record<string, typeof replacementPlayers>,
    );

    const countryGroups = Object.entries(groupedTransferPlayers)
        .map(([country, items]) => ({
            country,
            items: items.sort(
                (a, b) =>
                    POSITION_ORDER[a.player.position] -
                        POSITION_ORDER[b.player.position] ||
                    a.player.name.localeCompare(b.player.name),
            ),
        }))
        .sort((a, b) => {
            const aName = COUNTRIES[a.country]?.name ?? a.country;
            const bName = COUNTRIES[b.country]?.name ?? b.country;

            return aName.localeCompare(bName);
        });

    return (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60">
            <div className="max-h-[85vh] w-full rounded-t-2xl bg-zinc-950 p-4 shadow-xl">
                <div className="mx-auto max-w-md space-y-4">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h3 className="text-lg font-bold">
                                {selectedPlayer.name}
                            </h3>
                            <p className="text-sm text-zinc-400">
                                {selectedPlayer.position} ·{' '}
                                {selectedPlayer.country}
                            </p>
                        </div>

                        <button
                            className="rounded-lg bg-zinc-800 px-3 py-2 text-sm"
                            onClick={onClose}
                        >
                            Закрити
                        </button>
                    </div>

                    {mode === 'actions' && (
                        <div className="space-y-2">
                            {selectedSlot.section === 'starters' && (
                                <>
                                    <button
                                        className="w-full rounded-xl bg-zinc-900 p-4 text-left font-semibold disabled:opacity-40"
                                        disabled={
                                            draft.c1 === selectedPlayer.id
                                        }
                                        onClick={() => onSetCaptain('c1')}
                                    >
                                        ⭐ Зробити C1
                                    </button>

                                    <button
                                        className="w-full rounded-xl bg-zinc-900 p-4 text-left font-semibold disabled:opacity-40"
                                        disabled={
                                            draft.c2 === selectedPlayer.id
                                        }
                                        onClick={() => onSetCaptain('c2')}
                                    >
                                        ⭐ Зробити C2
                                    </button>
                                </>
                            )}
                            {selectedSlot.section === 'bench' &&
                                selectedPlayer.position !== 'GK' && (
                                    <>
                                        {(() => {
                                            const previousPlayerId =
                                                draft.bench[
                                                    selectedSlot.index - 1
                                                ];
                                            const nextPlayerId =
                                                draft.bench[
                                                    selectedSlot.index + 1
                                                ];

                                            const previousPlayer =
                                                previousPlayerId
                                                    ? players[previousPlayerId]
                                                    : null;

                                            const nextPlayer = nextPlayerId
                                                ? players[nextPlayerId]
                                                : null;

                                            const canMoveUp =
                                                selectedSlot.index > 0 &&
                                                previousPlayer?.position !==
                                                    'GK';

                                            const canMoveDown =
                                                selectedSlot.index <
                                                    draft.bench.length - 1 &&
                                                nextPlayer?.position !== 'GK';

                                            return (
                                                <>
                                                    <button
                                                        type="button"
                                                        disabled={!canMoveUp}
                                                        className="w-full rounded-xl bg-zinc-900 p-4 text-left font-semibold disabled:opacity-40"
                                                        onClick={() =>
                                                            onMoveBenchPlayer(
                                                                selectedSlot.index,
                                                                'up',
                                                            )
                                                        }
                                                    >
                                                        ↑ Підняти вище в порядку
                                                        замін
                                                    </button>

                                                    <button
                                                        type="button"
                                                        disabled={!canMoveDown}
                                                        className="w-full rounded-xl bg-zinc-900 p-4 text-left font-semibold disabled:opacity-40"
                                                        onClick={() =>
                                                            onMoveBenchPlayer(
                                                                selectedSlot.index,
                                                                'down',
                                                            )
                                                        }
                                                    >
                                                        ↓ Опустити нижче в
                                                        порядку замін
                                                    </button>
                                                </>
                                            );
                                        })()}
                                    </>
                                )}
                            <button
                                className="w-full rounded-xl bg-zinc-900 p-4 text-left font-semibold active:scale-[0.99]"
                                onClick={() => setMode('swap')}
                            >
                                🔄 Поміняти з{' '}
                                {selectedSlot.section === 'starters'
                                    ? 'запасом'
                                    : 'основою'}
                            </button>

                            <button
                                className="w-full rounded-xl bg-zinc-900 p-4 text-left font-semibold active:scale-[0.99]"
                                onClick={() => setMode('transfer')}
                            >
                                🔁 Зробити трансфер
                            </button>
                        </div>
                    )}

                    {mode === 'swap' && (
                        <div className="space-y-3">
                            <button
                                className="text-sm text-zinc-400"
                                onClick={() => setMode('actions')}
                            >
                                ← Назад
                            </button>

                            <div className="space-y-2">
                                {swapCandidates.length === 0 ? (
                                    <div className="rounded-xl bg-zinc-900 p-4 text-sm text-zinc-400">
                                        Немає гравців тієї ж позиції для заміни.
                                    </div>
                                ) : (
                                    swapCandidates.map(
                                        ({ player, index, isDisabled }) => (
                                            <button
                                                key={`${oppositeSection}-${player.id}-${index}`}
                                                type="button"
                                                disabled={isDisabled}
                                                className="flex w-full items-center gap-3 rounded-xl bg-zinc-900 p-3 text-left disabled:opacity-40"
                                                onClick={() =>
                                                    onSwapWithSquadPlayer(
                                                        oppositeSection,
                                                        index,
                                                    )
                                                }
                                            >
                                                <div className="w-9 text-center text-xs font-bold">
                                                    {getPositionIcon(
                                                        player.position,
                                                    )}
                                                    <div>{player.position}</div>
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <div className="truncate font-semibold">
                                                        {player.name}
                                                    </div>
                                                    <div className="text-sm text-zinc-400">
                                                        {player.country}
                                                    </div>
                                                </div>
                                            </button>
                                        ),
                                    )
                                )}
                            </div>
                        </div>
                    )}

                    {mode === 'transfer' && (
                        <div className="space-y-3">
                            <button
                                className="text-sm text-zinc-400"
                                onClick={() => setMode('actions')}
                            >
                                ← Назад
                            </button>

                            <input
                                className="w-full rounded-xl bg-zinc-900 px-4 py-3 outline-none"
                                placeholder="Пошук гравця"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                            />

                            <div className="max-h-[55vh] space-y-2 overflow-y-auto pb-4">
                                {searchValue ? (
                                    <div className="space-y-2">
                                        {filteredTransferPlayers.map(
                                            ({
                                                player,
                                                isDisabled,
                                                disabledReason,
                                            }) => (
                                                <TransferPlayerButton
                                                    key={player.id}
                                                    player={player}
                                                    isDisabled={isDisabled}
                                                    disabledReason={
                                                        disabledReason
                                                    }
                                                    onReplace={onReplace}
                                                />
                                            ),
                                        )}
                                    </div>
                                ) : selectedCountry ? (
                                    <div className="space-y-2">
                                        <button
                                            type="button"
                                            className="mb-2 text-sm font-semibold text-zinc-400"
                                            onClick={() =>
                                                setSelectedCountry(null)
                                            }
                                        >
                                            ← Назад до країн
                                        </button>

                                        {groupedTransferPlayers[selectedCountry]
                                            ?.sort(
                                                (a, b) =>
                                                    POSITION_ORDER[
                                                        a.player.position
                                                    ] -
                                                        POSITION_ORDER[
                                                            b.player.position
                                                        ] ||
                                                    a.player.name.localeCompare(
                                                        b.player.name,
                                                    ),
                                            )
                                            .map(
                                                ({
                                                    player,
                                                    isDisabled,
                                                    disabledReason,
                                                }) => (
                                                    <TransferPlayerButton
                                                        key={player.id}
                                                        player={player}
                                                        isDisabled={isDisabled}
                                                        disabledReason={
                                                            disabledReason
                                                        }
                                                        onReplace={onReplace}
                                                    />
                                                ),
                                            )}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2">
                                        {countryGroups.map(
                                            ({ country, items }) => {
                                                const countryInfo =
                                                    COUNTRIES[country];

                                                return (
                                                    <button
                                                        key={country}
                                                        type="button"
                                                        className="rounded-xl bg-zinc-900 p-3 text-left"
                                                        onClick={() =>
                                                            setSelectedCountry(
                                                                country,
                                                            )
                                                        }
                                                    >
                                                        {/* плитка країни */}
                                                        <div className="flex h-8 w-10 items-center justify-center overflow-hidden rounded bg-zinc-800">
                                                            {countryInfo?.flag ? (
                                                                <Image
                                                                    src={`/flags/${countryInfo.flag}.svg`}
                                                                    alt={
                                                                        countryInfo.name
                                                                    }
                                                                    width={40}
                                                                    height={28}
                                                                    className="h-full w-full object-cover"
                                                                />
                                                            ) : (
                                                                <span className="text-xs">
                                                                    ?
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="mt-2 font-semibold text-white">
                                                            {countryInfo?.name ??
                                                                country}
                                                        </div>

                                                        <div className="text-sm text-zinc-400">
                                                            {country} ·{' '}
                                                            {items.length}{' '}
                                                            гравців
                                                        </div>
                                                    </button>
                                                );
                                            },
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function TransferPlayerButton({
    player,
    isDisabled,
    disabledReason,
    onReplace,
}: {
    player: Player;
    isDisabled: boolean;
    disabledReason: string;
    onReplace: (playerId: string) => void;
}) {
    return (
        <button
            type="button"
            disabled={isDisabled}
            onClick={() => {
                if (isDisabled) return;

                onReplace(player.id);
            }}
            className="flex w-full items-center gap-3 rounded-xl bg-zinc-900 p-3 text-left disabled:opacity-40"
        >
            <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white ${getPositionColor(player.position)}`}
            >
                {player.position}
            </span>

            <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-white">
                    {player.name}
                </div>

                <div className="text-sm text-zinc-400">
                    {/* плитка гравця трансферу */}
                    <span className="inline-flex items-center gap-1">
                        {COUNTRIES[player.country]?.flag && (
                            <Image
                                src={`/flags/${COUNTRIES[player.country].flag}.svg`}
                                alt={COUNTRIES[player.country].name}
                                width={18}
                                height={12}
                                className="rounded-sm"
                            />
                        )}

                        {COUNTRIES[player.country]?.name ?? player.country}
                    </span>
                </div>

                {isDisabled && disabledReason && (
                    <div className="mt-1 text-xs text-red-400">
                        {disabledReason}
                    </div>
                )}
            </div>
        </button>
    );
}

function isValidStarterSwap(
    draft: SquadDraft,
    players: Record<string, Player>,
    selectedSlot: SelectedSlot,
    targetSection: 'starters' | 'bench',
    targetIndex: number,
) {
    const selectedPlayerId = draft[selectedSlot.section][selectedSlot.index];
    const targetPlayerId = draft[targetSection][targetIndex];

    const nextStarters = [...draft.starters];

    if (selectedSlot.section === 'starters') {
        nextStarters[selectedSlot.index] = targetPlayerId;
    }

    if (targetSection === 'starters') {
        nextStarters[targetIndex] = selectedPlayerId;
    }

    return isValidStarters(nextStarters, players);
}

// function isValidMaxFromSameTeamAfterTransfer({
//     draft,
//     players,
//     oldPlayerId,
//     newPlayerId,
//     maxFromSameTeam,
// }: {
//     draft: SquadDraft;
//     players: Record<string, Player>;
//     oldPlayerId: string;
//     newPlayerId: string;
//     maxFromSameTeam: number;
// }) {
//     const currentSquadIds = [...draft.starters, ...draft.bench];

//     const nextSquadIds = currentSquadIds
//         .filter((playerId) => playerId !== oldPlayerId)
//         .concat(newPlayerId);

//     const countryCounts = nextSquadIds.reduce(
//         (acc, playerId) => {
//             const player = players[playerId];

//             if (!player) return acc;

//             acc[player.country] = (acc[player.country] ?? 0) + 1;

//             return acc;
//         },
//         {} as Record<string, number>,
//     );

//     return Object.values(countryCounts).every(
//         (count) => count <= maxFromSameTeam,
//     );
// }

function isValidStarters(
    starterIds: string[],
    players: Record<string, Player>,
) {
    const counts = starterIds.reduce(
        (acc, playerId) => {
            const player = players[playerId];

            if (!player) return acc;

            acc[player.position] += 1;

            return acc;
        },
        {
            GK: 0,
            DF: 0,
            MF: 0,
            FW: 0,
        },
    );

    return counts.GK === 1 && counts.DF >= 3 && counts.FW <= 3;
}

function moveCaptainIfNeeded(
    draft: SquadDraft,
    oldPlayerId: string,
    newPlayerId: string,
): SquadDraft {
    return {
        ...draft,
        c1: draft.c1 === oldPlayerId ? newPlayerId : draft.c1,
        c2: draft.c2 === oldPlayerId ? newPlayerId : draft.c2,
    };
}

function getPositionIcon(position: PlayerPosition | string) {
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

function getPositionColor(position: Player['position']) {
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

const POSITION_ORDER = {
    GK: 1,
    DF: 2,
    MF: 3,
    FW: 4,
} as const;

function getDate(value: unknown) {
    if (
        value &&
        typeof value === 'object' &&
        'toDate' in value &&
        typeof value.toDate === 'function'
    ) {
        return value.toDate();
    }

    return new Date(value as string | number | Date);
}
