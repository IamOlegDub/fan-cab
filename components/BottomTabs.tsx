'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
    { href: '/team', label: 'Команда' },
    { href: '/results', label: 'Результати' },
    { href: '/admin', label: 'Адмін' },
];

export function BottomTabs() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-zinc-950">
            <div className="mx-auto grid max-w-md grid-cols-3">
                {tabs.map((tab) => {
                    const isActive = pathname.startsWith(tab.href);

                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            className={`py-3 text-center text-sm font-semibold ${
                                isActive ? 'text-blue-400' : 'text-zinc-500'
                            }`}
                        >
                            {tab.label}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
