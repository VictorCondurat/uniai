import { ReactNode } from 'react';

export function Card({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={`bg-white border rounded shadow ${className}`}>{children}</div>;
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={`px-4 py-2 border-b ${className}`}>{children}</div>;
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
    return <h4 className={`text-lg font-semibold ${className}`}>{children}</h4>;
}

export function CardContent({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={`px-4 py-2 ${className}`}>{children}</div>;
}

export function CardDescription({ children, className }: { children: ReactNode; className?: string }) {
    return <p className={`text-sm text-muted-foreground ${className}`}>{children}</p>;
}

export function CardFooter({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={`px-4 py-2 border-t ${className}`}>{children}</div>;
}