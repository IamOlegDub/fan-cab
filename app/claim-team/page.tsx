'use client';

import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { TEAM_CODES } from '@/constants/teamCodes';

export default function ClaimTeamPage() {
    const router = useRouter();

    const [selectedCode, setSelectedCode] = useState('');
    const [userId, setUserId] = useState('');
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                router.push('/login');
                return;
            }

            setUserId(user.uid);
            setEmail(user.email || '');

            const profileSnap = await getDoc(doc(db, 'users', user.uid));

            if (profileSnap.exists()) {
                router.push('/team');
            }
        });

        return () => unsubscribe();
    }, [router]);

    async function handleClaimTeam() {
        if (!selectedCode || !userId) return;

        setError('');

        const codeRef = doc(db, 'teamCodes', selectedCode);
        const codeSnap = await getDoc(codeRef);

        if (!codeSnap.exists()) {
            setError('Такої команди немає.');
            return;
        }

        const codeData = codeSnap.data();

        if (codeData.claimedBy) {
            setError('Цю команду вже зайнято.');
            return;
        }

        await updateDoc(codeRef, {
            claimedBy: userId,
            claimedEmail: email,
        });

        await setDoc(doc(db, 'users', userId), {
            code: selectedCode,
            email,
            role: 'player',
        });

        router.push('/team');
    }

    return (
        <main className="min-h-screen bg-zinc-950 px-4 py-6 text-white">
            <div className="mx-auto max-w-md space-y-5">
                <div>
                    <h1 className="text-2xl font-bold">Обери команду</h1>
                    <p className="text-sm text-zinc-400">
                        Вибери свій код: OD, AD, CG, VM...
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {TEAM_CODES.map((code) => (
                        <button
                            key={code}
                            className={`rounded-xl p-4 font-bold ${
                                selectedCode === code
                                    ? 'bg-blue-600'
                                    : 'bg-zinc-900'
                            }`}
                            onClick={() => setSelectedCode(code)}
                        >
                            {code}
                        </button>
                    ))}
                </div>

                {error && (
                    <div className="rounded-xl bg-red-950 p-4 text-sm text-red-200">
                        {error}
                    </div>
                )}

                <button
                    className="w-full rounded-xl bg-emerald-600 py-3 font-semibold disabled:bg-zinc-800 disabled:text-zinc-500"
                    disabled={!selectedCode}
                    onClick={handleClaimTeam}
                >
                    Привʼязати команду
                </button>
            </div>
        </main>
    );
}
