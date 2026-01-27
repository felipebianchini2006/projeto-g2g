import React from 'react';
import { Input } from '../ui/input';

interface FormTitleSectionProps {
    value: string;
    onChange: (value: string) => void;
    maxLength?: number;
}

export function FormTitleSection({
    value,
    onChange,
    maxLength = 80,
}: FormTitleSectionProps) {
    const sanitizeTitle = (input: string) =>
        input.replace(/[^0-9A-Za-zÀ-ÖØ-öø-ÿ ]+/g, '');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(sanitizeTitle(e.target.value));
    };

    const isNearLimit = value.length >= maxLength * 0.9;
    const isAtLimit = value.length >= maxLength;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <label className="text-lg font-bold text-slate-800">
                    Escolha um título para o seu anúncio
                </label>
                <span
                    className={`text-xs font-bold transition-colors ${isAtLimit
                        ? 'text-red-500'
                        : isNearLimit
                            ? 'text-amber-500'
                            : 'text-slate-400'
                        }`}
                >
                    {value.length} / {maxLength}
                </span>
            </div>

            <div className="relative">
                <Input
                    value={value}
                    onChange={handleChange}
                    maxLength={maxLength}
                    placeholder="Ex: CONTA COM VBUCKS + BARATO ATUALMENTE!"
                    className="h-14 rounded-2xl border-slate-200 bg-slate-50 text-lg font-bold text-slate-800 placeholder:font-medium placeholder:text-slate-300 focus:border-meow-300 focus:ring-4 focus:ring-meow-red/10 transition-all"
                />
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
                Exemplos: Conta LoL diamante full champs, 250 Tibia Coins, Curso de Inglês Avançado,
                Conta CV nivel 13, Acesso Spotify Premium
            </p>
        </div>
    );
}
