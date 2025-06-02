import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { DashboardNav } from '@/components/dashboard/nav';
import { authOptions } from '@/lib/nextAuthOptions';

export default async function DashboardLayout({
                                                  children,
                                              }: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect('/login');
    }

    return (
        <div className="min-h-screen bg-gray-50/50">
            <DashboardNav user={session.user} />

            <main className="lg:pl-20 pt-16 lg:pt-0">
                <div className="p-6 lg:p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}