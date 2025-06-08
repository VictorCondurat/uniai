'use client';

import { ApiKeyManager } from '@/components/dashboard/keys/ApiKeyManager';
import { ProjectPermission } from '@/lib/permissions';

export default function GlobalKeysPage() {

    const can = (permission: ProjectPermission): boolean => true;

    return <ApiKeyManager can={can} />;
}