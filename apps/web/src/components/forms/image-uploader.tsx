'use client';

import React, { useRef, useState, useEffect } from 'react';
import { UploadCloud, X, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button'; // Assuming button exists

interface ImageUploaderProps {
    files: File[];
    onFilesChange: (files: File[]) => void;
    maxFiles?: number;
    maxSizeMb?: number;
    accept?: string;
    className?: string;
}

export function ImageUploader({
    files,
    onFilesChange,
    maxFiles = 5,
    maxSizeMb = 5,
    accept = 'image/png, image/jpeg, image/jpg',
    className = '',
}: ImageUploaderProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [previews, setPreviews] = useState<string[]>([]);

    // Cleanup previews to avoid memory leaks
    useEffect(() => {
        const objectUrls = files.map((file) => URL.createObjectURL(file));
        setPreviews(objectUrls);
        return () => {
            objectUrls.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [files]);

    const handleFileValidation = (newFiles: File[]) => {
        // Reset error
        setError(null);

        const validFiles: File[] = [];
        let hasError = false;

        if (files.length + newFiles.length > maxFiles) {
            setError(`O limite é de ${maxFiles} imagens.`);
            return;
        }

        for (const file of newFiles) {
            // Validate Type
            const typeValid = accept.split(',').some((type) => {
                const trimType = type.trim();
                if (trimType.endsWith('/*')) {
                    return file.type.startsWith(trimType.replace('/*', ''));
                }
                return file.type === trimType;
            });

            // Validate Size
            const sizeValid = file.size <= maxSizeMb * 1024 * 1024;

            if (!typeValid) {
                setError('Tipo de arquivo não suportado. Use JPG ou PNG.');
                hasError = true;
                break;
            }

            if (!sizeValid) {
                setError(`O arquivo ${file.name} excede o tamanho de ${maxSizeMb}MB.`);
                hasError = true;
                break;
            }

            validFiles.push(file);
        }

        if (!hasError && validFiles.length > 0) {
            onFilesChange([...files, ...validFiles]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFileValidation(Array.from(e.target.files));
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileValidation(Array.from(e.dataTransfer.files));
        }
    };

    const handleRemove = (index: number) => {
        const newFiles = [...files];
        newFiles.splice(index, 1);
        onFilesChange(newFiles);
    };

    const triggerInput = () => {
        inputRef.current?.click();
    };

    const hasFiles = files.length > 0;

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Container Principal */}
            <div className="rounded-[24px] border border-slate-100 bg-white p-6 shadow-sm md:p-8">
                <div className="mb-6">
                    <h2 className="text-xl font-bold text-slate-800">Imagens</h2>
                    <p className="text-sm text-slate-500">
                        Adicione fotos do seu produto (Capa + Galeria)
                    </p>
                </div>

                {hasFiles ? (
                    // Preview State (Baseado na imagem "Capa" mas adaptado para galeria)
                    <div className="space-y-4">
                        {/* Main Preview / Cover */}
                        <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                            <img
                                src={previews[0]}
                                alt="Capa"
                                className="h-full w-full object-cover"
                            />
                            <button
                                onClick={triggerInput}
                                type="button"
                                className="absolute bottom-4 right-4 z-10 rounded-full bg-white/90 px-4 py-2 text-xs font-bold text-slate-700 shadow-md backdrop-blur-sm transition hover:bg-white"
                            >
                                Escolher outra imagem
                            </button>
                        </div>

                        {/* Grid (se houver mais de 1) */}
                        {files.length > 0 && (
                            <div className="flex gap-4 overflow-x-auto pb-2">
                                {previews.map((src, idx) => (
                                    <div key={idx} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200">
                                        <img src={src} className="h-full w-full object-cover" alt={`preview-${idx}`} />
                                        <button
                                            onClick={() => handleRemove(idx)}
                                            type="button"
                                            className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                                {/* Add More Button Small */}
                                {files.length < maxFiles && (
                                    <button
                                        type="button"
                                        onClick={triggerInput}
                                        className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400 hover:border-meow-400 hover:text-meow-500"
                                    >
                                        <UploadCloud size={20} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    // Empty State / Dropzone (Baseado na imagem "Imagens")
                    <div
                        className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed py-12 text-center transition-all ${dragActive
                                ? 'border-meow-500 bg-meow-50/50 scale-[0.99]'
                                : error
                                    ? 'border-red-300 bg-red-50/30'
                                    : 'border-slate-200 bg-slate-50/50 hover:border-meow-400 hover:bg-meow-50/30'
                            }`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={triggerInput}
                    >
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-meow-400 shadow-sm transition group-hover:scale-110 group-hover:text-meow-500">
                            <UploadCloud size={32} />
                        </div>
                        <h4 className="text-lg font-bold text-slate-700">
                            Arraste ou clique aqui para carregar
                        </h4>
                        <p className="mt-1 max-w-xs text-xs text-slate-400">
                            {accept.replace(/image\//g, '').toUpperCase().replace(/,/g, ', ')}. Max {maxSizeMb}MB.
                        </p>
                    </div>
                )}

                {error && (
                    <div className="mt-4 flex items-center gap-2 text-sm font-medium text-red-500 animate-in slide-in-from-top-1">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    className="hidden"
                    accept={accept}
                    onChange={handleChange}
                />

                <p className="mt-4 text-[10px] text-slate-400">
                    <strong className="text-slate-500">Obs:</strong> Para sua segurança, recomendamos não mostrar o nome da conta,
                    nome do personagem, ou qualquer informação que identifique seu produto nas imagens.
                </p>
            </div>
        </div>
    );
}
