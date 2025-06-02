import { ReactNode } from 'react';

export function Badge({ children, variant, className }: { children: ReactNode; variant?: 'success' | 'destructive' | 'warning' | 'secondary' | 'outline'; className?: string }) {
    const base = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium';
    const colors = {
        success: 'bg-green-100 text-green-800',
        destructive: 'bg-red-100 text-red-800',
        warning: 'bg-yellow-100 text-yellow-800',
        secondary: 'bg-gray-100 text-gray-800',
        outline: 'border border-gray-300 text-gray-800',
    };
    return <span className={`${base} ${colors[variant || 'secondary']} ${className}`}>{children}</span>;
}
