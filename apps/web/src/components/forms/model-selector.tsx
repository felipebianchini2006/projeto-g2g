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
        <div className={`rounded-[24px] border border-slate-100 bg-white p-6 shadow-sm md:p-8 ${className}`}>
            <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-800">Modelo do anúncio</h2>
                {/* Adicional: Link de ajuda poderia ser injetado via props se necessário */}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                {options.map((option) => {
                    const isSelected = selected === option.id;
                    const Icon = option.icon;

                    return (
                        <button
                            key={option.id}
                            type="button"
                            onClick={() => onChange(option.id)}
                            className={`group relative flex h-full flex-col items-start rounded-lg p-6 text-left transition-all duration-200 ${isSelected
                                ? 'border-2 border-meow-500 bg-white shadow-sm ring-0'
                                : 'border-2 border-dashed border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-100'
                                }`}
                        >
                            <h3 className={`mb-3 text-xl font-medium ${isSelected ? 'text-meow-500' : 'text-slate-900'}`}>
                                {option.name}
                            </h3>

                            <p className="text-sm leading-relaxed text-slate-500">
                                {option.description}
                            </p>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
