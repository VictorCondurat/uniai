'use client';

import { FC } from 'react';
import { BrainCircuit, Bot } from 'lucide-react';


const providerIcons: Record<string, React.ElementType> = {
    openai: BrainCircuit,
    google: Bot,
    anthropic: Bot,
};

interface ProviderIconProps {
    provider: string;
    className?: string;
}

export const ProviderIcon: FC<ProviderIconProps> = ({ provider, className }) => {
    const Icon = providerIcons[provider] || Bot;
    return <Icon className={className || "w-4 h-4"} />;
};