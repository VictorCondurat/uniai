import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'destructive' | 'success' | 'warning';
    children: React.ReactNode;
}

const alertVariants = {
    default: 'bg-blue-50 border-blue-200 text-blue-800',
    destructive: 'bg-red-50 border-red-200 text-red-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
};

const alertIcons = {
    default: Info,
    destructive: XCircle,
    success: CheckCircle,
    warning: AlertCircle,
};

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
    ({ className, variant = 'default', children, ...props }, ref) => {
        const Icon = alertIcons[variant];

        return (
            <div
                ref={ref}
                role="alert"
                className={cn(
                    'relative w-full rounded-lg border px-4 py-3 text-sm flex items-start gap-3',
                    alertVariants[variant],
                    className
                )}
                {...props}
            >
                <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div className="flex-1">{children}</div>
            </div>
        );
    }
);
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <h5
        ref={ref}
        className={cn('mb-1 font-medium leading-none tracking-tight', className)}
        {...props}
    />
));
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn('text-sm [&_p]:leading-relaxed', className)}
        {...props}
    />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };