'use client';
import {FC, useState, useEffect, useCallback} from 'react';
import {useForm, SubmitHandler} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {toast} from 'sonner';
import {Project, ProjectRole} from '@prisma/client';
import {useProjectPermissions} from '@/hooks/useProjectPermissions';
import {Button} from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from '@/components/ui/form';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar';
import {Skeleton} from '@/components/ui/skeleton';
import {Loader2, PlusCircle, Trash2, User, Pencil} from 'lucide-react';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/tooltip';
import {EditPermissionsModal} from './EditPermissionsModal';

interface Member {
    id: string;
    role: ProjectRole;
    permissions: Record<string, boolean> | null;
    user: { id: string; name: string | null; email: string; image: string | null; };
}

interface ManageMembersModalProps {
    project: (Project & { userRole: ProjectRole }) | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}


const inviteFormSchema = z.object({
    email: z.string().email('Please enter a valid email address.'),
    role: z.nativeEnum(ProjectRole),
});

type InviteFormData = z.infer<typeof inviteFormSchema>;

export const ManageMembersModal: FC<ManageMembersModalProps> = ({project, isOpen, onClose, onUpdate}) => {
    const [members, setMembers] = useState<Member[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingMember, setEditingMember] = useState<Member | null>(null);
    const {can} = useProjectPermissions(project?.userRole);

    const form = useForm<InviteFormData>({
        resolver: zodResolver(inviteFormSchema),
        defaultValues: {
            email: '',
            role: ProjectRole.MEMBER
        }
    });

    const fetchMembers = useCallback(async () => {
        if (!project) return;
        setIsLoading(true);
        try {
            const res = await fetch(`/api/projects/${project.id}/members`);
            if (!res.ok) throw new Error('Failed to fetch members');
            setMembers(await res.json());
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, [project]);

    useEffect(() => {
        if (isOpen) fetchMembers();
    }, [isOpen, fetchMembers]);

    const onInviteSubmit: SubmitHandler<InviteFormData> = async (data) => {
        if (!project) return;
        const toastId = toast.loading(`Adding ${data.email}...`);
        try {
            const res = await fetch(`/api/projects/${project.id}/members`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error((await res.json()).error);
            toast.success('Member added successfully!', {id: toastId});
            form.reset();
            fetchMembers();
            onUpdate();
        } catch (err) {
            toast.error('Failed to add member', {id: toastId, description: err instanceof Error ? err.message : ''});
        }
    };

    const handleRoleChange = async (memberId: string, role: ProjectRole) => {
        if (!project) return;
        const toastId = toast.loading('Updating role...');
        try {
            const res = await fetch(`/api/projects/${project.id}/members/${memberId}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({role})
            });
            if (!res.ok) throw new Error((await res.json()).error);
            toast.success('Role updated successfully', {id: toastId});
            fetchMembers();
        } catch (err) {
            toast.error('Failed to update role', {id: toastId, description: err instanceof Error ? err.message : ''});
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!project) return;
        const toastId = toast.loading('Removing member...');
        try {
            const res = await fetch(`/api/projects/${project.id}/members/${memberId}`, {method: 'DELETE'});
            if (!res.ok) throw new Error((await res.json()).error || 'Failed to remove member');
            toast.success('Member removed successfully', {id: toastId});
            fetchMembers();
            onUpdate();
        } catch (err) {
            toast.error('Failed to remove member', {id: toastId, description: err instanceof Error ? err.message : ''});
        }
    };

    if (!project) return null;

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Manage Members for "{project.name}"</DialogTitle>
                        <DialogDescription>
                            View, add, and manage who has access to this project.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                        <div className="md:col-span-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Current Members</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Member</TableHead>
                                                <TableHead>Role</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {isLoading && Array.from({length: 2}).map((_, i) => (
                                                <TableRow key={i}>
                                                    <TableCell colSpan={3}>
                                                        <Skeleton className="h-12 w-full"/>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {!isLoading && members.map((member) => (
                                                <TableRow key={member.id}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <Avatar>
                                                                <AvatarImage src={member.user.image || undefined}/>
                                                                <AvatarFallback>
                                                                    <User className="w-4 h-4"/>
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <p className="font-medium">
                                                                    {member.user.name || 'Invited User'}
                                                                </p>
                                                                <p className="text-sm text-muted-foreground">
                                                                    {member.user.email}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {member.role === 'OWNER' ? (
                                                            <span className="font-semibold">Owner</span>
                                                        ) : (
                                                            <Select
                                                                value={member.role}
                                                                onValueChange={(v) => handleRoleChange(member.id, v as ProjectRole)}
                                                                disabled={!can('members:update-role')}
                                                            >
                                                                <SelectTrigger className="w-[120px] h-9">
                                                                    <SelectValue/>
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {Object.values(ProjectRole).filter(r => r !== 'OWNER').map(r => (
                                                                        <SelectItem key={r} value={r}>
                                                                            {r.charAt(0) + r.slice(1).toLowerCase()}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {member.role !== 'OWNER' && (
                                                            <TooltipProvider>
                                                                <div className="flex items-center justify-end gap-1">
                                                                    {can('members:update-role') && (
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    onClick={() => setEditingMember(member)}
                                                                                >
                                                                                    <Pencil className="w-4 h-4"/>
                                                                                </Button>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>Edit Permissions</TooltipContent>
                                                                        </Tooltip>
                                                                    )}
                                                                    {can('members:remove') && (
                                                                        <AlertDialog>
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <AlertDialogTrigger asChild>
                                                                                        <Button
                                                                                            variant="ghost"
                                                                                            size="icon"
                                                                                            className="text-destructive hover:text-destructive"
                                                                                        >
                                                                                            <Trash2 className="w-4 h-4"/>
                                                                                        </Button>
                                                                                    </AlertDialogTrigger>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent>Remove Member</TooltipContent>
                                                                            </Tooltip>
                                                                            <AlertDialogContent>
                                                                                <AlertDialogHeader>
                                                                                    <AlertDialogTitle>
                                                                                        Remove {member.user.name || member.user.email}?
                                                                                    </AlertDialogTitle>
                                                                                    <AlertDialogDescription>
                                                                                        They will lose all access to this project.
                                                                                    </AlertDialogDescription>
                                                                                </AlertDialogHeader>
                                                                                <AlertDialogFooter>
                                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                                    <AlertDialogAction
                                                                                        onClick={() => handleRemoveMember(member.id)}
                                                                                        className="bg-destructive hover:bg-destructive/90"
                                                                                    >
                                                                                        Remove
                                                                                    </AlertDialogAction>
                                                                                </AlertDialogFooter>
                                                                            </AlertDialogContent>
                                                                        </AlertDialog>
                                                                    )}
                                                                </div>
                                                            </TooltipProvider>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                        {can('members:invite') && (
                            <div>
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Add New Member</CardTitle>
                                        <CardDescription>
                                            The user must have an existing account.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Form {...form}>
                                            <form onSubmit={form.handleSubmit(onInviteSubmit)} className="space-y-4">
                                                <FormField
                                                    name="email"
                                                    control={form.control}
                                                    render={({field}) => (
                                                        <FormItem>
                                                            <FormLabel>Email Address</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="user@example.com" {...field} />
                                                            </FormControl>
                                                            <FormMessage/>
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    name="role"
                                                    control={form.control}
                                                    render={({field}) => (
                                                        <FormItem>
                                                            <FormLabel>Role</FormLabel>
                                                            <Select
                                                                onValueChange={field.onChange}
                                                                defaultValue={field.value}
                                                            >
                                                                <FormControl>
                                                                    <SelectTrigger>
                                                                        <SelectValue/>
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent>
                                                                    {Object.values(ProjectRole).filter(r => r !== 'OWNER').map(r => (
                                                                        <SelectItem key={r} value={r}>
                                                                            {r.charAt(0) + r.slice(1).toLowerCase()}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            <FormMessage/>
                                                        </FormItem>
                                                    )}
                                                />
                                                <Button
                                                    type="submit"
                                                    className="w-full"
                                                    disabled={form.formState.isSubmitting}
                                                >
                                                    {form.formState.isSubmitting ? (
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin"/>
                                                    ) : (
                                                        <PlusCircle className="w-4 h-4 mr-2"/>
                                                    )}
                                                    Add Member
                                                </Button>
                                            </form>
                                        </Form>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>
                    <DialogFooter className="pt-4">
                        <Button variant="outline" onClick={onClose}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {editingMember && (
                <EditPermissionsModal
                    member={{...editingMember, projectId: project.id}}
                    isOpen={!!editingMember}
                    onClose={() => setEditingMember(null)}
                    onSaveSuccess={fetchMembers}
                />
            )}
        </>
    );
};