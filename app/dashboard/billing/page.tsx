export default function BillingPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
                <p className="mt-1 text-sm text-gray-600">
                    Manage your billing and invoices
                </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Current Usage</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded">
                        <p className="text-2xl font-bold text-gray-900">$23.45</p>
                        <p className="text-sm text-gray-600">This month</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded">
                        <p className="text-2xl font-bold text-gray-900">$18.20</p>
                        <p className="text-sm text-gray-600">Last month</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded">
                        <p className="text-2xl font-bold text-gray-900">$156.78</p>
                        <p className="text-sm text-gray-600">Total</p>
                    </div>
                </div>
            </div>
        </div>
    );
}