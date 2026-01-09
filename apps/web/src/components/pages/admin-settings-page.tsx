'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ApiClientError } from '../../lib/api-client';
import {
  adminSettingsApi,
  type PlatformSettings,
} from '../../lib/admin-settings-api';
import { useAuth } from '../auth/auth-provider';
import { AdminNav } from '../admin/admin-nav';
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
      handleError(error, 'Nao foi possivel carregar parametros.');
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
      handleError(error, 'Nao foi possivel atualizar parametros.');
    } finally {
      setBusyAction(null);
    }
  };

  if (loading) {
    return (
      <div className="admin-settings-shell">
        <div className="state-card">Carregando sessao...</div>
      </div>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="admin-settings-shell">
        <div className="state-card">Acesso restrito ao admin.</div>
        <Link className="ghost-button" href="/conta">
          Voltar para conta
        </Link>
      </div>
    );
  }

  return (
    <section className="admin-settings-shell">
      <div className="admin-settings-header">
        <div>
          <h1>Parametros</h1>
          <p className="auth-helper">Ajuste taxas e limites da plataforma.</p>
        </div>
        <div className="page-actions">
          <NotificationsBell />
          <Link className="ghost-button" href="/conta">
            Voltar para conta
          </Link>
        </div>
      </div>

      <AdminNav />

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
    </section>
  );
};
