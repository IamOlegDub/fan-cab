import { NextResponse } from 'next/server';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { requireAdmin } from '@/lib/firebaseAdmin';

function initFirebaseAdmin() {
    if (getApps().length > 0) return;

    initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}

export async function POST(request: Request) {
    try {
        await requireAdmin(request);
    } catch (error) {
        return NextResponse.json(
            {
                message:
                    error instanceof Error && error.message === 'FORBIDDEN'
                        ? 'Forbidden'
                        : 'Unauthorized',
            },
            {
                status:
                    error instanceof Error && error.message === 'FORBIDDEN'
                        ? 403
                        : 401,
            },
        );
    }
    const { roundId, isLocked } = await request.json();

    initFirebaseAdmin();

    await getFirestore()
        .collection('rounds')
        .doc(roundId)
        .update({
            isLocked: Boolean(isLocked),
            updatedAt: new Date(),
        });

    return NextResponse.json({ ok: true });
}
