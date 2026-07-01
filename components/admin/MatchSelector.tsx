'use client';

import { COUNTRIES } from '@/constants/countries';
import type { MatchConfig } from '@/constants/matches';

type MatchSelectorProps = {
    roundId: string;
    selectedMatchId: string;
    matches: MatchConfig[];
    onChange: (matchId: string) => void;
};

export function MatchSelector({
    roundId,
    selectedMatchId,
    matches,
    onChange,
}: MatchSelectorProps) {
    const roundMatches = matches.filter((match) => match.roundId === roundId);

    return (
        <section className="rounded-2xl bg-zinc-900 p-4">
            <h2 className="mb-3 text-lg font-bold text-white">Матч</h2>

            <select
                value={selectedMatchId}
                onChange={(event) => onChange(event.target.value)}
                className="w-full rounded-xl bg-zinc-800 px-3 py-3 text-white"
            >
                <option value="">Вибери матч</option>

                {roundMatches.map((match) => {
                    const home = COUNTRIES[match.homeCountry];
                    const away = COUNTRIES[match.awayCountry];

                    return (
                        <option key={match.id} value={match.id}>
                            {home?.name ?? match.homeCountry} —{' '}
                            {away?.name ?? match.awayCountry}
                        </option>
                    );
                })}
            </select>
        </section>
    );
}
