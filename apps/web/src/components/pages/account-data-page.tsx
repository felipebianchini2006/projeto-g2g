'use client';

import Link from 'next/link';
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  FileCheck,
  Info,
  MapPin,
  Search,
  Upload,
  UserRound,
  X,
  XCircle,
} from 'lucide-react';
import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';

import { usersApi, type UserProfile } from '../../lib/users-api';
import type { PixPayment } from '../../lib/payments-api';
import { rgApi, type RgStatusResponse, type RgStatus } from '../../lib/rg-api';
import { useAuth } from '../auth/auth-provider';
import { AccountShell } from '../account/account-shell';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Textarea } from '../ui/textarea';

type ProfileForm = {
  fullName: string;
  cpf: string;
  phone: string;
  birthDate: string;
  addressZip: string;
  addressStreet: string;
  addressNumber: string;
  addressComplement: string;
  addressDistrict: string;
  addressCity: string;
  addressState: string;
  addressCountry: string;
  bio: string;
  gameTags: string[];
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
  phone: '',
  birthDate: '',
  addressZip: '',
  addressStreet: '',
  addressNumber: '',
  addressComplement: '',
  addressDistrict: '',
  addressCity: '',
  addressState: '',
  addressCountry: 'Brasil',
  bio: '',
  gameTags: [],
};

const mapProfileToForm = (profile: UserProfile): ProfileForm => ({
  fullName: profile.fullName ?? '',
  cpf: profile.cpf ?? '',
  phone: profile.phoneE164 ?? '',
  birthDate: profile.birthDate ?? '',
  addressZip: profile.addressZip ?? '',
  addressStreet: profile.addressStreet ?? '',
  addressNumber: profile.addressNumber ?? '',
  addressComplement: profile.addressComplement ?? '',
  addressDistrict: profile.addressDistrict ?? '',
  addressCity: profile.addressCity ?? '',
  addressState: profile.addressState ?? '',
  addressCountry: profile.addressCountry ?? 'Brasil',
  bio: profile.bio ?? '',
  gameTags: profile.gameTags ?? [],
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
const clampDigits = (value: string, maxLength: number) =>
  stripDigits(value).slice(0, maxLength);

const formatCpf = (value: string) => {
  return stripDigits(value)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

const formatPhone = (value: string) => {
  const digits = stripDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const formatCep = (value: string) => {
  return stripDigits(value)
    .slice(0, 8)
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{3})\d+?$/, '$1');
};

const formatDate = (value: string) => {
  return stripDigits(value)
    .slice(0, 8)
    .replace(/(\d{2})(\d)/, '$1/$2')
    .replace(/(\d{2})(\d)/, '$1/$2')
    .replace(/(\/\d{4})\d+?$/, '$1');
};

const formatRg = (value: string) => {
  const digits = stripDigits(value).slice(0, 10);
  if (!digits) return '';
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}-${digits.slice(8)}`;
};

export const AccountDataContent = () => {
  const { user, loading, accessToken } = useAuth();
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [noNumber, setNoNumber] = useState(false);
  const [cepBusy, setCepBusy] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);

  // RG Verification state
  const [rgStatus, setRgStatus] = useState<RgStatusResponse | null>(null);
  const [rgLoading, setRgLoading] = useState(false);
  const [rgNumber, setRgNumber] = useState('');
  const [rgFile, setRgFile] = useState<File | null>(null);
  const [rgPreview, setRgPreview] = useState<string | null>(null);
  const [rgSubmitting, setRgSubmitting] = useState(false);
  const [rgError, setRgError] = useState<string | null>(null);
  const [rgSuccess, setRgSuccess] = useState<string | null>(null);
  const [gameTagsInput, setGameTagsInput] = useState('');

  const [verificationState, setVerificationState] = useState<{
    status: 'PAID' | 'PENDING' | 'NOT_PAID';
    paidAt?: string;
    payment?: PixPayment;
  } | null>(null);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationBusy, setVerificationBusy] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationCopied, setVerificationCopied] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  // Phone Verification
  const [phoneVerifyStep, setPhoneVerifyStep] = useState<'idle' | 'code'>('idle');
  const [phoneChallengeId, setPhoneChallengeId] = useState<string | null>(null);
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneVerifyLoading, setPhoneVerifyLoading] = useState(false);



  /* Removed early returns */

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
        const mapped = mapProfileToForm(profile);
        setForm(mapped);
        setGameTagsInput(mapped.gameTags.join(', '));
        setProfile(profile);
        const normalizedNumber = profile.addressNumber?.toLowerCase() ?? '';
        setNoNumber(normalizedNumber === 's/n' || normalizedNumber === 'sem numero');
      })
      .catch((err) => {
        if (!active) {
          return;
        }
        setProfile(null);
        setError(err instanceof Error ? err.message : 'Não foi possível carregar seus dados.');
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
  const handleDigitsChange =
    (field: keyof ProfileForm) => (event: ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: stripDigits(event.target.value) }));
    };

  const handleCpfChange = (event: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, cpf: formatCpf(event.target.value) }));
  };

  const handlePhoneChange = (event: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, phone: formatPhone(event.target.value) }));
  };

  const handleDateChange = (event: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, birthDate: formatDate(event.target.value) }));
  };

  const handleCepChange = (event: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, addressZip: formatCep(event.target.value) }));
  };

  const handleBioChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, bio: event.target.value }));
  };

  const normalizeGameTags = (value: string) => {
    const tags = value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    const seen = new Set<string>();
    const normalized: string[] = [];
    for (const tag of tags) {
      const key = tag.toLowerCase();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      normalized.push(tag);
    }
    return normalized.slice(0, 10);
  };

  const handleGameTagsChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setGameTagsInput(value);
    setForm((prev) => ({ ...prev, gameTags: normalizeGameTags(value) }));
  };

  const handleRemoveTag = (tag: string) => {
    setForm((prev) => {
      const nextTags = prev.gameTags.filter((item) => item !== tag);
      setGameTagsInput(nextTags.join(', '));
      return { ...prev, gameTags: nextTags };
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) {
      setError('Sessão expirada. Entre novamente.');
      return;
    }


    await doSubmit();
  };

  const doSubmit = async () => {
    if (!accessToken) return;
    setStatus('saving');
    setError(null);
    setSuccess(null);
    try {
      const basePayload = isProfileLocked
        ? {}
        : {
          fullName: form.fullName,
          cpf: stripDigits(form.cpf),
          phone: stripDigits(form.phone),
          birthDate: form.birthDate,
          addressZip: stripDigits(form.addressZip),
          addressStreet: form.addressStreet,
          addressNumber: form.addressNumber,
          addressComplement: form.addressComplement,
          addressDistrict: form.addressDistrict,
          addressCity: form.addressCity,
          addressState: form.addressState,
          addressCountry: form.addressCountry,
        };
      const updated = await usersApi.updateProfile(accessToken, {
        ...basePayload,
        bio: form.bio,
        gameTags: form.gameTags,
      });
      const mapped = mapProfileToForm(updated);
      setForm(mapped);
      setGameTagsInput(mapped.gameTags.join(', '));
      setProfile(updated);
      const normalizedNumber = updated.addressNumber?.toLowerCase() ?? '';
      setNoNumber(normalizedNumber === 's/n' || normalizedNumber === 'sem numero');
      setSuccess('Dados atualizados com sucesso.');
      if (!isProfileVerified) {
        setShowVerificationModal(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.');
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
        setCepError('Não foi possível localizar esse CEP.');
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
      setCepError('Não foi possível buscar o CEP agora.');
    } finally {
      setCepBusy(false);
    }
  };

  // Load RG status
  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    setRgLoading(true);
    rgApi.getStatus(accessToken)
      .then((data) => {
        if (active) setRgStatus(data);
      })
      .catch(() => { })
      .finally(() => {
        if (active) setRgLoading(false);
      });
    return () => { active = false; };
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    setVerificationLoading(true);
    setVerificationError(null);
    usersApi
      .getVerificationFeeStatus(accessToken)
      .then((data) => {
        if (!active) return;
        setVerificationState(data);
        if (data.status === 'PAID') {
          setProfile((prev) =>
            prev
              ? {
                ...prev,
                verificationFeePaidAt: data.paidAt ?? prev.verificationFeePaidAt ?? new Date().toISOString(),
              }
              : prev,
          );
        }
      })
      .catch((err) => {
        if (!active) return;
        setVerificationError(err instanceof Error ? err.message : 'Nao foi possivel carregar a taxa de verificacao.');
      })
      .finally(() => {
        if (active) setVerificationLoading(false);
      });
    return () => {
      active = false;
    };
  }, [accessToken]);

  const handleRgFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setRgError('Apenas imagens são permitidas.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setRgError('Arquivo muito grande. Máximo 5MB.');
      return;
    }
    setRgFile(file);
    setRgError(null);
    const reader = new FileReader();
    reader.onload = () => setRgPreview(reader.result as string);
    reader.readAsDataURL(file);
  };
  const handleRgNumberChange = (event: ChangeEvent<HTMLInputElement>) => {
    setRgNumber(clampDigits(event.target.value, 10));
  };

  const handleRgSubmit = async () => {
    if (!accessToken || !rgFile || !rgNumber.trim()) {
      setRgError('Preencha o número do RG e selecione uma foto.');
      return;
    }
    setRgSubmitting(true);
    setRgError(null);
    try {
      const result = await rgApi.submit(accessToken, rgNumber.trim(), rgFile);
      setRgStatus(result);
      setRgSuccess('RG enviado para análise!');
      setRgNumber('');
      setRgFile(null);
      setRgPreview(null);
    } catch (err) {
      setRgError(err instanceof Error ? err.message : 'Erro ao enviar RG.');
    } finally {
      setRgSubmitting(false);
    }
  };

  const getRgStatusDisplay = (): { icon: React.ReactNode; label: string; color: string } | null => {
    if (!rgStatus || rgStatus.status === 'NOT_SUBMITTED') return null;
    const statusMap: Record<Exclude<RgStatus, 'NOT_SUBMITTED'>, { icon: React.ReactNode; label: string; color: string }> = {
      PENDING: { icon: <Clock size={14} />, label: 'Em Análise', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
      APPROVED: { icon: <CheckCircle2 size={14} />, label: 'Verificado', color: 'text-green-600 bg-green-50 border-green-200' },
      REJECTED: { icon: <XCircle size={14} />, label: 'Reprovado', color: 'text-red-600 bg-red-50 border-red-200' },
    };
    return statusMap[rgStatus.status as Exclude<RgStatus, 'NOT_SUBMITTED'>];
  };

  const refreshVerificationStatus = async () => {
    if (!accessToken) return;
    setVerificationLoading(true);
    setVerificationError(null);
    try {
      const data = await usersApi.getVerificationFeeStatus(accessToken);
      setVerificationState(data);
      if (data.status === 'PAID') {
        setProfile((prev) =>
          prev
            ? {
              ...prev,
              verificationFeePaidAt: data.paidAt ?? prev.verificationFeePaidAt ?? new Date().toISOString(),
            }
            : prev,
        );
      }
    } catch (err) {
      setVerificationError(err instanceof Error ? err.message : 'Nao foi possivel carregar a taxa de verificacao.');
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleCreateVerificationPix = async () => {
    if (!accessToken || verificationBusy) return;
    setVerificationBusy(true);
    setVerificationError(null);
    try {
      const data = await usersApi.createVerificationFeePix(accessToken);
      setVerificationState(data);
      if (data.status === 'PAID') {
        setProfile((prev) =>
          prev
            ? {
              ...prev,
              verificationFeePaidAt: data.paidAt ?? prev.verificationFeePaidAt ?? new Date().toISOString(),
            }
            : prev,
        );
      }
    } catch (err) {
      setVerificationError(err instanceof Error ? err.message : 'Nao foi possivel gerar o Pix de verificacao.');
    } finally {
      setVerificationBusy(false);
    }
  };

  const handleCopyVerificationPix = async () => {
    if (!verificationState?.payment?.copyPaste) return;
    try {
      await navigator.clipboard.writeText(verificationState.payment.copyPaste);
      setVerificationCopied(true);
      setTimeout(() => setVerificationCopied(false), 2000);
    } catch {
      setVerificationCopied(false);
    }
  };

  const handlePhoneVerify = async () => {
    if (!accessToken) return;
    try {
      setPhoneVerifyLoading(true);
      setError(null);
      const { challengeId } = await usersApi.requestPhoneVerification(accessToken);
      setPhoneChallengeId(challengeId);
      setPhoneVerifyStep('code');
      setSuccess('Código de verificação enviado para seu telefone.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar código.');
    } finally {
      setPhoneVerifyLoading(false);
    }
  };

  const handlePhoneConfirm = async () => {
    if (!accessToken || !phoneChallengeId || !phoneCode) return;
    try {
      setPhoneVerifyLoading(true);
      setError(null);
      await usersApi.confirmPhoneVerification(accessToken, phoneChallengeId, phoneCode);
      setSuccess('Telefone verificado com sucesso!');
      setPhoneVerifyStep('idle');
      setPhoneChallengeId(null);
      setPhoneCode('');
      // Refresh profile
      const updated = await usersApi.getProfile(accessToken);
      if (updated) {
        setProfile(updated);
        setForm(mapProfileToForm(updated));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Código inválido ou expirado.');
    } finally {
      setPhoneVerifyLoading(false);
    }
  };

  const isProfileComplete = useMemo(() => {
    const cpfDigits = stripDigits(form.cpf);
    const phoneDigits = stripDigits(form.phone);
    const birthOk = Boolean(form.birthDate.trim());
    const numberOk = noNumber || Boolean(form.addressNumber.trim());
    return (
      Boolean(form.fullName.trim()) &&
      cpfDigits.length === 11 &&
      phoneDigits.length >= 10 &&
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
  const isProfileLocked = useMemo(() => {
    if (!profile || !profile.verificationFeePaidAt) {
      return false;
    }
    const cpfDigits = stripDigits(profile.cpf ?? '');
    const phoneDigits = stripDigits(profile.phoneE164 ?? '');
    const normalizedNumber = profile.addressNumber?.trim().toLowerCase() ?? '';
    const numberOk =
      normalizedNumber === 's/n' ||
      normalizedNumber === 'sem numero' ||
      Boolean(profile.addressNumber?.trim());
    return (
      Boolean(profile.fullName?.trim()) &&
      cpfDigits.length === 11 &&
      phoneDigits.length >= 10 &&
      Boolean(profile.birthDate?.trim()) &&
      Boolean(profile.addressZip?.trim()) &&
      Boolean(profile.addressStreet?.trim()) &&
      numberOk &&
      Boolean(profile.addressDistrict?.trim()) &&
      Boolean(profile.addressCity?.trim()) &&
      Boolean(profile.addressState?.trim()) &&
      Boolean(profile.addressCountry?.trim())
    );
  }, [profile]);
  const isProfileVerified = isProfileComplete && Boolean(profile?.verificationFeePaidAt);
  const isFormLocked = status === 'saving' || isProfileLocked;
  const isPublicProfileLocked = status === 'saving' || status === 'loading';

  if (loading) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-4 text-sm text-meow-muted">
          Carregando sessão...
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

  return (
    <AccountShell
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Conta', href: '/conta' },
        { label: 'Meus dados' },
      ]}
    >
      <form
        className="relative rounded-2xl border border-slate-100 bg-white pb-28 shadow-card"
        onSubmit={handleSubmit}
      >
        <div className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-black text-meow-charcoal">Dados Pessoais</h1>
              <p className="mt-2 text-sm text-meow-muted">
                Complete suas informações para agilizar suas compras e vendas com segurança.
              </p>
              <p className="mt-3 text-xs text-meow-muted">
                Preencha todas as informações solicitadas com atenção. Após o envio, não será possível alterá-las. Esses dados são necessários para a verificação da sua conta e também serão utilizados para realizarmos o seu pagamento.
              </p>
              {isProfileLocked ? (
                <p className="mt-2 text-xs font-semibold text-amber-600">
                  Seus dados ja foram confirmados e nao podem ser alterados.
                </p>
              ) : null}
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

          {showVerificationModal ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                <div className="relative mb-4 flex items-center justify-center">
                  <h3 className="text-lg font-bold text-meow-charcoal">Verificação da conta</h3>
                  <button
                    type="button"
                    onClick={() => setShowVerificationModal(false)}
                    className="absolute right-0 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    <XCircle size={18} />
                  </button>
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  Será feita uma cobrança de R$ 0,03 para verificação.
                  Os dados do Pix devem ser iguais aos informados; caso contrário, não haverá confirmação e o valor será reembolsado.
                </p>

                {verificationError ? (
                  <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {verificationError}
                  </div>
                ) : null}

                {verificationState?.status === 'PENDING' && verificationState.payment ? (
                  <div className="mt-4 grid gap-3">
                    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-4">
                      {verificationState.payment.qrCode ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={verificationState.payment.qrCode}
                          alt="QR Code Pix"
                          className="h-40 w-40 mix-blend-multiply"
                        />
                      ) : (
                        <div className="text-xs text-slate-400">QR Code indisponivel</div>
                      )}
                      <p className="mt-2 text-xs text-slate-400">Escaneie o QR Code</p>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-600">Copia e cola</label>
                      <div className="flex gap-2">
                        <input
                          readOnly
                          value={verificationState.payment.copyPaste ?? ''}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500"
                        />
                        <Button type="button" size="sm" variant="secondary" onClick={handleCopyVerificationPix}
                        >
                          {verificationCopied ? 'Copiado!' : 'Copiar'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 text-xs text-slate-500 text-center">
                    Clique em gerar Pix para criar o pagamento.
                  </div>
                )}

                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {verificationState?.status !== 'PENDING' || !verificationState.payment ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleCreateVerificationPix}
                      disabled={verificationBusy || verificationLoading}
                    >
                      {verificationBusy ? 'Gerando...' : 'Gerar Pix'}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={refreshVerificationStatus}
                    disabled={verificationLoading}
                  >
                    {verificationLoading ? 'Atualizando...' : 'Atualizar status'}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-6 space-y-6">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <SectionTitle icon={<UserRound size={14} aria-hidden />} label="Identificação" />
                <Badge
                  variant={isProfileVerified ? 'success' : 'danger'}
                  className="rounded-full border border-current bg-transparent px-3 py-1 text-[11px]"
                >
                  {isProfileVerified ? 'Perfil Verificado' : 'Perfil Não Verificado'}
                </Badge>
              </div>
              <div className="mt-4 grid gap-4">
                <label className="grid gap-1 text-xs font-semibold uppercase text-meow-muted">
                  Nome completo
                  <InputWithIcon
                    icon={<UserRound size={16} aria-hidden />}
                    placeholder="Digite seu nome completo"
                    value={form.fullName}
                    onChange={handleChange('fullName')}
                    disabled={isFormLocked}
                  />
                </label>
                <div className="grid gap-4 md:grid-cols-3">
                  <label className="grid gap-1 text-xs font-semibold uppercase text-meow-muted">
                    CPF
                    <InputWithIcon
                      icon={<UserRound size={16} aria-hidden />}
                      placeholder="000.000.000-00"
                      value={form.cpf}
                      onChange={handleCpfChange}
                      maxLength={14}
                      inputMode="numeric"
                      disabled={isFormLocked}
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-semibold uppercase text-meow-muted">
                    <div className="flex items-center justify-between">
                      <span>Telefone</span>
                      {profile?.phoneVerifiedAt ? (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-600">
                          <Check size={12} /> Verificado
                        </span>
                      ) : null}
                    </div>
                    {phoneVerifyStep === 'code' ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={phoneCode}
                          onChange={(e) => setPhoneCode(e.target.value)}
                          placeholder="Código"
                          maxLength={6}
                          className="h-9 w-24 text-center tracking-widest"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={handlePhoneConfirm}
                          disabled={phoneVerifyLoading || phoneCode.length < 6}
                        >
                          {phoneVerifyLoading ? '...' : 'OK'}
                        </Button>
                        <button
                          type="button"
                          onClick={() => setPhoneVerifyStep('idle')}
                          className="text-xs text-meow-muted hover:text-meow-deep"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <InputWithIcon
                        icon={<UserRound size={16} aria-hidden />}
                        placeholder="(00) 00000-0000"
                        value={form.phone}
                        onChange={handlePhoneChange}
                        maxLength={15}
                        inputMode="tel"
                        disabled={isFormLocked || phoneVerifyLoading}
                      />
                    )}
                  </label>
                  <label className="grid gap-1 text-xs font-semibold uppercase text-meow-muted">
                    Nascimento
                    <InputWithIcon
                      icon={<Calendar size={16} aria-hidden />}
                      placeholder="00/00/0000"
                      value={form.birthDate}
                      onChange={handleDateChange}
                      maxLength={10}
                      inputMode="numeric"
                      disabled={isFormLocked}
                    />
                  </label>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              Verifique cuidadosamente se o seu número de telefone está totalmente correto, pois
              será necessário confirmar via SMS para solicitar o saque. Não informe um número falso
              ou que você não utilize.
            </p>

            <div className="border-t border-slate-100 pt-6">
              <SectionTitle icon={<Info size={14} aria-hidden />} label="Perfil publico" />
              <div className="mt-4 grid gap-4">
                <label className="grid gap-1 text-xs font-semibold uppercase text-meow-muted">
                  Biografia
                  <Textarea
                    placeholder="Conte um pouco sobre voce, seu estilo de atendimento e o que vende."
                    value={form.bio}
                    onChange={handleBioChange}
                    maxLength={500}
                    rows={4}
                    disabled={isPublicProfileLocked}
                  />
                </label>
                <label className="grid gap-1 text-xs font-semibold uppercase text-meow-muted">
                  Tags de jogos
                  <Input
                    placeholder="Ex: Valorant, LoL, Steam"
                    value={gameTagsInput}
                    onChange={handleGameTagsChange}
                    disabled={isPublicProfileLocked}
                  />
                </label>
                {form.gameTags.length ? (
                  <div className="flex flex-wrap gap-2">
                    {form.gameTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full bg-meow-50 px-3 py-1 text-xs font-semibold text-meow-deep"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="rounded-full p-0.5 text-meow-deep/70 hover:text-meow-deep"
                          aria-label={`Remover ${tag}`}
                          disabled={isPublicProfileLocked}
                        >
                          <X size={12} aria-hidden />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
                <p className="text-[11px] text-slate-400">
                  Separe as tags por virgula. Maximo de 10.
                </p>
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
                      onChange={handleCepChange}
                      maxLength={9}
                      inputMode="numeric"
                      disabled={isFormLocked}
                      className="pr-12"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl border border-slate-200 bg-white text-rose-500"
                      onClick={handleCepLookup}
                      disabled={cepBusy || isFormLocked}
                      aria-label="Buscar CEP"
                    >
                      <div className="flex h-4 w-4 items-center justify-center">
                        <Search size={16} aria-hidden />
                      </div>
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
                    disabled={isFormLocked}
                  />
                </label>
                <div className="grid gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase text-meow-muted">
                      Número
                    </span>
                    <label className="flex items-center gap-2 text-xs font-semibold text-meow-muted cursor-pointer">
                      <input
                        type="checkbox"
                        checked={noNumber}
                        onChange={(event) => handleNoNumber(event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-meow-deep focus:ring-meow-200"
                        disabled={isFormLocked}
                      />
                      Sem número
                    </label>
                  </div>
                  <Input
                    placeholder="123"
                    value={form.addressNumber}
                    onChange={handleDigitsChange('addressNumber')}
                    inputMode="numeric"
                    pattern="\d*"
                    disabled={isFormLocked || noNumber}
                  />
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
                    disabled={isFormLocked}
                  />
                </label>
                <label className="grid gap-1 text-xs font-semibold uppercase text-meow-muted">
                  Bairro
                  <Input
                    placeholder="Seu bairro"
                    value={form.addressDistrict}
                    onChange={handleChange('addressDistrict')}
                    disabled={isFormLocked}
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
                    disabled={isFormLocked}
                  />
                </label>
                <label className="grid gap-1 text-xs font-semibold uppercase text-meow-muted">
                  Estado
                  <Select
                    value={form.addressState}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, addressState: event.target.value }))
                    }
                    disabled={isFormLocked}
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
                    disabled={isFormLocked}
                  >
                    <option value="Brasil">🇧🇷 Brasil</option>
                  </Select>
                </label>
              </div>
            </div>

            {/* RG Verification Section */}
            <div className="border-t border-slate-100 pt-6">
              <SectionTitle icon={<FileCheck size={14} aria-hidden />} label="Verificação de Identidade (RG)" />

              {rgLoading ? (
                <div className="mt-4 text-sm text-meow-muted">Carregando status...</div>
              ) : (
                <div className="mt-4 space-y-4">
                  {/* Status display */}
                  {getRgStatusDisplay() ? (
                    <div className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold ${getRgStatusDisplay()?.color}`}>
                      {getRgStatusDisplay()?.icon}
                      {getRgStatusDisplay()?.label}
                      {rgStatus && rgStatus.status === 'REJECTED' && 'adminReason' in rgStatus && rgStatus.adminReason ? (
                        <span className="ml-2 font-normal">— {rgStatus.adminReason}</span>
                      ) : null}
                    </div>
                  ) : null}

                  {rgSuccess ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      {rgSuccess}
                    </div>
                  ) : null}

                  {rgError ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {rgError}
                    </div>
                  ) : null}

                  {/* Show form only if not pending or can resubmit */}
                  {(!rgStatus || rgStatus.status === 'NOT_SUBMITTED' || rgStatus.status === 'REJECTED') ? (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                      <p className="text-sm text-meow-muted mb-4">
                        Envie uma foto sua segurando seu RG com um papel com o nome ‘Meoww’ para verificação de autenticidade. Esse procedimento aumenta a segurança das transações e fortalece sua reputação.
                      </p>

                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="grid gap-1 text-xs font-semibold uppercase text-meow-muted">
                          Número do RG
                          <Input
                            placeholder="Ex: 12.345.678-9"
                            value={formatRg(rgNumber)}
                            onChange={handleRgNumberChange}
                            inputMode="numeric"
                            pattern="\d*"
                            maxLength={10}
                            disabled={rgSubmitting}
                          />
                        </label>

                        <label className="grid gap-1 text-xs font-semibold uppercase text-meow-muted">
                          Foto do RG
                          <div className="relative">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleRgFileChange}
                              disabled={rgSubmitting}
                              className="hidden"
                              id="rg-upload"
                            />
                            <label
                              htmlFor="rg-upload"
                              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-meow-200 bg-white px-4 py-3 text-sm font-semibold text-meow-deep hover:border-meow-300 hover:bg-meow-50"
                            >
                              <Upload size={16} />
                              {rgFile ? rgFile.name : 'Selecionar arquivo'}
                            </label>
                          </div>
                        </label>
                      </div>

                      {rgPreview ? (
                        <div className="mt-4">
                          <p className="text-xs font-semibold text-meow-muted mb-2">Preview:</p>
                          <img
                            src={rgPreview}
                            alt="Preview do RG"
                            className="max-h-[150px] rounded-xl border border-slate-200 object-contain"
                          />
                        </div>
                      ) : null}

                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="mt-4"
                        onClick={handleRgSubmit}
                        disabled={rgSubmitting || !rgFile || !rgNumber.trim()}
                      >
                        {rgSubmitting ? 'Enviando...' : 'Enviar para Análise'}
                      </Button>
                    </div>
                  ) : rgStatus?.status === 'PENDING' ? (
                    <div className="rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-4 text-sm text-yellow-700">
                      <p>Seu RG está em análise. Você será notificado quando for aprovado.</p>
                    </div>
                  ) : rgStatus?.status === 'APPROVED' ? (
                    <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-700">
                      <p>Sua identidade foi verificada com sucesso!</p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 flex flex-wrap items-center justify-center gap-3 border-t border-slate-100 bg-white/90 px-6 py-4 backdrop-blur sm:justify-between">
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
            <Button type="submit" size="lg" disabled={isFormLocked}>
              {isProfileLocked ? 'Dados bloqueados' : status === 'saving' ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </div>
      </form >
    </AccountShell >
  );
};
