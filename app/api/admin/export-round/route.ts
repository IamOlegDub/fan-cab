import { NextResponse } from 'next/server';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { google } from 'googleapis';
import playersJson from '../../../../data/import/players.json';

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

function buildPlayersMap() {
    return (playersJson as ImportPlayer[]).reduce(
        (acc, player) => {
            const id = createPlayerId(player);

            acc[id] = {
                id,
                position: player.position,
                name: player.name,
                country: player.country,
            };

            return acc;
        },
        {} as Record<string, Player>,
    );
}

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

function buildTransferSheetRows(
    playerIds: string[],
    players: Record<string, Player>,
) {
    return Array.from({ length: 4 }, (_, index) => {
        const playerId = playerIds[index];
        const player = playerId ? players[playerId] : null;

        return [
            player?.position ?? '',
            player?.name ?? '',
            '',
            '',
            '',
            '',
            '',
            '',
            player?.country ?? '',
        ];
    });
}

async function getSheetsClient() {
    const auth = new google.auth.JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
            /\\n/g,
            '\n',
        ),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    return google.sheets({ version: 'v4', auth });
}

export async function POST(request: Request) {
    try {
        const secret = request.headers.get('x-admin-secret');

        if (secret !== process.env.ADMIN_SECRET) {
            return NextResponse.json(
                { message: 'Unauthorized' },
                { status: 401 },
            );
        }

        const { roundId } = await request.json();

        initFirebaseAdmin();

        const db = getFirestore();

        const players = buildPlayersMap();

        const sheets = await getSheetsClient();

        const results = [];

        for (const userCode of TEAM_CODES) {
            try {
                const draftId = `${userCode}_${roundId}`;
                const draftSnap = await db
                    .collection('squadDrafts')
                    .doc(draftId)
                    .get();

                if (!draftSnap.exists) {
                    results.push({
                        userCode,
                        ok: false,
                        error: 'Draft not found',
                    });
                    continue;
                }

                const draft = draftSnap.data() as SquadDraft;

                const squadRows = buildSheetRows(draft, players);
                const transferOutRows = buildTransferSheetRows(
                    draft.transferOut,
                    players,
                );
                const transferInRows = buildTransferSheetRows(
                    draft.transferIn,
                    players,
                );

                await sheets.spreadsheets.values.batchUpdate({
                    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
                    requestBody: {
                        valueInputOption: 'USER_ENTERED',
                        data: [
                            {
                                range: `'${userCode}'!A90:D105`,
                                values: squadRows,
                            },
                            {
                                range: `'${userCode}'!E81:M84`,
                                values: transferOutRows,
                            },
                            {
                                range: `'${userCode}'!P81:X84`,
                                values: transferInRows,
                            },
                        ],
                    },
                });

                results.push({
                    userCode,
                    ok: true,
                });
            } catch (error) {
                console.error(`EXPORT_TEAM_ERROR_${userCode}`, error);

                const apiError = error as {
                    message?: string;
                    code?: number | string;
                    status?: number;
                    response?: {
                        status?: number;
                        statusText?: string;
                        data?: unknown;
                    };
                    cause?: unknown;
                };

                results.push({
                    userCode,
                    ok: false,
                    error: apiError.message ?? String(error),
                    code: apiError.code ?? null,
                    status:
                        apiError.status ?? apiError.response?.status ?? null,
                    statusText: apiError.response?.statusText ?? null,
                    responseData: apiError.response?.data ?? null,
                    cause: apiError.cause ?? null,
                });
            }
        }

        return NextResponse.json({
            ok: results.every((result) => result.ok),
            results,
        });
    } catch (error) {
        console.error('EXPORT_ROUND_ERROR_FULL', error);

        const apiError = error as {
            message?: string;
            code?: number | string;
            status?: number;
            response?: {
                status?: number;
                statusText?: string;
                data?: unknown;
            };
            cause?: unknown;
            stack?: string;
        };

        return NextResponse.json(
            {
                message: 'Failed to export round',
                error: apiError.message ?? String(error),
                code: apiError.code ?? null,
                status: apiError.status ?? apiError.response?.status ?? null,
                statusText: apiError.response?.statusText ?? null,
                responseData: apiError.response?.data ?? null,
                cause: apiError.cause ?? null,
                stack: apiError.stack ?? null,
            },
            { status: 500 },
        );
    }
}
