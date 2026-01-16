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
        <div className={`rounded-[24px] border border-slate-100 bg-white p-6 shadow-sm md:p-8 ${className}`}>
            <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-meow-50 text-meow-600">
                    <Trophy size={20} />
                </div>
                <h2 className="text-lg font-bold text-slate-800">Tipo do anúncio</h2>
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
                                ? 'border-2 border-meow-500 bg-meow-50/50 shadow-md ring-4 ring-meow-500/10'
                                : 'border border-slate-100 bg-white hover:border-slate-300 hover:shadow-sm'
                                }`}
                        >
                            <div className="mb-4 flex items-center justify-between">
                                <span className={`text-xl font-bold ${isSelected ? 'text-meow-600' : 'text-slate-700'}`}>
                                    {tier.name}
                                </span>
                                {isSelected && (
                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-meow-500 text-white shadow-sm">
                                        <Check size={14} strokeWidth={3} />
                                    </div>
                                )}
                            </div>

                            <div className="mb-6 flex-1 space-y-3">
                                {tier.benefits.map((benefit, idx) => (
                                    <div key={idx} className="flex items-start gap-2 text-xs font-medium text-slate-600">
                                        <Check
                                            size={14}
                                            className={`mt-0.5 shrink-0 ${isSelected ? 'text-meow-500' : 'text-slate-400'}`}
                                            strokeWidth={2.5}
                                        />
                                        <span>{benefit}</span>
                                    </div>
                                ))}
                            </div>

                            <div className={`mt-auto border-t pt-4 ${isSelected ? 'border-meow-200/50' : 'border-slate-100'}`}>
                                <p className={`text-xs font-bold ${isSelected ? 'text-meow-600' : 'text-slate-500'}`}>
                                    {tier.rate}
                                </p>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
