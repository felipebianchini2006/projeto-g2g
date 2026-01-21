import React from 'react';
import { Check, Trophy } from 'lucide-react';

export interface Tier {
    id: string;
    name: string;
    benefits: string[];
    rate: string;
    recommended?: boolean;
}

interface AdTierSelectorProps {
    tiers: Tier[];
    selected: string;
    onChange: (id: string) => void;
    className?: string;
}

export function AdTierSelector({
    tiers,
    selected,
    onChange,
    className = '',
}: AdTierSelectorProps) {
    return (
        <div className={`rounded-2xl border border-slate-100 bg-white p-6 shadow-sm ${className}`}>
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Destaque do Anúncio</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                {tiers.map((tier) => {
                    const isSelected = selected === tier.id;

                    return (
                        <button
                            key={tier.id}
                            type="button"
                            onClick={() => onChange(tier.id)}
                            className={`relative flex flex-col rounded-2xl border p-6 text-left transition-all duration-200 ${isSelected
                                ? 'border-2 border-meow-500 bg-meow-50/50 shadow-md ring-0'
                                : 'border border-slate-200 bg-slate-50 hover:border-slate-300 hover:shadow-sm'
                                }`}
                        >
                            <div className="flex h-full flex-col p-4">
                                <div className="mb-4 flex items-center justify-between">
                                    <span className={`text-lg font-bold ${isSelected ? 'text-meow-600' : 'text-slate-700'}`}>
                                        {tier.name}
                                    </span>
                                    {isSelected && (
                                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-meow-500 text-white shadow-sm">
                                            <Check size={12} strokeWidth={3} />
                                        </div>
                                    )}
                                </div>

                                <div className="mb-4 flex-1 space-y-2">
                                    {tier.benefits.map((benefit, idx) => (
                                        <div key={idx} className="flex items-start gap-2 text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                                            <Check
                                                size={14}
                                                className={`mt-0 shrink-0 ${isSelected ? 'text-meow-500' : 'text-slate-400'}`}
                                                strokeWidth={2.5}
                                            />
                                            <span>{benefit}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className={`mt-auto border-t pt-3 ${isSelected ? 'border-meow-200/50' : 'border-slate-200'}`}>
                                    <p className={`text-xs font-bold ${isSelected ? 'text-meow-600' : 'text-slate-500'}`}>
                                        {tier.rate}
                                    </p>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
