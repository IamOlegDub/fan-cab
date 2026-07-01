import { useState } from 'react';
import { SelectedSlot } from '../app/team/page';
import { Player } from '@/types/player';
import { SquadDraft } from '@/types/squad';
import Image from 'next/image';
import { POSITION_ORDER } from '@/constants/positionOrder';
import { isValidStarterSwap } from '@/lib/isValidStarterSwap';
import { COUNTRIES } from '@/constants/countries';
import { getPositionIcon } from '@/lib/getPositionIcon';
import TransferPlayerButton from './TransferPlayerButton';

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
        <div className="fixed bottom-11 inset-0 z-50 flex items-end bg-black/60">
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

export default PlayerActionSheet;
