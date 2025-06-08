'use client';
import { useProjectContext } from '@/contexts/ProjectContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ProjectBillingPage() {
    const { can } = useProjectContext();

    if (!can('billing:read')) {
        return (
            <Card>
                <CardHeader><CardTitle>Permission Denied</CardTitle></CardHeader>
                <CardContent><p>You do not have permission to view billing for this project.</p></CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader><CardTitle>Billing & Invoices</CardTitle></CardHeader>
            <CardContent>
                <p className="text-muted-foreground">This feature is coming soon! View past invoices and manage payment methods for this project here.</p>
            </CardContent>
        </Card>
    );
}