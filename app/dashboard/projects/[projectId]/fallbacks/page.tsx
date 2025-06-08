'use client';
import { useProjectContext } from '@/contexts/ProjectContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ProjectFallbacksPage() {
    const { can } = useProjectContext();

    if (!can('fallbacks:read')) {
        return (
            <Card>
                <CardHeader><CardTitle>Permission Denied</CardTitle></CardHeader>
                <CardContent><p>You do not have permission to manage fallbacks for this project.</p></CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader><CardTitle>Model Fallbacks</CardTitle></CardHeader>
            <CardContent>
                <p className="text-muted-foreground">This feature is coming soon! Configure rules to automatically retry failed requests with a different model.</p>
            </CardContent>
        </Card>
    );
}