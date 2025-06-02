'use client';

import {useState} from 'react';
import {Switch} from '@/components/ui/switch';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {toast} from 'sonner';

interface AutoModelToggleProps {
    enabled: boolean;
    onToggle: (enabled: boolean) => void;
}

export function AutoModelToggle({enabled, onToggle}: AutoModelToggleProps) {
    const [loading, setLoading] = useState(false);

    const handleToggle = async (checked: boolean) => {
        setLoading(true);
        try {
            const response = await fetch('/api/settings/auto-model', {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({enabled: checked}),
            });

            if (response.ok) {
                onToggle(checked);

                toast.success(`Auto model selection ${checked ? 'enabled' : 'disabled'}`);
            } else {
                throw new Error('Failed to update setting');
            }
        } catch (error) {
            toast.error(`Error updating setting: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Auto Model Selection</CardTitle>
                <CardDescription>
                    Automatically select the most cost-effective model for each request
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-sm font-medium">Enable Auto Selection</p>
                        <p className="text-sm text-gray-500">
                            The system will analyze each request and choose the optimal model
                        </p>
                    </div>
                    <Switch
                        checked={enabled}
                        onCheckedChange={handleToggle}
                        disabled={loading}
                    />
                </div>
            </CardContent>
        </Card>
    );
}