'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';

export default function LoginPage() {
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    async function handleLogin(event: React.FormEvent) {
        event.preventDefault();

        await signInWithEmailAndPassword(auth, email, password);

        router.push('/team');
    }

    return (
        <main className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
            <form
                onSubmit={handleLogin}
                className="w-full max-w-sm space-y-4 rounded-xl bg-zinc-900 p-6"
            >
                <h1 className="text-2xl font-bold">Fantasy Login</h1>

                <input
                    className="w-full rounded bg-zinc-800 px-3 py-2"
                    placeholder="Email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                />

                <input
                    className="w-full rounded bg-zinc-800 px-3 py-2"
                    placeholder="Password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                />

                <button className="w-full rounded bg-blue-600 py-2 font-semibold">
                    Login
                </button>
            </form>
        </main>
    );
}
