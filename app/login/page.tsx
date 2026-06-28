'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
} from 'firebase/auth';
import {
    doc,
    runTransaction,
    serverTimestamp,
} from 'firebase/firestore';

import { auth, db } from '@/lib/firebase';

export default function LoginPage() {
    const router = useRouter();

    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [teamCode, setTeamCode] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    async function handleLogin() {
        setError('');
        setIsLoading(true);

        try {
            await signInWithEmailAndPassword(auth, email, password);
            router.push('/team');
        } catch {
            setError('Невірний email або пароль.');
        } finally {
            setIsLoading(false);
        }
    }

    async function handleRegister() {
        setError('');
        setIsLoading(true);

        const normalizedCode = teamCode.trim().toUpperCase();

        try {
            const credential = await createUserWithEmailAndPassword(
                auth,
                email,
                password,
            );

            const uid = credential.user.uid;

            await runTransaction(db, async (transaction) => {
                const teamCodeRef = doc(db, 'teamCodes', normalizedCode);
                const userRef = doc(db, 'users', uid);

                const teamCodeSnap = await transaction.get(teamCodeRef);

                if (!teamCodeSnap.exists()) {
                    throw new Error('TEAM_CODE_NOT_FOUND');
                }

                const teamCodeData = teamCodeSnap.data();

                if (teamCodeData.claimedBy) {
                    throw new Error('TEAM_CODE_ALREADY_CLAIMED');
                }

                transaction.update(teamCodeRef, {
                    claimedBy: uid,
                    claimedEmail: email,
                    claimedAt: serverTimestamp(),
                });

                transaction.set(userRef, {
                    code: normalizedCode,
                    email,
                    role: 'player',
                    createdAt: serverTimestamp(),
                });
            });

            router.push('/team');
        } catch (error) {
            if (error instanceof Error) {
                if (error.message === 'TEAM_CODE_NOT_FOUND') {
                    setError('Такого коду команди не існує.');
                } else if (error.message === 'TEAM_CODE_ALREADY_CLAIMED') {
                    setError('Цей код команди вже використаний.');
                } else {
                    setError('Не вдалося створити акаунт.');
                }
            }
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <main className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
            <form
                className="space-y-3"
                onSubmit={(event) => {
                    event.preventDefault();

                    if (isRegisterMode) {
                        handleRegister();
                    } else {
                        handleLogin();
                    }
                }}
            >
                <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Email"
                    className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-white"
                />

                <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Пароль"
                    className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-white"
                />

                {isRegisterMode && (
                    <input
                        value={teamCode}
                        onChange={(event) => setTeamCode(event.target.value)}
                        placeholder="Код команди, наприклад OD"
                        className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-white uppercase"
                    />
                )}

                {error && (
                    <div className="rounded-xl bg-red-500/10 p-3 text-sm text-red-300">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white disabled:bg-zinc-700"
                >
                    {isLoading
                        ? 'Зачекай...'
                        : isRegisterMode
                          ? 'Створити акаунт'
                          : 'Увійти'}
                </button>

                <button
                    type="button"
                    onClick={() => {
                        setError('');
                        setIsRegisterMode((value) => !value);
                    }}
                    className="w-full py-2 text-sm text-zinc-400"
                >
                    {isRegisterMode ? 'У мене вже є акаунт' : 'Створити акаунт'}
                </button>
            </form>
        </main>
    );
}
