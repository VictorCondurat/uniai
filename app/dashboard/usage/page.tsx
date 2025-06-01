export default function UsagePage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Usage</h1>
                <p className="mt-1 text-sm text-gray-600">
                    Track your API usage across all models
                </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Usage</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tokens</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                        <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">GPT-4</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">1,234</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">$0.25</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Today</td>
                        </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}