'use client';
import {useState, useEffect, useCallback} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {toast} from 'sonner';
import {ProjectRole} from '@prisma/client';
import { useProjectContext } from '@/contexts/ProjectContext';
import {Button} from '@/components/ui/button';
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
import {PlusCircle, Trash2, User, Pencil} from 'lucide-react';
import {EditPermissionsModal} from '@/components/dashboard/projects/EditPermissionsModal';
import {Tooltip, TooltipProvider, TooltipTrigger, TooltipContent} from '@/components/ui/tooltip';
import { Badge as BadgeComponent } from '@/components/ui/badge';
interface Member {
    id: string;
    role: ProjectRole;
    permissions: Record<string, boolean> | null;
    user: { id: string; name: string | null; email: string; image: string | null; };
}

const inviteFormSchema = z.object({
    email: z.string().email('Please enter a valid email address.'),
    role: z.nativeEnum(ProjectRole)
});
type InviteFormData = z.infer<typeof inviteFormSchema>;

export default function ManageMembersPage() {
    const {project, can} = useProjectContext();
    const projectId = project?.id;
    const [members, setMembers] = useState<Member[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingMember, setEditingMember] = useState<Member | null>(null);

    const form = useForm<InviteFormData>({
        resolver: zodResolver(inviteFormSchema),
        defaultValues: {
            email: '',
            role: ProjectRole.MEMBER
        },
    });

    const fetchMembers = useCallback(async () => {
        if (!projectId) return;
        setIsLoading(true);
        try {
            const res = await fetch(`/api/projects/${projectId}/members`);
            if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch members');
            setMembers(await res.json());
        } catch (err) {
            toast.error("Failed to load members", {description: err instanceof Error ? err.message : ''});
        } finally {
            setIsLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchMembers();
    }, [fetchMembers]);

    const onInviteSubmit = async (data: InviteFormData) => {
        const toastId = toast.loading(`Inviting ${data.email}...`);
        try {
            const res = await fetch(`/api/projects/${projectId}/members`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error((await res.json()).error);
            toast.success('Member invited successfully!', {id: toastId});
            form.reset();
            fetchMembers();
        } catch (err) {
            toast.error('Failed to invite member', {id: toastId, description: err instanceof Error ? err.message : ''});
        }
    };

    const handleRoleChange = async (memberId: string, role: ProjectRole) => {
        const toastId = toast.loading('Updating role...');
        try {
            const res = await fetch(`/api/projects/${projectId}/members/${memberId}`, {
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
        const toastId = toast.loading('Removing member...');
        try {
            const res = await fetch(`/api/projects/${projectId}/members/${memberId}`, {method: 'DELETE'});
            if (!res.ok) throw new Error((await res.json()).error || "Failed to remove member");
            toast.success('Member removed successfully', {id: toastId});
            fetchMembers();
        } catch (err) {
            toast.error('Failed to remove member', {id: toastId, description: err instanceof Error ? err.message : ''});
        }
    };

    return (
        <>
            <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2">
                    <Card>
                        <CardHeader><CardTitle>Project Members</CardTitle><CardDescription>View and manage who has
                            access to this project.</CardDescription></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader><TableRow><TableHead>Member</TableHead><TableHead>Role</TableHead><TableHead
                                    className="text-right">Actions</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {isLoading && Array.from({length: 3}).map((_, i) => <TableRow key={i}><TableCell
                                        colSpan={3}><Skeleton className="h-10 w-full"/></TableCell></TableRow>)}
                                    {!isLoading && members.map((member) => (
                                        <TableRow key={member.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3"><Avatar><AvatarImage
                                                    src={member.user.image || undefined}/><AvatarFallback><User
                                                    className="w-4 h-4"/></AvatarFallback></Avatar>
                                                    <div><p
                                                        className="font-medium">{member.user.name || member.user.email}</p>
                                                        <p className="text-sm text-muted-foreground">{member.user.email}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{member.role === 'OWNER' ? <BadgeComponent>Owner</BadgeComponent> :
                                                <Select value={member.role}
                                                        onValueChange={(v) => handleRoleChange(member.id, v as ProjectRole)}
                                                        disabled={!can('members:update-role')}><SelectTrigger
                                                    className="w-[120px]"><SelectValue/></SelectTrigger><SelectContent>{Object.values(ProjectRole).filter(r => r !== 'OWNER').map(r =>
                                                    <SelectItem key={r}
                                                                value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</SelectItem>)}</SelectContent></Select>}</TableCell>
                                            <TableCell className="text-right">
                                                {member.role !== 'OWNER' && (
                                                    <TooltipProvider delayDuration={100}>
                                                        <div className="flex items-center justify-end">
                                                            {can('members:update-role') &&
                                                                <Tooltip><TooltipTrigger asChild><Button variant="ghost"
                                                                                                         size="icon"
                                                                                                         onClick={() => setEditingMember(member)}><Pencil
                                                                    className="w-4 h-4"/></Button></TooltipTrigger><TooltipContent>Edit
                                                                    Permissions</TooltipContent></Tooltip>}
                                                            {can('members:remove') && <Tooltip><TooltipTrigger
                                                                asChild><AlertDialog><AlertDialogTrigger asChild><Button
                                                                variant="ghost" size="icon"
                                                                className="text-destructive hover:text-destructive"><Trash2
                                                                className="w-4 h-4"/></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remove {member.user.name || member.user.email}?</AlertDialogTitle><AlertDialogDescription>They
                                                                will lose all access to this
                                                                project.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction
                                                                onClick={() => handleRemoveMember(member.id)}
                                                                className="bg-destructive hover:bg-destructive/90">Remove</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></TooltipTrigger><TooltipContent>Remove
                                                                Member</TooltipContent></Tooltip>}
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
                            <CardHeader><CardTitle>Invite New Member</CardTitle><CardDescription>The user must have an
                                existing account.</CardDescription></CardHeader>
                            <CardContent>
                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(onInviteSubmit)} className="space-y-4">
                                        <FormField name="email" control={form.control}
                                                   render={({field}) => <FormItem><FormLabel>Email
                                                       Address</FormLabel><FormControl><Input
                                                       placeholder="user@example.com" {...field} /></FormControl><FormMessage/></FormItem>}/>
                                        <FormField name="role" control={form.control}
                                                   render={({field}) => <FormItem><FormLabel>Role</FormLabel><Select
                                                       onValueChange={field.onChange}
                                                       defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{Object.values(ProjectRole).filter(r => r !== 'OWNER').map(r =>
                                                       <SelectItem key={r}
                                                                   value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>}/>
                                        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}><PlusCircle
                                            className="w-4 h-4 mr-2"/> Send Invitation</Button>
                                    </form>
                                </Form>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
            {editingMember && (
                <EditPermissionsModal
                    member={{...editingMember, projectId: projectId!}}
                    isOpen={!!editingMember}
                    onClose={() => setEditingMember(null)}
                    onSaveSuccess={fetchMembers}
                />
            )}
        </>
    );
}