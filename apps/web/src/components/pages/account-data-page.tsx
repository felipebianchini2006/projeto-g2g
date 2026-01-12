'use client';

import Link from 'next/link';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Info,
  MapPin,
  Search,
  UserRound,
} from 'lucide-react';
import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';

import { usersApi, type UserProfile } from '../../lib/users-api';
import { useAuth } from '../auth/auth-provider';
import { AccountShell } from '../account/account-shell';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';

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

type InputWithIconProps = React.InputHTMLAttributes<HTMLInputElement> & {
  icon: React.ReactNode;
};

type SectionTitleProps = {
  icon: React.ReactNode;
  label: string;
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
  addressCountry: 'Brasil',
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
  addressCountry: profile.addressCountry ?? 'Brasil',
});

const InputWithIcon = ({ icon, className, ...props }: InputWithIconProps) => (
  <div className="relative">
    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
      {icon}
    </span>
    <Input className={`pl-10 ${className ?? ''}`} {...props} />
  </div>
);

const SectionTitle = ({ icon, label }: SectionTitleProps) => (
  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.4px] text-rose-500">
    <span className="grid h-7 w-7 place-items-center rounded-full bg-rose-50 text-rose-500">
      {icon}
    </span>
    {label}
  </div>
);

const stripDigits = (value: string) => value.replace(/\D/g, '');

export const AccountDataContent = () => {
  const { user, loading, accessToken } = useAuth();
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [noNumber, setNoNumber] = useState(false);
  const [cepBusy, setCepBusy] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);

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
        const normalizedNumber = profile.addressNumber?.toLowerCase() ?? '';
        setNoNumber(normalizedNumber === 's/n' || normalizedNumber === 'sem numero');
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

  const handleNoNumber = (checked: boolean) => {
    setNoNumber(checked);
    setForm((prev) => ({
      ...prev,
      addressNumber: checked ? 'S/N' : '',
    }));
  };

  const handleCepLookup = async () => {
    const zip = stripDigits(form.addressZip);
    if (!zip) {
      setCepError('Informe um CEP valido.');
      return;
    }
    setCepBusy(true);
    setCepError(null);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${zip}/json/`);
      const payload = await response.json();
      if (!response.ok || payload?.erro) {
        setCepError('Nao foi possivel localizar esse CEP.');
        return;
      }
      setForm((prev) => ({
        ...prev,
        addressStreet: payload.logradouro ?? prev.addressStreet,
        addressDistrict: payload.bairro ?? prev.addressDistrict,
        addressCity: payload.localidade ?? prev.addressCity,
        addressState: payload.uf ?? prev.addressState,
      }));
    } catch {
      setCepError('Nao foi possivel buscar o CEP agora.');
    } finally {
      setCepBusy(false);
    }
  };

  const isProfileComplete = useMemo(() => {
    const cpfDigits = stripDigits(form.cpf);
    const birthOk = Boolean(form.birthDate.trim());
    const numberOk = noNumber || Boolean(form.addressNumber.trim());
    return (
      Boolean(form.fullName.trim()) &&
      cpfDigits.length === 11 &&
      birthOk &&
      Boolean(form.addressZip.trim()) &&
      Boolean(form.addressStreet.trim()) &&
      numberOk &&
      Boolean(form.addressDistrict.trim()) &&
      Boolean(form.addressCity.trim()) &&
      Boolean(form.addressState.trim()) &&
      Boolean(form.addressCountry.trim())
    );
  }, [form, noNumber]);

  return (
    <AccountShell
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Conta', href: '/conta' },
        { label: 'Meus dados' },
      ]}
    >
      <form
        className="relative rounded-[28px] border border-slate-100 bg-white pb-28 shadow-card"
        onSubmit={handleSubmit}
      >
        <div className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-black text-meow-charcoal">Dados Pessoais</h1>
              <p className="mt-2 text-sm text-meow-muted">
                Complete suas informações para agilizar suas compras e vendas com segurança.
              </p>
            </div>
            <Badge
              variant={isProfileComplete ? 'success' : 'danger'}
              className="rounded-full border border-current bg-transparent px-3 py-1 text-[11px]"
            >
              {isProfileComplete ? 'Perfil Verificado' : 'Perfil Não Verificado'}
            </Badge>
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

          <div className="mt-6 space-y-6">
            <div>
              <SectionTitle icon={<UserRound size={14} aria-hidden />} label="Identificação" />
              <div className="mt-4 grid gap-4">
                <label className="grid gap-1 text-xs font-semibold uppercase text-meow-muted">
                  Nome completo
                  <InputWithIcon
                    icon={<UserRound size={16} aria-hidden />}
                    placeholder="Digite seu nome completo"
                    value={form.fullName}
                    onChange={handleChange('fullName')}
                    disabled={status === 'saving'}
                  />
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-1 text-xs font-semibold uppercase text-meow-muted">
                    CPF
                    <InputWithIcon
                      icon={<UserRound size={16} aria-hidden />}
                      placeholder="000.000.000-00"
                      value={form.cpf}
                      onChange={handleChange('cpf')}
                      disabled={status === 'saving'}
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-semibold uppercase text-meow-muted">
                    Nascimento
                    <InputWithIcon
                      icon={<Calendar size={16} aria-hidden />}
                      placeholder="00/00/0000"
                      value={form.birthDate}
                      onChange={handleChange('birthDate')}
                      disabled={status === 'saving'}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <SectionTitle icon={<MapPin size={14} aria-hidden />} label="Endereço" />

              <div className="mt-4 grid gap-4 md:grid-cols-[1fr_2fr]">
                <label className="grid gap-1 text-xs font-semibold uppercase text-meow-muted">
                  CEP
                  <div className="relative">
                    <Input
                      placeholder="00000-000"
                      value={form.addressZip}
                      onChange={handleChange('addressZip')}
                      disabled={status === 'saving'}
                      className="pr-12"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-2 flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-rose-500"
                      onClick={handleCepLookup}
                      disabled={cepBusy || status === 'saving'}
                      aria-label="Buscar CEP"
                    >
                      <Search size={16} aria-hidden />
                    </button>
                  </div>
                  {cepError ? (
                    <span className="text-xs font-semibold text-red-500">{cepError}</span>
                  ) : null}
                </label>
                <div className="flex items-center gap-2 text-xs text-meow-muted">
                  <Info size={14} aria-hidden />
                  Digite o CEP para preencher automaticamente.
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-[2fr_1fr]">
                <label className="grid gap-1 text-xs font-semibold uppercase text-meow-muted">
                  Endereço
                  <Input
                    placeholder="Rua, Avenida, Travessa..."
                    value={form.addressStreet}
                    onChange={handleChange('addressStreet')}
                    disabled={status === 'saving'}
                  />
                </label>
                <div className="grid gap-2">
                  <label className="grid gap-1 text-xs font-semibold uppercase text-meow-muted">
                    Número
                    <Input
                      placeholder="123"
                      value={form.addressNumber}
                      onChange={handleChange('addressNumber')}
                      disabled={status === 'saving' || noNumber}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-meow-muted">
                    <input
                      type="checkbox"
                      checked={noNumber}
                      onChange={(event) => handleNoNumber(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-meow-deep focus:ring-meow-200"
                      disabled={status === 'saving'}
                    />
                    Sem número
                  </label>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="grid gap-1 text-xs font-semibold uppercase text-meow-muted">
                  <span className="flex items-center gap-2">
                    Complemento
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                      Optional
                    </span>
                  </span>
                  <Input
                    placeholder="Apto 101, Bloco B"
                    value={form.addressComplement}
                    onChange={handleChange('addressComplement')}
                    disabled={status === 'saving'}
                  />
                </label>
                <label className="grid gap-1 text-xs font-semibold uppercase text-meow-muted">
                  Bairro
                  <Input
                    placeholder="Seu bairro"
                    value={form.addressDistrict}
                    onChange={handleChange('addressDistrict')}
                    disabled={status === 'saving'}
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-[1.2fr_0.8fr_1fr]">
                <label className="grid gap-1 text-xs font-semibold uppercase text-meow-muted">
                  Cidade
                  <Input
                    placeholder="Sua cidade"
                    value={form.addressCity}
                    onChange={handleChange('addressCity')}
                    disabled={status === 'saving'}
                  />
                </label>
                <label className="grid gap-1 text-xs font-semibold uppercase text-meow-muted">
                  Estado
                  <Select
                    value={form.addressState}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, addressState: event.target.value }))
                    }
                    disabled={status === 'saving'}
                  >
                    <option value="">UF</option>
                    <option value="AC">AC</option>
                    <option value="AL">AL</option>
                    <option value="AP">AP</option>
                    <option value="AM">AM</option>
                    <option value="BA">BA</option>
                    <option value="CE">CE</option>
                    <option value="DF">DF</option>
                    <option value="ES">ES</option>
                    <option value="GO">GO</option>
                    <option value="MA">MA</option>
                    <option value="MT">MT</option>
                    <option value="MS">MS</option>
                    <option value="MG">MG</option>
                    <option value="PA">PA</option>
                    <option value="PB">PB</option>
                    <option value="PR">PR</option>
                    <option value="PE">PE</option>
                    <option value="PI">PI</option>
                    <option value="RJ">RJ</option>
                    <option value="RN">RN</option>
                    <option value="RS">RS</option>
                    <option value="RO">RO</option>
                    <option value="RR">RR</option>
                    <option value="SC">SC</option>
                    <option value="SP">SP</option>
                    <option value="SE">SE</option>
                    <option value="TO">TO</option>
                  </Select>
                </label>
                <label className="grid gap-1 text-xs font-semibold uppercase text-meow-muted">
                  País
                  <Select
                    value={form.addressCountry}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, addressCountry: event.target.value }))
                    }
                    disabled={status === 'saving'}
                  >
                    <option value="Brasil">🇧🇷 Brasil</option>
                  </Select>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white/90 px-6 py-4 backdrop-blur">
          {!isProfileComplete ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
              <AlertTriangle size={14} aria-hidden />
              Seu cadastro está incompleto.
            </span>
          ) : null}
          <div className="flex items-center gap-2">
            <Link href="/conta" className="text-xs font-semibold text-meow-muted hover:text-meow-deep">
              Cancelar
            </Link>
            <Button type="submit" size="lg" disabled={status === 'saving'}>
              <CheckCircle2 size={16} aria-hidden />
              {status === 'saving' ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </div>
      </form>
    </AccountShell>
  );
};
