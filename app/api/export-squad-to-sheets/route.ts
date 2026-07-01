import { NextResponse } from 'next/server';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { google } from 'googleapis';

type Player = {
    id: string;
    position: string;
    name: string;
    country: string;
};

type SquadDraft = {
    userCode: string;
    roundId: string;
    starters: string[];
    bench: string[];
    c1: string;
    c2: string;
    transferIn: string[];
    transferOut: string[];
};

const ALLOWED_TEAM_CODES = ['OD', 'AD', 'CG', 'VM', 'BT', 'YS', 'RB', 'OM'];

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

function getCaptainLabel(playerId: string, draft: SquadDraft) {
    if (draft.c1 === playerId) return 'C1';
    if (draft.c2 === playerId) return 'C2';

    return '';
}

function buildSheetRows(draft: SquadDraft, players: Record<string, Player>) {
    const starterRows = draft.starters.map((playerId) => {
        const player = players[playerId];

        return [
            player?.position ?? '',
            player?.name ?? '',
            getCaptainLabel(playerId, draft),
            player?.country ?? '',
        ];
    });

    const benchRows = draft.bench.map((playerId) => {
        const player = players[playerId];

        return [
            player?.position ?? '',
            player?.name ?? '',
            '',
            player?.country ?? '',
        ];
    });

    return [...starterRows, ['', '', '', ''], ...benchRows];
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const userCode = String(body.userCode ?? '');
        const roundId = String(body.roundId ?? 'round_116');

        if (!ALLOWED_TEAM_CODES.includes(userCode)) {
            return NextResponse.json(
                { message: 'Invalid team code' },
                { status: 400 },
            );
        }

        initFirebaseAdmin();

        const db = getFirestore();

        const draftId = `${userCode}_${roundId}`;

        const draftSnap = await db.collection('squadDrafts').doc(draftId).get();

        if (!draftSnap.exists) {
            return NextResponse.json(
                { message: 'Draft not found' },
                { status: 404 },
            );
        }

        const draft = draftSnap.data() as SquadDraft;

        const playersSnap = await db.collection('players').get();

        const players: Record<string, Player> = {};

        playersSnap.forEach((playerDoc) => {
            const data = playerDoc.data() as Omit<Player, 'id'>;

            players[playerDoc.id] = {
                id: playerDoc.id,
                ...data,
            };
        });

        const values = buildSheetRows(draft, players);

        const auth = new google.auth.JWT({
            email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
                /\\n/g,
                '\n',
            ),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const sheets = google.sheets({
            version: 'v4',
            auth,
        });

        await sheets.spreadsheets.values.update({
            spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
            range: `'${userCode}'!A90:D105`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values,
            },
        });

        const transferOutRows = buildTransferSheetRows(
            draft.transferOut,
            players,
        );
        const transferInRows = buildTransferSheetRows(
            draft.transferIn,
            players,
        );

        await sheets.spreadsheets.values.update({
            spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
            range: `'${userCode}'!E81:M84`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: transferOutRows,
            },
        });

        await sheets.spreadsheets.values.update({
            spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
            range: `'${userCode}'!P81:X84`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: transferInRows,
            },
        });

        return NextResponse.json({
            ok: true,
            message: 'Squad exported to Google Sheets',
        });
    } catch (error) {
        console.error('EXPORT_TO_SHEETS_ERROR', error);

        return NextResponse.json(
            {
                message: 'Failed to export squad',
                error: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}

function buildTransferSheetRows(
    playerIds: string[],
    players: Record<string, Player>,
) {
    return Array.from({ length: 4 }, (_, index) => {
        const playerId = playerIds[index];
        const player = playerId ? players[playerId] : null;

        return [
            player?.position ?? '', // E або P
            player?.name ?? '', // F або Q
            '', // G або R
            '', // H або S
            '', // I або T
            '', // J або U
            '', // K або V
            '', // L або W
            player?.country ?? '', // M або X
        ];
    });
}
