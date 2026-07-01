import { SelectedSlot } from '@/app/team/page';
import { COUNTRIES } from '@/constants/countries';
import { getPositionIcon } from '@/lib/getPositionIcon';
import { Player } from '@/types/player';
import Image from 'next/image';

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

export default SquadSection;
