import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'UniAI - Unified AI API Gateway',
    description: 'Access multiple LLM providers through one unified API',
};

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
        <body className="antialiased">
        {children}
        </body>
        </html>
    );
}