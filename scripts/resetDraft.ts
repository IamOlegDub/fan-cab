import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

import OD from '../data/import/OD.json';

type ImportPlayer = {
    position: string;
    name: string;
    country: string;
};

function createPlayerId(player: ImportPlayer) {
    return `${player.name}_${player.country}`
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
}

if (!getApps().length) {
    initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}

const db = getFirestore();

async function reset() {
    const starters = OD.starters.map(createPlayerId);
    const bench = OD.bench.map(createPlayerId);

    const allPlayers = [...OD.starters, ...OD.bench];

    const c1Player = allPlayers.find((player) => player.name === OD.c1);
    const c2Player = allPlayers.find((player) => player.name === OD.c2);

    const c1 = c1Player ? createPlayerId(c1Player) : '';
    const c2 = c2Player ? createPlayerId(c2Player) : '';

    await db.doc('squadDrafts/OD_round_116').set({
        userCode: 'OD',
        roundId: 'round_116',

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
    });

    console.log('OD reset');
}

reset();
