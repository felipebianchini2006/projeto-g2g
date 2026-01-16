import React, { useMemo } from 'react';
import { Textarea } from '../ui/textarea';
import { AlertTriangle, Info } from 'lucide-react';

interface ListingDescriptionFieldProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
}

const CONTACT_KEYWORDS = [
    'whatsapp',
    'discord',
    'facebook',
    'instagram',
    'email',
    'gmail',
    'contato',
    'telefone',
    'zap',
    'telegram'
];

export function ListingDescriptionField({
    value,
    onChange,
    className = '',
}: ListingDescriptionFieldProps) {

    const hasContactInfo = useMemo(() => {
        const lowerValue = value.toLowerCase();
        return CONTACT_KEYWORDS.some(keyword => lowerValue.includes(keyword));
    }, [value]);

    return (
        <div className={`rounded-[24px] border border-slate-100 bg-white p-6 shadow-sm md:p-8 ${className}`}>
            <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
                    <Info size={20} />
                </div>
                <h2 className="text-lg font-bold text-slate-800">Descrição</h2>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">Descreva o seu anúncio</label>
                    <Textarea
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="Ex: Conta nível max com X skins, acesso total, sem banimentos..."
                        className={`min-h-[160px] resize-y rounded-2xl p-4 font-medium text-slate-700 transition-all ${hasContactInfo
                                ? 'border-amber-300 focus:border-amber-400 focus:ring-amber-100'
                                : 'border-slate-200 bg-slate-50 focus:border-meow-300 focus:ring-meow-red/10'
                            }`}
                    />
                </div>

                {/* Warning Box */}
                <div className={`rounded-xl border p-4 text-xs leading-relaxed transition-colors ${hasContactInfo
                        ? 'border-red-200 bg-red-50 text-red-700'
                        : 'border-amber-100 bg-amber-50 text-amber-800'
                    }`}>
                    <div className="flex gap-3">
                        <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                        <div>
                            {hasContactInfo ? (
                                <p className="font-bold">
                                    Detectamos possíveis dados de contato. Lembre-se que informar contatos pessoais é proibido e pode bloquear seu anúncio.
                                </p>
                            ) : (
                                <>
                                    <p className="mb-1 text-amber-600">
                                        Adicionar contatos pessoais como <span className="font-bold">WhatsApp, Discord, Facebook</span>, ou qualquer outro meio de comunicação fará com que o seu anúncio seja <span className="font-bold underline">reprovado</span>.
                                    </p>
                                    <p className="opacity-80">
                                        Utilize o chat da plataforma após a venda para se comunicar com o comprador.
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
