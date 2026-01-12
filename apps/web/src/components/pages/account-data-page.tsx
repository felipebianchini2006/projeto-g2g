'use client';

import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useState } from 'react';

import { usersApi, type UserProfile } from '../../lib/users-api';
import { useAuth } from '../auth/auth-provider';
import { AccountShell } from '../account/account-shell';

type ProfileForm = {
  fullName: string;
  cpf: string;
  birthDate: string;
  addressZip: string;
  addressStreet: string;
  addressNumber: string;
  addressComplement: string;
  addressDistrict: string;
  addressCity: string;
  addressState: string;
  addressCountry: string;
};

const emptyForm: ProfileForm = {
  fullName: '',
  cpf: '',
  birthDate: '',
  addressZip: '',
  addressStreet: '',
  addressNumber: '',
  addressComplement: '',
  addressDistrict: '',
  addressCity: '',
  addressState: '',
  addressCountry: '',
};

const mapProfileToForm = (profile: UserProfile): ProfileForm => ({
  fullName: profile.fullName ?? '',
  cpf: profile.cpf ?? '',
  birthDate: profile.birthDate ?? '',
  addressZip: profile.addressZip ?? '',
  addressStreet: profile.addressStreet ?? '',
  addressNumber: profile.addressNumber ?? '',
  addressComplement: profile.addressComplement ?? '',
  addressDistrict: profile.addressDistrict ?? '',
  addressCity: profile.addressCity ?? '',
  addressState: profile.addressState ?? '',
  addressCountry: profile.addressCountry ?? '',
});

export const AccountDataContent = () => {
  const { user, loading, accessToken } = useAuth();
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isVerified = user?.role === 'SELLER' || user?.role === 'ADMIN';

  if (loading) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-4 text-sm text-meow-muted">
          Carregando sessao...
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-6 text-center">
          <p className="text-sm text-meow-muted">Entre para acessar seus dados.</p>
          <Link
            href="/login"
            className="mt-4 inline-flex rounded-full bg-meow-linear px-6 py-2 text-sm font-bold text-white"
          >
            Fazer login
          </Link>
        </div>
      </section>
    );
  }

  useEffect(() => {
    if (!user || !accessToken) {
      return;
    }
    let active = true;
    setStatus('loading');
    setError(null);
    usersApi
      .getProfile(accessToken)
      .then((profile) => {
        if (!active) {
          return;
        }
        setForm(mapProfileToForm(profile));
      })
      .catch((err) => {
        if (!active) {
          return;
        }
        setError(err instanceof Error ? err.message : 'Nao foi possivel carregar seus dados.');
      })
      .finally(() => {
        if (active) {
          setStatus('idle');
        }
      });
    return () => {
      active = false;
    };
  }, [accessToken, user]);

  const handleChange =
    (field: keyof ProfileForm) => (event: ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) {
      setError('Sessao expirada. Entre novamente.');
      return;
    }
    setStatus('saving');
    setError(null);
    setSuccess(null);
    try {
      const updated = await usersApi.updateProfile(accessToken, {
        fullName: form.fullName,
        cpf: form.cpf,
        birthDate: form.birthDate,
        addressZip: form.addressZip,
        addressStreet: form.addressStreet,
        addressNumber: form.addressNumber,
        addressComplement: form.addressComplement,
        addressDistrict: form.addressDistrict,
        addressCity: form.addressCity,
        addressState: form.addressState,
        addressCountry: form.addressCountry,
      });
      setForm(mapProfileToForm(updated));
      setSuccess('Dados atualizados com sucesso.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel salvar.');
    } finally {
      setStatus('idle');
    }
  };

  return (
    <AccountShell
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Conta', href: '/conta' },
        { label: 'Meus dados' },
      ]}
    >
      <form
        className="rounded-2xl border border-meow-red/20 bg-white p-6 shadow-[0_10px_24px_rgba(216,107,149,0.12)]"
        onSubmit={handleSubmit}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-meow-charcoal">Dados pessoais</h1>
            <p className="mt-2 text-sm text-meow-muted">
              Complete suas informacoes para agilizar compras e vendas.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-meow-cream px-3 py-1 text-xs font-semibold text-meow-charcoal">
            {isVerified ? (
              <>
                <CheckCircle size={14} className="text-sky-500" />
                Verificado
              </>
            ) : (
              'Nao verificado'
            )}
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-[2fr_1fr_1fr]">
          <label className="grid gap-1 text-xs font-semibold text-meow-muted">
            Nome completo
            <input
              className="rounded-xl border border-meow-red/20 bg-white px-3 py-2 text-sm text-meow-charcoal"
              placeholder="Digite seu nome completo"
              value={form.fullName}
              onChange={handleChange('fullName')}
              disabled={status === 'saving'}
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-meow-muted">
            CPF
            <input
              className="rounded-xl border border-meow-red/20 bg-white px-3 py-2 text-sm text-meow-charcoal"
              placeholder="000.000.000-00"
              value={form.cpf}
              onChange={handleChange('cpf')}
              disabled={status === 'saving'}
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-meow-muted">
            Nascimento
            <input
              className="rounded-xl border border-meow-red/20 bg-white px-3 py-2 text-sm text-meow-charcoal"
              placeholder="00/00/0000"
              value={form.birthDate}
              onChange={handleChange('birthDate')}
              disabled={status === 'saving'}
            />
          </label>
        </div>

        <div className="mt-8 border-t border-meow-red/10 pt-6">
          <h2 className="text-lg font-black text-meow-charcoal">Endereco</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="grid gap-1 text-xs font-semibold text-meow-muted">
              CEP
              <input
                className="rounded-xl border border-meow-red/20 bg-white px-3 py-2 text-sm text-meow-charcoal"
                placeholder="00000-000"
                value={form.addressZip}
                onChange={handleChange('addressZip')}
                disabled={status === 'saving'}
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-meow-muted md:col-span-2">
              Endereco
              <input
                className="rounded-xl border border-meow-red/20 bg-white px-3 py-2 text-sm text-meow-charcoal"
                placeholder="Rua, avenida, etc"
                value={form.addressStreet}
                onChange={handleChange('addressStreet')}
                disabled={status === 'saving'}
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-meow-muted">
              Numero
              <input
                className="rounded-xl border border-meow-red/20 bg-white px-3 py-2 text-sm text-meow-charcoal"
                placeholder="Sem numero"
                value={form.addressNumber}
                onChange={handleChange('addressNumber')}
                disabled={status === 'saving'}
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-meow-muted">
              Complemento
              <input
                className="rounded-xl border border-meow-red/20 bg-white px-3 py-2 text-sm text-meow-charcoal"
                placeholder="Opcional"
                value={form.addressComplement}
                onChange={handleChange('addressComplement')}
                disabled={status === 'saving'}
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-meow-muted">
              Bairro
              <input
                className="rounded-xl border border-meow-red/20 bg-white px-3 py-2 text-sm text-meow-charcoal"
                placeholder="Seu bairro"
                value={form.addressDistrict}
                onChange={handleChange('addressDistrict')}
                disabled={status === 'saving'}
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-meow-muted">
              Cidade
              <input
                className="rounded-xl border border-meow-red/20 bg-white px-3 py-2 text-sm text-meow-charcoal"
                placeholder="Sua cidade"
                value={form.addressCity}
                onChange={handleChange('addressCity')}
                disabled={status === 'saving'}
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-meow-muted">
              Estado
              <input
                className="rounded-xl border border-meow-red/20 bg-white px-3 py-2 text-sm text-meow-charcoal"
                placeholder="UF"
                value={form.addressState}
                onChange={handleChange('addressState')}
                disabled={status === 'saving'}
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-meow-muted">
              Pais
              <input
                className="rounded-xl border border-meow-red/20 bg-white px-3 py-2 text-sm text-meow-charcoal"
                placeholder="Brasil"
                value={form.addressCountry}
                onChange={handleChange('addressCountry')}
                disabled={status === 'saving'}
              />
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            className="rounded-full border border-meow-red/30 px-4 py-2 text-xs font-bold text-meow-deep"
            type="submit"
            disabled={status === 'saving' || status === 'loading'}
          >
            {status === 'saving' ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </AccountShell>
  );
};
