'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function KeysPage() {
    const [keys, setKeys] = useState([
        { id: '1', name: 'Production Key', key: 'sk-...xyz', active: true, lastUsed: '2 hours ago' },
        { id: '2', name: 'Development Key', key: 'sk-...abc', active: true, lastUsed: '1 day ago' },
    ]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
                    <p className="mt-1 text-sm text-gray-600">
                        Manage your API keys for accessing UniAI services
                    </p>
                </div>
                <Button>Create New Key</Button>
            </div>

            <div className="bg-white shadow overflow-hidden rounded-lg">
                <ul className="divide-y divide-gray-200">
                    {keys.map((key) => (
                        <li key={key.id} className="px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{key.name}</p>
                                        <p className="text-sm text-gray-500">{key.key}</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                      key.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {key.active ? 'Active' : 'Inactive'}
                  </span>
                                    <span className="text-sm text-gray-500">Last used: {key.lastUsed}</span>
                                    <Button variant="outline" size="sm">Revoke</Button>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}