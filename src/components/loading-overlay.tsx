"use client";

import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
    message?: string;
}

export function LoadingOverlay({ message = "جاري التحميل..." }: LoadingOverlayProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-card shadow-2xl border animate-in fade-in zoom-in duration-300">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-lg font-medium text-foreground">{message}</p>
            </div>
        </div>
    );
}
