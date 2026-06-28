import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import players from '../data/import/players.json';
import OD from '../data/import/OD.json';
import AD from '../data/import/AD.json';
import CG from '../data/import/CG.json';
import VM from '../data/import/VM.json';
import BT from '../data/import/BT.json';
import YS from '../data/import/YS.json';
import RB from '../data/import/RB.json';
import OM from '../data/import/OM.json';
import type { ServiceAccount } from 'firebase-admin';

const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

initializeApp({
    credential: cert(serviceAccount as ServiceAccount),
});

const db = getFirestore();

type ImportPlayer = {
    position: 'GK' | 'DF' | 'MF' | 'FW';
    name: string;
    country: string;
};

type TeamImport = {
    starters: ImportPlayer[];
    bench: ImportPlayer[];
    c1: string;
    c2: string;
};

const teams: Record<string, TeamImport> = {
    OD: OD as TeamImport,
    AD: AD as TeamImport,
    CG: CG as TeamImport,
    VM: VM as TeamImport,
    BT: BT as TeamImport,
    YS: YS as TeamImport,
    RB: RB as TeamImport,
    OM: OM as TeamImport,
};

function createPlayerId(player: ImportPlayer) {
    return `${player.name}_${player.country}`
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
}

async function importPlayers() {
    const batch = db.batch();

    for (const player of players as ImportPlayer[]) {
        const id = createPlayerId(player);

        batch.set(db.collection('players').doc(id), {
            id,
            name: player.name,
            position: player.position,
            country: player.country,
            isEliminated: false,
        });
    }

    await batch.commit();
    console.log('Players imported');
}

async function importSquadDrafts() {
    for (const [teamCode, squad] of Object.entries(teams)) {
        const starters = squad.starters.map(createPlayerId);
        const bench = squad.bench.map(createPlayerId);

        const c1Player = [...squad.starters, ...squad.bench].find(
            (player) => player.name === squad.c1,
        );

        const c2Player = [...squad.starters, ...squad.bench].find(
            (player) => player.name === squad.c2,
        );

        const draftId = `${teamCode}_round_116`;

        await db
            .collection('squadDrafts')
            .doc(draftId)
            .set({
                userCode: teamCode,
                roundId: 'round_116',

                starters,
                bench,

                c1: c1Player ? createPlayerId(c1Player) : '',
                c2: c2Player ? createPlayerId(c2Player) : '',

                originalStarters: starters,
                originalBench: bench,

                originalC1: c1Player ? createPlayerId(c1Player) : '',
                originalC2: c2Player ? createPlayerId(c2Player) : '',

                transferIn: [],
                transferOut: [],

                submittedAt: null,
                updatedAt: new Date(),
            });

        console.log(`${draftId} imported`);
    }
}

async function main() {
    await importPlayers();
    await importSquadDrafts();

    console.log('Import finished');
}

main();
