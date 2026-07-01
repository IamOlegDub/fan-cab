import { NextResponse } from 'next/server';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const TEAM_CODES = ['OD', 'AD', 'CG', 'VM', 'BT', 'YS', 'RB', 'OM'];

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
    const secret = request.headers.get('x-admin-secret');

    if (secret !== process.env.ADMIN_SECRET) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const {
        fromRoundId = 'round_116',
        toRoundId = 'round_18',
        toRoundName = '1/8',
        maxTransfers = 4,
        maxFromSameTeam = 2,
    } = await request.json();

    initFirebaseAdmin();

    const db = getFirestore();

    await db.collection('rounds').doc(toRoundId).set(
        {
            name: toRoundName,
            isLocked: false,
            maxTransfers,
            maxFromSameTeam,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        { merge: true },
    );

    const batch = db.batch();

    for (const code of TEAM_CODES) {
        const previousDraftRef = db
            .collection('squadDrafts')
            .doc(`${code}_${fromRoundId}`);

        const previousDraftSnap = await previousDraftRef.get();

        if (!previousDraftSnap.exists) continue;

        const previousDraft = previousDraftSnap.data();

        const starters = previousDraft?.starters ?? [];
        const bench = previousDraft?.bench ?? [];
        const c1 = previousDraft?.c1 ?? '';
        const c2 = previousDraft?.c2 ?? '';

        const nextDraftRef = db
            .collection('squadDrafts')
            .doc(`${code}_${toRoundId}`);

        batch.set(nextDraftRef, {
            userCode: code,
            roundId: toRoundId,

            starters,
            bench,

            c1,
            c2,

            originalStarters: starters,
            originalBench: bench,
            originalC1: c1,
            originalC2: c2,

            transferIn: [],
            transferOut: [],

            submittedAt: null,
            updatedAt: new Date(),
            createdAt: new Date(),
        });
    }

    await batch.commit();

    return NextResponse.json({ ok: true });
}
