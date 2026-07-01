'use client';

import { ROUND_OPTIONS } from '@/constants/rounds';

type RoundSwitcherProps = {
    selectedRoundId: string;
    availableRoundIds: string[];
    onChange: (roundId: string) => void;
};

export function RoundSwitcher({
    selectedRoundId,
    availableRoundIds,
    onChange,
}: RoundSwitcherProps) {
    const selectedIndex = ROUND_OPTIONS.findIndex(
        (round) => round.id === selectedRoundId,
    );

    const visibleRounds = ROUND_OPTIONS.slice(
        Math.max(selectedIndex - 1, 0),
        Math.min(selectedIndex + 2, ROUND_OPTIONS.length),
    );

    return (
        <div className="mb-4 rounded-2xl bg-zinc-900 p-2">
            <div className="grid grid-cols-3 gap-2">
                {visibleRounds.map((round) => {
                    const isSelected = round.id === selectedRoundId;
                    const isAvailable = availableRoundIds.includes(round.id);

                    return (
                        <button
                            key={round.id}
                            type="button"
                            disabled={!isAvailable}
                            onClick={() => onChange(round.id)}
                            className={[
                                'rounded-xl px-3 py-3 text-sm font-semibold transition',
                                isSelected
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-zinc-800 text-zinc-400',
                                !isAvailable && 'opacity-30',
                            ]
                                .filter(Boolean)
                                .join(' ')}
                        >
                            {round.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
