import { DashboardOverview } from '@/components/dashboard/overview';

export default function DashboardPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="mt-1 text-sm text-gray-600">
                    Overview of your API usage and billing
                </p>
            </div>
            <DashboardOverview />
        </div>
    );
}