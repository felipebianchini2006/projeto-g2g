import { useMemo } from 'react';

type ChatBubbleProps = {
    text: string;
    isOwn: boolean;
    senderInitials: string;
    timestamp: string | Date;
    status?: string | null;
    isDeleted?: boolean;
    className?: string;
};

const formatTime = (value: string | Date) => {
    const date = value instanceof Date ? value : new Date(value);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

export const ChatBubble = ({
    text,
    isOwn,
    senderInitials,
    timestamp,
    status,
    isDeleted = false,
    className = '',
}: ChatBubbleProps) => {
    return (
        <div
            className={`flex w-full flex-col ${isOwn ? 'items-end' : 'items-start'} ${className}`}
        >
            <div className={`flex items-center gap-2 max-w-[85%]`}>
                {!isOwn ? (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
                        {(senderInitials).slice(0, 2).toUpperCase()}
                    </div>
                ) : null}

                <div
                    className={`rounded-2xl px-4 py-2 text-sm shadow-sm ${isDeleted
                        ? 'bg-slate-100 text-slate-400'
                        : isOwn
                            ? 'bg-meow-linear text-white'
                            : 'bg-white text-meow-charcoal'
                        }`}
                >
                    <p className="whitespace-pre-wrap break-words">{isDeleted ? 'Mensagem apagada' : text}</p>
                </div>

                {isOwn ? (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                        EU
                    </div>
                ) : null}
            </div>

            <div
                className={`mt-1 flex items-center gap-2 text-[10px] ${isOwn ? 'mr-10 flex-row-reverse text-pink-400' : 'ml-10 text-slate-400'
                    }`}
            >
                <span>{formatTime(timestamp)}</span>
                {status ? <span>{status}</span> : null}
            </div>
        </div>
    );
};
