'use client';
import {useState, useEffect} from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Skeleton} from '@/components/ui/skeleton';
import {toast} from 'sonner';
import {Loader2} from 'lucide-react';
import {PermissionSelector} from './PermissionSelector';

interface MemberForModal {
    id: string;
    projectId: string;
    permissions: Record<string, boolean> | null;
    user: { name: string | null; };
}

interface PermissionGroup {
    name: string;
    description: string;
    scopes: Record<string, string>;
}

interface EditPermissionsModalProps {
    member: MemberForModal | null;
    isOpen: boolean;
    onClose: () => void;
    onSaveSuccess: (updatedMember: any) => void;
}

export const EditPermissionsModal = ({member, isOpen, onClose, onSaveSuccess}: EditPermissionsModalProps) => {
    const [structure, setStructure] = useState<PermissionGroup[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen) {
            const fetchPermissionStructure = async () => {
                setIsLoading(true);
                try {
                    const res = await fetch('/api/projects/permissions');
                    if (!res.ok) throw new Error('Could not load permission structure');
                    setStructure(await res.json());
                } catch (error) {
                    toast.error(error instanceof Error ? error.message : "An error occurred");
                    onClose();
                } finally {
                    setIsLoading(false);
                }
            };
            fetchPermissionStructure();
            const initialPermissions = member?.permissions ? Object.keys(member.permissions).filter(key => member.permissions![key] === true) : [];
            setSelectedPermissions(initialPermissions);
        }
    }, [member, isOpen, onClose]);

    const handlePermissionChange = (scopeKey: string, isChecked: boolean) => {
        setSelectedPermissions(prev => isChecked ? [...new Set([...prev, scopeKey])] : prev.filter(s => s !== scopeKey));
    };

    const handleSave = async () => {
        if (!member) return;
        setIsSubmitting(true);
        const toastId = toast.loading("Updating permissions...");
        const permissionsObject = selectedPermissions.reduce((acc, scope) => {
            acc[scope] = true;
            return acc;
        }, {} as Record<string, boolean>);

        try {
            const res = await fetch(`/api/projects/${member.projectId}/members/${member.id}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({permissions: permissionsObject}),
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Failed to update permissions');
            const updatedMember = await res.json();
            toast.success("Permissions updated successfully!", {id: toastId});
            onSaveSuccess(updatedMember);
            onClose();
        } catch (error) {
            toast.error("Update Failed", {
                id: toastId,
                description: error instanceof Error ? error.message : "An unknown error"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!member) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Edit Permissions for {member.user.name}</DialogTitle>
                    <DialogDescription>Grant fine-grained access. These permissions override the member's assigned
                        role.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    {isLoading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-8 w-1/3"/>
                            <div className="pl-4 space-y-2"><Skeleton className="h-5 w-full"/><Skeleton
                                className="h-5 w-full"/></div>
                            <Skeleton className="h-8 w-1/3 mt-4"/>
                            <div className="pl-4 space-y-2"><Skeleton className="h-5 w-full"/><Skeleton
                                className="h-5 w-full"/></div>
                        </div>
                    ) : (
                        <PermissionSelector structure={structure} selectedPermissions={selectedPermissions}
                                            onPermissionChange={handlePermissionChange}/>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSubmitting || isLoading}>{isSubmitting &&
                        <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Save Permissions</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};