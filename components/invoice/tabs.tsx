import { useState, createContext, useContext, ReactNode } from 'react';

interface TabsContextValue {
    value: string;
    setValue: (v: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

export function Tabs({ defaultValue, children, className }: { defaultValue: string; children: ReactNode; className?: string }) {
    const [value, setValue] = useState(defaultValue);
    return (
        <TabsContext.Provider value={{ value, setValue }}>
            <div className={className}>{children}</div>
        </TabsContext.Provider>
    );
}

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={className}>{children}</div>;
}

export function TabsTrigger({ value, children }: { value: string; children: ReactNode }) {
    const ctx = useContext(TabsContext)!;
    const selected = ctx.value === value;
    return (
        <button
            onClick={() => ctx.setValue(value)}
            className={`${selected ? 'border-b-2 border-blue-500' : 'border-b-2 border-transparent'} px-2 py-1`}
        >
            {children}
        </button>
    );
}

export function TabsContent({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
    const ctx = useContext(TabsContext)!;
    if (ctx.value !== value) return null;
    return <div className={className}>{children}</div>;
}
