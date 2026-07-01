import { COUNTRIES } from '@/constants/countries';
import { getPositionColor } from '@/lib/getPositionColor';
import { Player } from '@/types/player';
import Image from 'next/image';

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

export default TransferPlayerButton;
