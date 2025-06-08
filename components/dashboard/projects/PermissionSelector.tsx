'use client';

import {FC} from 'react';
import {Checkbox} from "@/components/ui/checkbox";
import {Label} from "@/components/ui/label";

interface PermissionGroup {
    name: string;
    description: string;
    scopes: Record<string, string>;
}

interface PermissionSelectorProps {
    structure: PermissionGroup[];
    selectedPermissions: string[];
    onPermissionChange: (scopeKey: string, isChecked: boolean) => void;
}

export const PermissionSelector: FC<PermissionSelectorProps> = ({
                                                                    structure,
                                                                    selectedPermissions,
                                                                    onPermissionChange
                                                                }) => {
    return (
        <div className="space-y-2">
            <Label>Granular Permissions</Label>
            <p className="text-xs text-muted-foreground">Override the role's default permissions. This provides
                fine-grained control.</p>
            <div className="space-y-4 rounded-md border p-4 max-h-[40vh] overflow-y-auto">
                {structure.map((group) => (
                    <div key={group.name}>
                        <p className="font-semibold text-sm">{group.name}</p>
                        <div className="pl-4 pt-2 space-y-2">
                            {Object.entries(group.scopes).map(([scopeKey, scopeLabel]) => (
                                <div key={scopeKey} className="flex items-center space-x-3">
                                    <Checkbox
                                        id={scopeKey}
                                        checked={selectedPermissions.includes(scopeKey)}
                                        onCheckedChange={(c) => onPermissionChange(scopeKey, c === true)}
                                    />
                                    <Label htmlFor={scopeKey} className="font-normal text-sm cursor-pointer">
                                        {scopeLabel}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};