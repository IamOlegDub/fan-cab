'use client';

import { useState } from 'react';

export default function AdminPage() {
    const [secret, setSecret] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [message, setMessage] = useState('');

    async function handleExportRound() {
        setIsExporting(true);
        setMessage('');

        try {
            const response = await fetch('/api/admin/export-round', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-secret': secret,
                },
                body: JSON.stringify({
                    roundId: 'round_116',
                }),
            });

            if (!response.ok) {
                throw new Error('Export failed');
            }

            setMessage('Склади експортовано в Google Sheets');
        } catch {
            setMessage('Помилка експорту');
        } finally {
            setIsExporting(false);
        }
    }

    return (
        <main className="min-h-screen bg-zinc-950 p-4 text-white">
            <h1 className="mb-4 text-2xl font-bold">Admin</h1>

            <input
                type="password"
                value={secret}
                onChange={(event) => setSecret(event.target.value)}
                placeholder="Admin secret"
                className="mb-3 w-full rounded-xl bg-zinc-900 px-4 py-3"
            />

            <button
                type="button"
                disabled={isExporting || !secret}
                onClick={handleExportRound}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold disabled:bg-zinc-700"
            >
                {isExporting ? 'Експорт...' : 'Експортувати всі склади'}
            </button>

            {message && (
                <div className="mt-4 rounded-xl bg-zinc-900 p-3 text-sm">
                    {message}
                </div>
            )}
        </main>
    );
}
