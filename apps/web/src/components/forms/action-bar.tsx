import React from 'react';
import { Button } from '../ui/button';
import { Loader2, ArrowRight, ArrowLeft } from 'lucide-react';

interface ActionBarProps {
    onBack?: () => void;
    onNext: () => void;
    nextLabel?: string;
    nextDisabled?: boolean;
    loading?: boolean;
    leftContent?: React.ReactNode;
    className?: string;
}

export function ActionBar({
    onBack,
    onNext,
    nextLabel = 'Continuar',
    nextDisabled = false,
    loading = false,
    leftContent,
    className = '',
}: ActionBarProps) {
    return (
        <div className={`fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/90 p-4 backdrop-blur-lg transition-all animate-in slide-in-from-bottom-4 duration-500 md:px-8 ${className}`}>
            <div className="mx-auto flex max-w-[1000px] items-center justify-between gap-4">

                {/* Left Content (e.g. Total Price) */}
                <div className="flex-1 md:flex-none">
                    {leftContent}
                </div>

                {/* Actions */}
                <div className="flex flex-1 items-center justify-end gap-3 md:flex-none">
                    {onBack && (
                        <Button
                            variant="ghost"
                            onClick={onBack}
                            disabled={loading}
                            className="hidden font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800 sm:inline-flex"
                        >
                            <ArrowLeft size={16} className="mr-2" />
                            Voltar
                        </Button>
                    )}

                    <Button
                        size="lg"
                        onClick={onNext}
                        disabled={nextDisabled || loading}
                        className="w-full min-w-[160px] rounded-xl bg-meow-deep font-bold text-white shadow-lg shadow-meow-deep/20 transition-all hover:scale-105 hover:bg-meow-deep/90 disabled:opacity-70 md:w-auto"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={18} className="mr-2 animate-spin" />
                                Processando...
                            </>
                        ) : (
                            <>
                                {nextLabel}
                                <ArrowRight size={18} className="ml-2 opacity-80" />
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
