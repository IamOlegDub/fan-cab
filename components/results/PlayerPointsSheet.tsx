'use client';

import type { PlayerResultRow } from '@/lib/results/calculateTeamRoundResult';
import { buildPlayerPointsBreakdown } from '@/lib/results/buildPlayerPointsBreakdown';

type Props = {
    row: PlayerResultRow | null;
    onClose: () => void;
};

export function PlayerPointsSheet({ row, onClose }: Props) {
    if (!row) return null;

    const breakdown = buildPlayerPointsBreakdown({
        player: row.player,
        score: row.score,
        context: row.matchContext,
        isCaptain: row.isCaptain,
        basePoints: row.basePoints,
        finalPoints: row.finalPoints,
    });

    return (
        <div className="fixed bottom-11 inset-0 z-50 flex items-end bg-black/60">
            <div className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-zinc-950 p-4 text-white">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-bold">{row.player.name}</h2>
                        <p className="text-sm text-zinc-400">
                            {row.player.position} · {row.player.country}
                            {row.captainLabel ? ` · ${row.captainLabel}` : ''}
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
                    {row.finalPoints} балів
                </div>

                <div className="space-y-2">
                    {breakdown.map((item) => (
                        <div
                            key={item.label}
                            className="flex items-center justify-between rounded-xl bg-zinc-900 p-3"
                        >
                            <span>{item.label}</span>
                            <span
                                className={
                                    item.points >= 0
                                        ? 'font-bold text-green-400'
                                        : 'font-bold text-red-400'
                                }
                            >
                                {item.points > 0 ? '+' : ''}
                                {item.points}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
