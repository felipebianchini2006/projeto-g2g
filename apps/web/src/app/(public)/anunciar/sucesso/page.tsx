'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, ArrowRight, Package } from 'lucide-react';
import { Button } from '../../../../components/ui/button'; // Adjust path if needed

export default function ListingSuccessPage() {
    const searchParams = useSearchParams();
    const listingId = searchParams.get('id');

    return (
        <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 py-12 text-center animate-in fade-in duration-700">
            <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-500 shadow-sm ring-8 ring-emerald-50/50">
                <CheckCircle2 size={48} strokeWidth={3} />
            </div>

            <h1 className="mb-4 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
                Anúncio Publicado!
            </h1>
            <p className="mb-10 max-w-md text-lg font-medium text-slate-500">
                Seu anúncio já está no ar e pronto para receber ofertas. Boa sorte com as vendas!
            </p>

            <div className="flex flex-col gap-4 sm:flex-row">
                <Link href="/conta/anuncios">
                    <Button variant="outline" size="lg" className="w-full min-w-[200px] rounded-xl font-bold text-slate-600 hover:bg-slate-50 sm:w-auto">
                        <Package size={18} className="mr-2" />
                        Gerenciar Anúncios
                    </Button>
                </Link>

                {listingId && (
                    <Link href={`/anuncio/${listingId}`}>
                        <Button size="lg" className="w-full min-w-[200px] rounded-xl bg-meow-deep font-bold text-white shadow-lg shadow-meow-deep/20 transition-all hover:scale-105 hover:bg-meow-deep/90 sm:w-auto">
                            Visualizar Anúncio
                            <ArrowRight size={18} className="ml-2 opacity-80" />
                        </Button>
                    </Link>
                )}
            </div>
        </div>
    );
}
