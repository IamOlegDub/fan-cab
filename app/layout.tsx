import type { Metadata } from 'next';
import './globals.css';
import { BottomTabs } from '../components/BottomTabs';

export const metadata: Metadata = {
    title: 'FanCab',
    description: 'Fantasy cabinet for WC2026',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="h-full">
            <body className="min-h-full pb-11">
                {children}
                <BottomTabs />
            </body>
        </html>
    );
}
