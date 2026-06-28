import { NextResponse } from 'next/server';

const TEAM_CODES = ['OD', 'AD', 'CG', 'VM', 'BT', 'YS', 'RB', 'OM'];

export async function POST(request: Request) {
    const secret = request.headers.get('x-admin-secret');

    if (secret !== process.env.ADMIN_SECRET) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { roundId } = await request.json();

    const results = [];

    for (const userCode of TEAM_CODES) {
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL}/api/export-squad-to-sheets`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-secret': process.env.ADMIN_SECRET ?? '',
                },
                body: JSON.stringify({
                    userCode,
                    roundId,
                }),
            },
        );

        results.push({
            userCode,
            ok: response.ok,
        });
    }

    return NextResponse.json({ ok: true, results });
}
