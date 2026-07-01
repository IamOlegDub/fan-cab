'use client';

import type { Player } from '@/types/player';
import type { PlayerMatchContext, PlayerScoreInput } from '@/types/playerScore';
import { calculatePlayerPoints } from '@/lib/calculatePlayerPoints';
import { useState } from 'react';
import NumberField from './NumberField';

const defaultScore: PlayerScoreInput = {
    played: false,
    played60: false,

    goals: 0,
    penaltyGoals: 0,
    assists: 0,

    yellowCards: 0,
    redCards: 0,

    ownGoals: 0,
    penaltyMissed: 0,
    penaltySaved: 0,

    saves: 0,
    manOfTheMatch: false,
};

type Props = {
    player: Player | null;
    initialScore?: PlayerScoreInput;
    matchContext: PlayerMatchContext | null;
    onClose: () => void;
    onSave: (score: PlayerScoreInput, points: number) => Promise<void>;
};

export function PlayerScoreSheet({
    player,
    matchContext,
    initialScore,
    onClose,
    onSave,
}: Props) {
    const [score, setScore] = useState<PlayerScoreInput>(
        initialScore ?? defaultScore,
    );
    const [isSaving, setIsSaving] = useState(false);

    if (!player) return null;

    const points = matchContext
        ? calculatePlayerPoints(player, score, matchContext)
        : 0;

    const isDisabled = !score.played;
    function update<K extends keyof PlayerScoreInput>(
        key: K,
        value: PlayerScoreInput[K],
    ) {
        setScore((previous) => ({
            ...previous,
            [key]: value,
        }));
    }

    async function handleSave() {
        setIsSaving(true);

        try {
            await onSave(score, points);
            onClose();
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="fixed bottom-11 inset-0 z-50 flex items-end bg-black/60">
            <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-zinc-950 p-4 text-white">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-bold">{player.name}</h2>
                        <p className="text-sm text-zinc-400">
                            {player.position} · {player.country}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg bg-zinc-800 px-3 py-2 text-sm"
                    >
                        Закрити
                    </button>
                </div>

                <div className="mb-4 rounded-xl bg-blue-600 p-3 text-center text-lg font-bold">
                    {points} балів
                </div>

                <div className="space-y-3">
                    <label className="flex items-center justify-between rounded-xl bg-zinc-900 p-3">
                        <span>Вийшов на поле</span>
                        <input
                            type="checkbox"
                            checked={score.played}
                            onChange={(e) => update('played', e.target.checked)}
                        />
                    </label>

                    <label className="flex items-center justify-between rounded-xl bg-zinc-900 p-3">
                        <span className={isDisabled ? 'text-zinc-500' : ''}>
                            60+ хв
                        </span>

                        <input
                            type="checkbox"
                            checked={score.played60}
                            disabled={isDisabled}
                            onChange={(e) =>
                                update('played60', e.target.checked)
                            }
                            className="disabled:opacity-40"
                        />
                    </label>

                    <NumberField
                        label="⚽ Голи з гри"
                        value={score.goals}
                        disabled={isDisabled}
                        onChange={(v) => update('goals', v)}
                    />

                    <NumberField
                        label="🎯 Гол з пенальті"
                        value={score.penaltyGoals}
                        disabled={isDisabled}
                        onChange={(v) => update('penaltyGoals', v)}
                    />

                    <NumberField
                        label="🅰️ Асисти"
                        value={score.assists}
                        disabled={isDisabled}
                        onChange={(v) => update('assists', v)}
                    />

                    <NumberField
                        label="🟨 Жовті картки"
                        value={score.yellowCards}
                        disabled={isDisabled}
                        onChange={(v) => update('yellowCards', v)}
                    />

                    <NumberField
                        label="🟥 Червоні картки"
                        value={score.redCards}
                        disabled={isDisabled}
                        onChange={(v) => update('redCards', v)}
                    />

                    <NumberField
                        label="🥅 Автоголи"
                        value={score.ownGoals}
                        disabled={isDisabled}
                        onChange={(v) => update('ownGoals', v)}
                    />

                    <NumberField
                        label="❌ Незабиті пенальті"
                        value={score.penaltyMissed}
                        disabled={isDisabled}
                        onChange={(v) => update('penaltyMissed', v)}
                    />

                    <NumberField
                        label="🧤 Відбиті пенальті"
                        value={score.penaltySaved}
                        disabled={isDisabled}
                        onChange={(v) => update('penaltySaved', v)}
                    />

                    {player.position === 'GK' && (
                        <NumberField
                            label="🧱 Сейви"
                            value={score.saves}
                            disabled={isDisabled}
                            onChange={(v) => update('saves', v)}
                        />
                    )}

                    <label className="flex items-center justify-between rounded-xl bg-zinc-900 p-3">
                        <span className={isDisabled ? 'text-zinc-500' : ''}>
                            ⭐ Найкращий гравець матчу
                        </span>

                        <input
                            type="checkbox"
                            checked={score.manOfTheMatch}
                            disabled={isDisabled}
                            onChange={(e) =>
                                update('manOfTheMatch', e.target.checked)
                            }
                            className="disabled:opacity-40"
                        />
                    </label>

                    <button
                        type="button"
                        disabled={isSaving || !matchContext}
                        onClick={handleSave}
                        className="w-full rounded-xl bg-blue-600 py-3 font-semibold disabled:bg-zinc-700"
                    >
                        {isSaving ? 'Збереження...' : 'Зберегти бали'}
                    </button>
                </div>
            </div>
        </div>
    );
}
