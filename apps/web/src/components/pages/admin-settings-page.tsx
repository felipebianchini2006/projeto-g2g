'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ApiClientError } from '../../lib/api-client';
import {
  adminSettingsApi,
  type PlatformSettings,
} from '../../lib/admin-settings-api';
import { useAuth } from '../auth/auth-provider';
import { AdminShell } from '../admin/admin-shell';
import { NotificationsBell } from '../notifications/notifications-bell';

type SettingsFormState = {
  platformFeePercent: number;
  orderPaymentTtlSeconds: number;
  settlementReleaseDelayHours: number;
  splitEnabled: boolean;
};

const buildFormState = (settings: PlatformSettings): SettingsFormState => ({
  platformFeePercent: Number((settings.platformFeeBps / 100).toFixed(2)),
  orderPaymentTtlSeconds: settings.orderPaymentTtlSeconds,
  settlementReleaseDelayHours: settings.settlementReleaseDelayHours,
  splitEnabled: settings.splitEnabled,
});

export const AdminSettingsContent = () => {
  const { user, accessToken, loading } = useAuth();
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [formState, setFormState] = useState<SettingsFormState>({
    platformFeePercent: 0,
    orderPaymentTtlSeconds: 900,
    settlementReleaseDelayHours: 0,
    splitEnabled: false,
  });
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleError = (error: unknown, fallback: string) => {
    if (error instanceof ApiClientError) {
      setError(error.message);
      return;
    }
    setError(error instanceof Error ? error.message : fallback);
  };

  const loadSettings = async () => {
    if (!accessToken) {
      return;
    }
    setBusyAction('load');
    setError(null);
    setNotice(null);
    try {
      const data = await adminSettingsApi.getSettings(accessToken);
      setSettings(data);
      setFormState(buildFormState(data));
    } catch (error) {
      handleError(error, 'Não foi possível carregar parametros.');
    } finally {
      setBusyAction(null);
    }
  };

  useEffect(() => {
    if (accessToken && user?.role === 'ADMIN') {
      loadSettings();
    }
  }, [accessToken, user?.role]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) {
      return;
    }
    setBusyAction('save');
    setError(null);
    setNotice(null);
    try {
      const payload = {
        platformFeeBps: Math.max(Math.round(formState.platformFeePercent * 100), 0),
        orderPaymentTtlSeconds: Math.max(formState.orderPaymentTtlSeconds, 60),
        settlementReleaseDelayHours: Math.max(formState.settlementReleaseDelayHours, 0),
        splitEnabled: formState.splitEnabled,
      };
      const updated = await adminSettingsApi.updateSettings(accessToken, payload);
      setSettings(updated);
      setFormState(buildFormState(updated));
      setNotice('Parametros atualizados.');
    } catch (error) {
      handleError(error, 'Não foi possível atualizar parametros.');
    } finally {
      setBusyAction(null);
    }
  };

  if (loading) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-4 text-sm text-meow-muted">
          Carregando sessão...
        </div>
      </section>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-6 text-center">
          <p className="text-sm text-meow-muted">Acesso restrito ao admin.</p>
          <Link
            className="mt-4 inline-flex rounded-full border border-meow-red/30 px-6 py-2 text-sm font-bold text-meow-deep"
            href="/conta"
          >
            Voltar para conta
          </Link>
        </div>
      </section>
    );
  }

  return (
    <AdminShell
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Admin', href: '/admin/atendimento' },
        { label: 'Parametros' },
      ]}
    >
      <div className="rounded-2xl border border-meow-red/20 bg-white p-6 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-meow-charcoal">Parametros</h1>
            <p className="mt-2 text-sm text-meow-muted">
              Ajuste taxas e limites da plataforma.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationsBell />
            <Link
              className="rounded-full border border-meow-red/30 px-4 py-2 text-xs font-bold text-meow-deep"
              href="/conta"
            >
              Voltar para conta
            </Link>
          </div>
        </div>
      </div>

      {error ? <div className="state-card error">{error}</div> : null}
      {notice ? <div className="state-card success">{notice}</div> : null}

      <div className="admin-settings-grid">
        <div className="order-card">
          <div className="panel-header">
            <h2>Configuracoes</h2>
            <button
              className="ghost-button"
              type="button"
              onClick={loadSettings}
              disabled={busyAction === 'load'}
            >
              {busyAction === 'load' ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>

          {busyAction === 'load' ? (
            <div className="state-card">Carregando parametros...</div>
          ) : null}

          {!settings ? (
            <div className="state-card">Nenhum parametro encontrado.</div>
          ) : (
            <form className="seller-form" onSubmit={handleSubmit}>
              <label className="form-field">
                Taxa da plataforma (%)
                <input
                  className="form-input"
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={formState.platformFeePercent}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      platformFeePercent: Number(event.target.value || 0),
                    }))
                  }
                />
              </label>
              <label className="form-field">
                Auto-cancelamento (segundos)
                <input
                  className="form-input"
                  type="number"
                  min={60}
                  value={formState.orderPaymentTtlSeconds}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      orderPaymentTtlSeconds: Number(event.target.value || 0),
                    }))
                  }
                />
              </label>
              <label className="form-field">
                Auto-liberacao (horas)
                <input
                  className="form-input"
                  type="number"
                  min={0}
                  value={formState.settlementReleaseDelayHours}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      settlementReleaseDelayHours: Number(event.target.value || 0),
                    }))
                  }
                />
              </label>
              <label className="form-field">
                Split habilitado
                <select
                  className="form-input"
                  value={formState.splitEnabled ? 'on' : 'off'}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      splitEnabled: event.target.value === 'on',
                    }))
                  }
                >
                  <option value="off">Off</option>
                  <option value="on">On</option>
                </select>
              </label>

              <div className="form-actions">
                <button
                  className="primary-button"
                  type="submit"
                  disabled={busyAction === 'save'}
                >
                  {busyAction === 'save' ? 'Salvando...' : 'Salvar ajustes'}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="order-card">
          <h2>Resumo atual</h2>
          {!settings ? (
            <div className="state-card">Carregando resumo...</div>
          ) : (
            <div className="ticket-summary">
              <div>
                <span className="summary-label">Taxa</span>
                <strong>{(settings.platformFeeBps / 100).toFixed(2)}%</strong>
              </div>
              <div>
                <span className="summary-label">Auto-cancel</span>
                <strong>{settings.orderPaymentTtlSeconds}s</strong>
              </div>
              <div>
                <span className="summary-label">Auto-liberacao</span>
                <strong>{settings.settlementReleaseDelayHours}h</strong>
              </div>
              <div>
                <span className="summary-label">Split</span>
                <strong>{settings.splitEnabled ? 'On' : 'Off'}</strong>
              </div>
              <div>
                <span className="summary-label">Atualizado</span>
                <strong>
                  {new Date(settings.updatedAt).toLocaleDateString('pt-BR')}
                </strong>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
};
