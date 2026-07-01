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
import type { Player } from '@/types/player';
import type { SquadDraft } from '@/types/squad';
import { validateSquad } from '@/lib/validateSquad';
import type { Round } from '@/types/round';
import { useAlert } from '@/hooks/useAlert';
import { AlertToast } from '@/components/AlertToast';
import PlayerActionSheet from '@/components/PlayerActionSheet';
import SquadSection from '@/components/SquadSection';
import { moveCaptainIfNeeded } from '@/lib/moveCaptainIfNeeded';
import { isValidStarterSwap } from '@/lib/isValidStarterSwap';
import { getDate } from '@/lib/getDate';
import { RoundSwitcher } from '@/components/RoundSwitcher';
import SkeletonPlayers from '@/components/SkeletonPlayers';

type UserProfile = {
    code: string;
    email: string;
    role: 'player' | 'admin';
};

export type SelectedSlot = {
    section: 'starters' | 'bench';
    index: number;
    playerId: string;
};

export default function TeamPage() {
    const router = useRouter();
    const { alert, showAlert } = useAlert();

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [players, setPlayers] = useState<Record<string, Player>>({});
    const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
    const [round, setRound] = useState<Round | null>(null);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedRoundId, setSelectedRoundId] = useState('round_18');
    const [availableRoundIds, setAvailableRoundIds] = useState<string[]>([]);
    const [draftsByRound, setDraftsByRound] = useState<
        Record<string, SquadDraft>
    >({});
    const [isRoundLoading, setIsRoundLoading] = useState(false);

    const draft = draftsByRound[selectedRoundId] ?? null;

    function setCurrentDraft(nextDraft: SquadDraft | null) {
        setDraftsByRound((previous) => {
            if (!nextDraft) {
                const next = { ...previous };
                delete next[selectedRoundId];
                return next;
            }

            return {
                ...previous,
                [selectedRoundId]: nextDraft,
            };
        });
    }

    function updateCurrentDraft(updater: (draft: SquadDraft) => SquadDraft) {
        setDraftsByRound((previous) => {
            const currentDraft = previous[selectedRoundId];

            if (!currentDraft) return previous;

            return {
                ...previous,
                [selectedRoundId]: updater(currentDraft),
            };
        });
    }

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

        const draftId = `${profile.code}_${selectedRoundId}`;

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

            setIsRoundLoading(true);

            try {
                const profileSnap = await getDoc(doc(db, 'users', user.uid));

                if (!profileSnap.exists()) {
                    router.push('/claim-team');
                    return;
                }

                const userProfile = profileSnap.data() as UserProfile;
                setProfile(userProfile);

                const roundsSnap = await getDocs(collection(db, 'rounds'));
                setAvailableRoundIds(
                    roundsSnap.docs.map((roundDoc) => roundDoc.id),
                );

                const playersSnap = await getDocs(collection(db, 'players'));

                const playersMap: Record<string, Player> = {};

                playersSnap.forEach((playerDoc) => {
                    playersMap[playerDoc.id] = {
                        id: playerDoc.id,
                        ...(playerDoc.data() as Omit<Player, 'id'>),
                    };
                });

                setPlayers(playersMap);

                const roundSnap = await getDoc(
                    doc(db, 'rounds', selectedRoundId),
                );

                if (roundSnap.exists()) {
                    const roundData = roundSnap.data();

                    setRound({
                        id: roundSnap.id,
                        name: roundData.name,
                        deadline: roundData.deadline,
                        isLocked: roundData.isLocked,
                        maxTransfers: Number(roundData.maxTransfers ?? 4),
                        maxFromSameTeam: Number(roundData.maxFromSameTeam ?? 1),
                    });
                } else {
                    setRound(null);
                }

                const draftId = `${userProfile.code}_${selectedRoundId}`;
                const draftSnap = await getDoc(doc(db, 'squadDrafts', draftId));

                setDraftsByRound((previous) => {
                    if (previous[selectedRoundId]) return previous;

                    if (!draftSnap.exists()) return previous;

                    return {
                        ...previous,
                        [selectedRoundId]: draftSnap.data() as SquadDraft,
                    };
                });
            } finally {
                setIsRoundLoading(false);
            }
        });

        return () => unsubscribe();
    }, [router, selectedRoundId]);

    const selectedPlayer = selectedSlot ? players[selectedSlot.playerId] : null;

    const replacementPlayers =
        draft && selectedPlayer && selectedSlot && round
            ? Object.values(players).map((player) => {
                  const currentSquadIds = [...draft.starters, ...draft.bench];

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
        updateCurrentDraft((currentDraft) => {
            const playerId = currentDraft.bench[index];
            const player = players[playerId];

            if (!player || player.position === 'GK') return currentDraft;

            const nextIndex = direction === 'up' ? index - 1 : index + 1;

            if (nextIndex < 0 || nextIndex >= currentDraft.bench.length) {
                return currentDraft;
            }

            const targetPlayerId = currentDraft.bench[nextIndex];
            const targetPlayer = players[targetPlayerId];

            if (targetPlayer?.position === 'GK') return currentDraft;

            const nextBench = [...currentDraft.bench];

            [nextBench[index], nextBench[nextIndex]] = [
                nextBench[nextIndex],
                nextBench[index],
            ];

            setSelectedSlot({
                section: 'bench',
                index: nextIndex,
                playerId,
            });

            return {
                ...currentDraft,
                bench: nextBench,
            };
        });
    }

    function handleReplacePlayer(newPlayerId: string) {
        if (!draft || !selectedSlot || !round) return;

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

        const updatedDraft = {
            ...draft,
            [selectedSlot.section]: draft[selectedSlot.section].map(
                (playerId, index) =>
                    index === selectedSlot.index ? newPlayerId : playerId,
            ),
            transferOut: [...draft.transferOut, oldPlayerId],
            transferIn: [...draft.transferIn, newPlayerId],
        };

        setCurrentDraft(
            moveCaptainIfNeeded(updatedDraft, oldPlayerId, newPlayerId),
        );
        setSelectedSlot(null);
    }

    function handleSetCaptain(captainType: 'c1' | 'c2') {
        if (!draft || !selectedSlot) return;

        if (selectedSlot.section !== 'starters') return;

        const playerId = draft.starters[selectedSlot.index];

        setCurrentDraft({
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

        setCurrentDraft(
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

        setCurrentDraft(restoredDraft);
        showAlert('Трансфер скасовано', 'success');
    }

    function handleRestoreAllTransfers() {
        if (!draft) return;

        setCurrentDraft({
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
                                Команда: {profile.code} · {selectedRoundId}
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
                    <RoundSwitcher
                        selectedRoundId={selectedRoundId}
                        availableRoundIds={availableRoundIds}
                        onChange={setSelectedRoundId}
                    />

                    {isRoundLoading ? (
                        <SkeletonPlayers />
                    ) : !draft ? (
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
