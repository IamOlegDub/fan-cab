import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export function initFirebaseAdmin() {
    if (getApps().length > 0) return;

    initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}

export async function requireAdmin(request: Request) {
    initFirebaseAdmin();

    const authHeader = request.headers.get('authorization');

    const token = authHeader?.startsWith('Bearer ')
        ? authHeader.replace('Bearer ', '')
        : null;

    if (!token) {
        throw new Error('UNAUTHORIZED');
    }

    const decodedToken = await getAuth().verifyIdToken(token);

    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();

    if (!adminEmail || decodedToken.email?.toLowerCase() !== adminEmail) {
        throw new Error('FORBIDDEN');
    }

    return decodedToken;
}
