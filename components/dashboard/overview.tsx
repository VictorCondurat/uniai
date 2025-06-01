export function DashboardOverview() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500">Total Requests</h3>
                <p className="text-2xl font-bold text-gray-900">1,234</p>
                <p className="text-sm text-green-600">+12% from last month</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500">Total Tokens</h3>
                <p className="text-2xl font-bold text-gray-900">45.2K</p>
                <p className="text-sm text-green-600">+8% from last month</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500">Current Month Cost</h3>
                <p className="text-2xl font-bold text-gray-900">$23.45</p>
                <p className="text-sm text-red-600">+15% from last month</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500">Active API Keys</h3>
                <p className="text-2xl font-bold text-gray-900">3</p>
                <p className="text-sm text-gray-600">2 in use</p>
            </div>
        </div>
    );
}