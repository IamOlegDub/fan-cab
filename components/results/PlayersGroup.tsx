import type { PlayerResultRow } from '@/lib/results/calculateTeamRoundResult';
import { getPositionColor } from '@/lib/getPositionColor';
import { COUNTRIES } from '@/constants/countries';

type Props = {
    title: string;
    rows: PlayerResultRow[];
    onPlayerClick: (row: PlayerResultRow) => void;
};

export function PlayersGroup({ title, rows, onPlayerClick }: Props) {
    return (
        <section>
            <h3 className="mb-2 text-sm font-bold text-zinc-400">{title}</h3>

            <div className="space-y-2">
                {rows.map((row) => {
                    const country = COUNTRIES[row.player.country];

                    return (
                        <button
                            key={row.playerId}
                            type="button"
                            onClick={() => onPlayerClick(row)}
                            className="flex w-full items-center justify-between rounded-xl bg-zinc-800 p-3 text-left"
                        >
                            <div className="flex min-w-0 items-center gap-3">
                                <span
                                    className={`rounded-md px-2 py-1 text-xs font-bold text-white ${getPositionColor(
                                        row.player.position,
                                    )}`}
                                >
                                    {row.player.position}
                                </span>

                                <div className="min-w-0">
                                    <div className="truncate font-semibold text-white">
                                        {row.player.name}{' '}
                                        {row.captainLabel && (
                                            <span className="text-blue-400">
                                                {row.captainLabel}
                                            </span>
                                        )}
                                    </div>

                                    <div className="text-xs text-zinc-400">
                                        {country?.flag} {row.player.country}
                                    </div>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="font-bold text-white">
                                    {row.finalPoints}
                                </div>

                                {row.isCaptain && (
                                    <div className="text-xs text-blue-400">
                                        {row.basePoints} ×2
                                    </div>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </section>
    );
}
