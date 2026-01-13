'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Clock,
  Globe,
  Laptop,
  LogOut,
  MapPin,
  Monitor,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';

import { ApiClientError } from '../../lib/api-client';
import { accountSecurityApi, type SessionInfo } from '../../lib/account-security-api';
import { useAuth } from '../auth/auth-provider';
import { AccountShell } from '../account/account-shell';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

type SessionsState = {
  status: 'loading' | 'ready';
  sessions: SessionInfo[];
  error?: string;
  actionError?: string;
  actionSuccess?: string;
};

type ParsedAgent = {
  deviceName: string;
  details: string;
};

const getBrowserInfo = (ua: string) => {
  const browserMap = [
    { label: 'Edge', regex: /edg\/(\d+)/ },
    { label: 'Opera', regex: /(opr|opera)\/(\d+)/ },
    { label: 'Chrome', regex: /chrome\/(\d+)/ },
    { label: 'Firefox', regex: /firefox\/(\d+)/ },
    { label: 'Safari', regex: /version\/(\d+).*safari/ },
  ];
  for (const browser of browserMap) {
    const match = ua.match(browser.regex);
    if (match) {
      const version = match[2] ?? match[1] ?? '';
      return version ? `${browser.label} ${version}` : browser.label;
    }
  }
  return 'Navegador';
};

const getOsInfo = (ua: string) => {
  if (ua.includes('windows')) {
    const match = ua.match(/windows nt (\d+\.\d+)/);
    const version = match?.[1] ?? '';
    if (version === '10.0') {
      return 'Windows 11';
    }
    if (version) {
      return `Windows ${version}`;
    }
    return 'Windows';
  }
  if (ua.includes('iphone')) {
    const match = ua.match(/os (\d+[_\.]\d+)/);
    const version = match?.[1]?.replace('_', '.') ?? '';
    return version ? `iOS ${version}` : 'iOS';
  }
  if (ua.includes('ipad')) {
    const match = ua.match(/os (\d+[_\.]\d+)/);
    const version = match?.[1]?.replace('_', '.') ?? '';
    return version ? `iPadOS ${version}` : 'iPadOS';
  }
  if (ua.includes('android')) {
    const match = ua.match(/android (\d+\.\d+)/);
    const version = match?.[1] ?? '';
    return version ? `Android ${version}` : 'Android';
  }
  if (ua.includes('mac os') || ua.includes('macintosh')) {
    const match = ua.match(/mac os x (\d+[_\.]\d+)/);
    const version = match?.[1]?.replace('_', '.') ?? '';
    return version ? `macOS ${version}` : 'macOS';
  }
  if (ua.includes('linux')) {
    return 'Linux';
  }
  return 'Sistema';
};

const parseUserAgent = (userAgent?: string | null): ParsedAgent => {
  if (!userAgent) {
    return { deviceName: 'Dispositivo', details: 'Detalhes não informados' };
  }
  const ua = userAgent.toLowerCase();
  let deviceName = 'Dispositivo';
  if (ua.includes('iphone')) {
    deviceName = 'iPhone';
  } else if (ua.includes('ipad')) {
    deviceName = 'iPad';
  } else if (ua.includes('android')) {
    deviceName = 'Android';
  } else if (ua.includes('windows')) {
    deviceName = 'Windows PC';
  } else if (ua.includes('mac os') || ua.includes('macintosh')) {
    deviceName = 'MacBook';
  } else if (ua.includes('linux')) {
    deviceName = 'Linux';
  }

  const osInfo = getOsInfo(ua);
  const browserInfo = getBrowserInfo(ua);
  const details = osInfo && browserInfo ? `${osInfo} • ${browserInfo}` : osInfo || browserInfo;
  return { deviceName, details: details || 'Detalhes não informados' };
};

const formatRelativeTime = (value?: string | null) => {
  if (!value) {
    return 'Há pouco';
  }
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) {
    return `Há ${minutes || 1} min`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `Há ${hours} horas`;
  }
  const days = Math.floor(hours / 24);
  return `Há ${days} dias`;
};

const resolveDeviceIcon = (deviceName: string) => {
  const lower = deviceName.toLowerCase();
  if (lower.includes('iphone') || lower.includes('android')) {
    return <Smartphone size={18} aria-hidden />;
  }
  if (lower.includes('mac')) {
    return <Laptop size={18} aria-hidden />;
  }
  return <Monitor size={18} aria-hidden />;
};

export const AccountSessionsContent = () => {
  const { user, accessToken, loading } = useAuth();
  const [state, setState] = useState<SessionsState>({
    status: 'loading',
    sessions: [],
  });
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [logoutAllBusy, setLogoutAllBusy] = useState(false);

  const loadSessions = async () => {
    if (!accessToken) {
      return;
    }
    setState((prev) => ({ ...prev, status: 'loading', error: undefined }));
    try {
      const sessions = await accountSecurityApi.listSessions(accessToken);
      setState((prev) => ({ ...prev, status: 'ready', sessions }));
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Não foi possível carregar as sessões.';
      setState((prev) => ({ ...prev, status: 'ready', sessions: [], error: message }));
    }
  };

  useEffect(() => {
    if (accessToken) {
      loadSessions();
    }
  }, [accessToken]);

  const handleRevoke = async (sessionId: string) => {
    if (!accessToken || actionBusy) {
      return;
    }
    setActionBusy(sessionId);
    try {
      await accountSecurityApi.revokeSession(accessToken, sessionId);
      setState((prev) => ({
        ...prev,
        actionSuccess: 'Sessão encerrada.',
        actionError: undefined,
      }));
      await loadSessions();
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Não foi possível encerrar a sessão.';
      setState((prev) => ({ ...prev, actionError: message, actionSuccess: undefined }));
    } finally {
      setActionBusy(null);
    }
  };

  const handleLogoutAll = async () => {
    if (!accessToken || logoutAllBusy) {
      return;
    }
    if (!window.confirm('Deseja sair de todas as sessões?')) {
      return;
    }
    setLogoutAllBusy(true);
    try {
      const result = await accountSecurityApi.logoutAll(accessToken);
      setState((prev) => ({
        ...prev,
        actionSuccess: `Sessões encerradas: ${result.revokedSessions}.`,
        actionError: undefined,
      }));
      await loadSessions();
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Não foi possível encerrar as sessões.';
      setState((prev) => ({ ...prev, actionError: message, actionSuccess: undefined }));
    } finally {
      setLogoutAllBusy(false);
    }
  };

  if (loading) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px]">
          <Skeleton className="h-24 w-full" />
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-6 text-center">
          <p className="text-sm text-meow-muted">Entre para acessar suas sessões.</p>
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
        { label: 'Sessões' },
      ]}
    >
      <Card className="rounded-[26px] border border-slate-200 bg-gradient-to-r from-slate-50 to-rose-50 p-6 shadow-card">
        <div className="flex flex-wrap items-start gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-rose-500 shadow-card">
            <ShieldCheck size={20} aria-hidden />
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-black text-meow-charcoal">Sessões Ativas</h1>
            <p className="text-sm text-meow-muted">
              Aqui você pode ver e gerenciar todos os dispositivos onde sua conta Meoww está conectada.
            </p>
            <p className="text-sm text-meow-muted">
              Se não reconhecer algum acesso, recomendamos{' '}
              <Link
                href="/conta/seguranca"
                className="font-semibold text-rose-500 underline hover:text-rose-600"
              >
                alterar sua senha
              </Link>{' '}
              imediatamente.
            </p>
          </div>
        </div>
      </Card>

      <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-meow-charcoal">Dispositivos conectados</h2>
            <p className="mt-2 text-sm text-meow-muted">
              Veja onde sua conta está conectada e encerre acessos antigos.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={handleLogoutAll}
            disabled={logoutAllBusy || state.sessions.length === 0}
          >
            {logoutAllBusy ? 'Encerrando...' : 'Sair de todas'}
          </Button>
        </div>

        {state.error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        ) : null}
        {state.actionError ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.actionError}
          </div>
        ) : null}
        {state.actionSuccess ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {state.actionSuccess}
          </div>
        ) : null}

        {state.status === 'loading' ? (
          <div className="mt-4 grid gap-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : null}

        {state.status === 'ready' && state.sessions.length === 0 ? (
          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-meow-muted">
            Nenhuma sessão encontrada.
          </div>
        ) : null}

        <div className="mt-4 grid gap-4">
          {state.sessions.map((session) => {
            const { deviceName, details } = parseUserAgent(session.userAgent);
            const isCurrent = session.isCurrent;
            const isRevoked = Boolean(session.revokedAt);
            const statusLabel = isCurrent
              ? 'Online Agora'
              : formatRelativeTime(session.lastSeenAt ?? session.createdAt);
            const locationLabel = 'Localização não informada';

            return (
              <div
                key={session.id}
                className={`relative flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4 shadow-card sm:flex-nowrap sm:gap-6 ${
                  isCurrent ? 'border-rose-200 bg-rose-50/40' : 'border-slate-100 bg-white'
                }`}
              >
                {isCurrent ? (
                  <span className="absolute right-4 top-[-12px] rounded-full bg-rose-500 px-3 py-1 text-[10px] font-bold uppercase text-white shadow-card">
                    DISPOSITIVO ATUAL
                  </span>
                ) : null}
                <div className="flex items-center gap-4">
                  <div
                    className={`grid h-14 w-14 place-items-center rounded-2xl ${
                      isCurrent ? 'bg-rose-100 text-rose-500' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {resolveDeviceIcon(deviceName)}
                  </div>
                  <div>
                    <p className="text-base font-bold text-meow-charcoal">{deviceName}</p>
                    <p className="text-sm text-meow-muted">{details}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-meow-muted">
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={12} aria-hidden />
                        {locationLabel}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Globe size={12} aria-hidden />
                        {session.ip ?? '-'}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 ${
                          isCurrent ? 'text-emerald-600' : 'text-meow-muted'
                        }`}
                      >
                        <Clock size={12} aria-hidden />
                        {statusLabel}
                      </span>
                    </div>
                  </div>
                </div>
                {!isCurrent && !isRevoked ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    type="button"
                    className="gap-2"
                    disabled={actionBusy === session.id}
                    onClick={() => handleRevoke(session.id)}
                  >
                    <LogOut size={14} aria-hidden />
                    {actionBusy === session.id ? 'Encerrando...' : 'Encerrar'}
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </AccountShell>
  );
};
