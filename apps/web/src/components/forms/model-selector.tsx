import React from 'react';

export interface ModelOption {
    id: string;
    name: string;
    description: string;
    icon: React.ElementType;
}

interface ModelSelectorProps {
    options: ModelOption[];
    selected: string;
    onChange: (id: string) => void;
    className?: string;
}

export function ModelSelector({
    options,
    selected,
    onChange,
    className = '',
}: ModelSelectorProps) {
    return (
        <div className={className}>
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Modelo de Venda</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                {options.map((option) => {
                    const isSelected = selected === option.id;
                    return (
                        <button
                            key={option.id}
                            type="button"
                            onClick={() => onChange(option.id)}
                            className={`group relative flex h-full flex-col items-center justify-center rounded-2xl p-4 text-center transition-all duration-200 ${isSelected
                                ? 'border-2 border-meow-500 bg-meow-50/50 ring-0'
                                : 'border border-slate-200 bg-white hover:border-meow-200 hover:bg-slate-50'
                                }`}
                        >
                            <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full transition-colors ${isSelected ? 'bg-meow-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-meow-100 group-hover:text-meow-500'}`}>
                                <option.icon size={24} />
                            </div>

                            <h3 className={`mb-1 text-sm font-bold ${isSelected ? 'text-meow-700' : 'text-slate-700'}`}>
                                {option.name}
                            </h3>

                            <p className="text-[10px] leading-tight text-slate-500">
                                {option.description}
                            </p>

                            {isSelected && (
                                <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-meow-500" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
