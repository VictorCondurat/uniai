import { getServerSession } from 'next-auth/next';
import { DashboardOverview } from '@/components/dashboard/overview';
import { authOptions } from '@/lib/nextAuthOptions';

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);
    const user = session?.user || { name: 'User', email: '' };

    return (
        <div className="space-y-8">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 p-8 text-white">
                <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.5))]" />
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold mb-2">
                        Welcome back, {user.name || user.email?.split('@')[0] || 'User'}
                    </h1>
                    <p className="text-blue-100 text-lg">
                        Here's your AI gateway overview for today
                    </p>
                </div>

                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
            </div>

            <DashboardOverview />
        </div>
    );
}