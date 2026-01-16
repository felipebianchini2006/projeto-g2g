
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { ApiClientError } from '../../lib/api-client';
import {
  adminCatalogApi,
  type CatalogCategory,
  type CatalogGroup,
  type CatalogOption,
  type CatalogSection,
} from '../../lib/admin-catalog-api';
import { useAuth } from '../auth/auth-provider';
import { AdminShell } from '../admin/admin-shell';

type CatalogForm = {
  name: string;
  slug: string;
  description: string;
};

const emptyForm: CatalogForm = { name: '', slug: '', description: '' };

export const AdminCadastrosContent = () => {
  const { user, accessToken, loading } = useAuth();
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [groups, setGroups] = useState<CatalogGroup[]>([]);
  const [sections, setSections] = useState<CatalogSection[]>([]);
  const [salesModels, setSalesModels] = useState<CatalogOption[]>([]);
  const [origins, setOrigins] = useState<CatalogOption[]>([]);
  const [recoveryOptions, setRecoveryOptions] = useState<CatalogOption[]>([]);
  const [groupFilterCategoryId, setGroupFilterCategoryId] = useState('');
  const [sectionFilterGroupId, setSectionFilterGroupId] = useState('');

  const [categoryForm, setCategoryForm] = useState<CatalogForm>(emptyForm);
  const [groupForm, setGroupForm] = useState<CatalogForm & { categoryId: string }>({
    ...emptyForm,
    categoryId: '',
  });
  const [sectionForm, setSectionForm] = useState<CatalogForm & { groupId: string }>({
    ...emptyForm,
    groupId: '',
  });
  const [salesModelForm, setSalesModelForm] = useState<CatalogForm>(emptyForm);
  const [originForm, setOriginForm] = useState<CatalogForm>(emptyForm);
  const [recoveryForm, setRecoveryForm] = useState<CatalogForm>(emptyForm);

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSalesModelId, setEditingSalesModelId] = useState<string | null>(null);
  const [editingOriginId, setEditingOriginId] = useState<string | null>(null);
  const [editingRecoveryId, setEditingRecoveryId] = useState<string | null>(null);

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

  const fetchAll = async (token: string) => {
    const [
      categoriesData,
      groupsData,
      sectionsData,
      salesModelsData,
      originsData,
      recoveryData,
    ] = await Promise.all([
      adminCatalogApi.listCategories(token),
      adminCatalogApi.listGroups(token),
      adminCatalogApi.listSections(token),
      adminCatalogApi.listSalesModels(token),
      adminCatalogApi.listOrigins(token),
      adminCatalogApi.listRecoveryOptions(token),
    ]);

    setCategories(categoriesData);
    setGroups(groupsData);
    setSections(sectionsData);
    setSalesModels(salesModelsData);
    setOrigins(originsData);
    setRecoveryOptions(recoveryData);
    setGroupFilterCategoryId((prev) => prev || categoriesData[0]?.id || '');
    setSectionFilterGroupId((prev) => prev || groupsData[0]?.id || '');
  };

  const loadCatalog = async () => {
    if (!accessToken) {
      return;
    }
    setBusyAction('load');
    setError(null);
    try {
      await fetchAll(accessToken);
    } catch (error) {
      handleError(error, 'Não foi possível carregar cadastros.');
    } finally {
      setBusyAction(null);
    }
  };

  useEffect(() => {
    if (accessToken && user?.role === 'ADMIN') {
      loadCatalog();
    }
  }, [accessToken, user?.role]);

  const filteredGroups = useMemo(() => {
    if (!groupFilterCategoryId) {
      return groups;
    }
    return groups.filter((group) => group.categoryId === groupFilterCategoryId);
  }, [groups, groupFilterCategoryId]);

  const filteredSections = useMemo(() => {
    if (!sectionFilterGroupId) {
      return sections;
    }
    return sections.filter((section) => section.groupId === sectionFilterGroupId);
  }, [sections, sectionFilterGroupId]);

  const resetCategoryForm = () => {
    setCategoryForm(emptyForm);
    setEditingCategoryId(null);
  };

  const resetGroupForm = () => {
    setGroupForm({ ...emptyForm, categoryId: '' });
    setEditingGroupId(null);
  };

  const resetSectionForm = () => {
    setSectionForm({ ...emptyForm, groupId: '' });
    setEditingSectionId(null);
  };

  const resetOptionForm = (type: 'sales' | 'origin' | 'recovery') => {
    if (type === 'sales') {
      setSalesModelForm(emptyForm);
      setEditingSalesModelId(null);
    } else if (type === 'origin') {
      setOriginForm(emptyForm);
      setEditingOriginId(null);
    } else {
      setRecoveryForm(emptyForm);
      setEditingRecoveryId(null);
    }
  };

  const runAction = async (label: string, action: () => Promise<void>) => {
    if (!accessToken) {
      return;
    }
    setBusyAction(label);
    setError(null);
    setNotice(null);
    try {
      await action();
      await fetchAll(accessToken);
      setNotice('Cadastro atualizado.');
    } catch (error) {
      handleError(error, 'Não foi possível salvar.');
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
        { label: 'Cadastros' },
      ]}
    >
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-meow-charcoal">Cadastros do sistema</h1>
            <p className="mt-2 text-sm text-meow-muted">
              Gerencie categorias, opções e configurações do anúncio.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-full border border-meow-red/30 px-4 py-2 text-xs font-bold text-meow-deep"
              type="button"
              onClick={loadCatalog}
              disabled={busyAction === 'load'}
            >
              {busyAction === 'load' ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>
        </div>
      </div>

      {error ? <div className="state-card error">{error}</div> : null}
      {notice ? <div className="state-card success">{notice}</div> : null}

      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
          <div className="panel-header">
            <h2>Categorias</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <div className="grid gap-2">
              <input
                className="form-input"
                placeholder="Nome da categoria"
                value={categoryForm.name}
                onChange={(event) =>
                  setCategoryForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
              <input
                className="form-input"
                placeholder="Slug (opcional)"
                value={categoryForm.slug}
                onChange={(event) =>
                  setCategoryForm((prev) => ({ ...prev, slug: event.target.value }))
                }
              />
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="Descrição (opcional)"
                value={categoryForm.description}
                onChange={(event) =>
                  setCategoryForm((prev) => ({ ...prev, description: event.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <button
                className="admin-primary-button"
                type="button"
                onClick={() =>
                  runAction('category-save', async () => {
                    const payload = {
                      name: categoryForm.name,
                      slug: categoryForm.slug || undefined,
                      description: categoryForm.description || undefined,
                    };
                    if (editingCategoryId) {
                      await adminCatalogApi.updateCategory(accessToken, editingCategoryId, payload);
                    } else {
                      await adminCatalogApi.createCategory(accessToken, payload);
                    }
                    resetCategoryForm();
                  })
                }
                disabled={busyAction === 'category-save' || !categoryForm.name.trim()}
              >
                {editingCategoryId ? 'Atualizar' : 'Cadastrar'}
              </button>
              {editingCategoryId ? (
                <button
                  className="ghost-button"
                  type="button"
                  onClick={resetCategoryForm}
                  disabled={busyAction === 'category-save'}
                >
                  Cancelar
                </button>
              ) : null}
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            {categories.length === 0 ? (
              <div className="state-card">Nenhuma categoria cadastrada.</div>
            ) : (
              categories.map((item) => (
                <div key={item.id} className="support-row">
                  <div>
                    <strong>{item.name}</strong>
                    <span className="auth-helper">{item.slug}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() => {
                        setEditingCategoryId(item.id);
                        setCategoryForm({
                          name: item.name,
                          slug: item.slug,
                          description: item.description ?? '',
                        });
                      }}
                    >
                      Editar
                    </button>
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() =>
                        runAction('category-delete', async () => {
                          if (!confirm('Remover categoria?')) {
                            return;
                          }
                          await adminCatalogApi.deleteCategory(accessToken, item.id);
                          resetCategoryForm();
                        })
                      }
                      disabled={busyAction === 'category-delete'}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
          <div className="panel-header">
            <h2>Subcategorias / Jogos</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <div className="grid gap-2">
              <select
                className="form-input"
                value={groupForm.categoryId}
                onChange={(event) =>
                  setGroupForm((prev) => ({ ...prev, categoryId: event.target.value }))
                }
              >
                <option value="">Selecione a categoria</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <input
                className="form-input"
                placeholder="Nome da subcategoria"
                value={groupForm.name}
                onChange={(event) =>
                  setGroupForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
              <input
                className="form-input"
                placeholder="Slug (opcional)"
                value={groupForm.slug}
                onChange={(event) =>
                  setGroupForm((prev) => ({ ...prev, slug: event.target.value }))
                }
              />
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="Descrição (opcional)"
                value={groupForm.description}
                onChange={(event) =>
                  setGroupForm((prev) => ({ ...prev, description: event.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <button
                className="admin-primary-button"
                type="button"
                onClick={() =>
                  runAction('group-save', async () => {
                    const payload = {
                      categoryId: groupForm.categoryId,
                      name: groupForm.name,
                      slug: groupForm.slug || undefined,
                      description: groupForm.description || undefined,
                    };
                    if (editingGroupId) {
                      await adminCatalogApi.updateGroup(accessToken, editingGroupId, payload);
                    } else {
                      await adminCatalogApi.createGroup(accessToken, payload);
                    }
                    resetGroupForm();
                  })
                }
                disabled={
                  busyAction === 'group-save' ||
                  !groupForm.categoryId ||
                  !groupForm.name.trim()
                }
              >
                {editingGroupId ? 'Atualizar' : 'Cadastrar'}
              </button>
              {editingGroupId ? (
                <button
                  className="ghost-button"
                  type="button"
                  onClick={resetGroupForm}
                  disabled={busyAction === 'group-save'}
                >
                  Cancelar
                </button>
              ) : null}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-meow-muted">
            <span>Filtrar por categoria:</span>
            <select
              className="form-input"
              value={groupFilterCategoryId}
              onChange={(event) => setGroupFilterCategoryId(event.target.value)}
            >
              <option value="">Todas</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4 grid gap-3">
            {filteredGroups.length === 0 ? (
              <div className="state-card">Nenhuma subcategoria cadastrada.</div>
            ) : (
              filteredGroups.map((item) => (
                <div key={item.id} className="support-row">
                  <div>
                    <strong>{item.name}</strong>
                    <span className="auth-helper">{item.slug}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() => {
                        setEditingGroupId(item.id);
                        setGroupForm({
                          categoryId: item.categoryId,
                          name: item.name,
                          slug: item.slug,
                          description: item.description ?? '',
                        });
                      }}
                    >
                      Editar
                    </button>
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() =>
                        runAction('group-delete', async () => {
                          if (!confirm('Remover subcategoria?')) {
                            return;
                          }
                          await adminCatalogApi.deleteGroup(accessToken, item.id);
                          resetGroupForm();
                        })
                      }
                      disabled={busyAction === 'group-delete'}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
          <div className="panel-header">
            <h2>Secoes</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <div className="grid gap-2">
              <select
                className="form-input"
                value={sectionForm.groupId}
                onChange={(event) =>
                  setSectionForm((prev) => ({ ...prev, groupId: event.target.value }))
                }
              >
                <option value="">Selecione a subcategoria</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
              <input
                className="form-input"
                placeholder="Nome da secao"
                value={sectionForm.name}
                onChange={(event) =>
                  setSectionForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
              <input
                className="form-input"
                placeholder="Slug (opcional)"
                value={sectionForm.slug}
                onChange={(event) =>
                  setSectionForm((prev) => ({ ...prev, slug: event.target.value }))
                }
              />
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="Descrição (opcional)"
                value={sectionForm.description}
                onChange={(event) =>
                  setSectionForm((prev) => ({ ...prev, description: event.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <button
                className="admin-primary-button"
                type="button"
                onClick={() =>
                  runAction('section-save', async () => {
                    const payload = {
                      groupId: sectionForm.groupId,
                      name: sectionForm.name,
                      slug: sectionForm.slug || undefined,
                      description: sectionForm.description || undefined,
                    };
                    if (editingSectionId) {
                      await adminCatalogApi.updateSection(accessToken, editingSectionId, payload);
                    } else {
                      await adminCatalogApi.createSection(accessToken, payload);
                    }
                    resetSectionForm();
                  })
                }
                disabled={
                  busyAction === 'section-save' ||
                  !sectionForm.groupId ||
                  !sectionForm.name.trim()
                }
              >
                {editingSectionId ? 'Atualizar' : 'Cadastrar'}
              </button>
              {editingSectionId ? (
                <button
                  className="ghost-button"
                  type="button"
                  onClick={resetSectionForm}
                  disabled={busyAction === 'section-save'}
                >
                  Cancelar
                </button>
              ) : null}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-meow-muted">
            <span>Filtrar por subcategoria:</span>
            <select
              className="form-input"
              value={sectionFilterGroupId}
              onChange={(event) => setSectionFilterGroupId(event.target.value)}
            >
              <option value="">Todas</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4 grid gap-3">
            {filteredSections.length === 0 ? (
              <div className="state-card">Nenhuma secao cadastrada.</div>
            ) : (
              filteredSections.map((item) => (
                <div key={item.id} className="support-row">
                  <div>
                    <strong>{item.name}</strong>
                    <span className="auth-helper">{item.slug}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() => {
                        setEditingSectionId(item.id);
                        setSectionForm({
                          groupId: item.groupId,
                          name: item.name,
                          slug: item.slug,
                          description: item.description ?? '',
                        });
                      }}
                    >
                      Editar
                    </button>
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() =>
                        runAction('section-delete', async () => {
                          if (!confirm('Remover secao?')) {
                            return;
                          }
                          await adminCatalogApi.deleteSection(accessToken, item.id);
                          resetSectionForm();
                        })
                      }
                      disabled={busyAction === 'section-delete'}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
            <div className="panel-header">
              <h2>Tipos de venda</h2>
            </div>
            <div className="grid gap-2">
              <input
                className="form-input"
                placeholder="Nome do tipo"
                value={salesModelForm.name}
                onChange={(event) =>
                  setSalesModelForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
              <input
                className="form-input"
                placeholder="Slug (opcional)"
                value={salesModelForm.slug}
                onChange={(event) =>
                  setSalesModelForm((prev) => ({ ...prev, slug: event.target.value }))
                }
              />
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="Descrição (opcional)"
                value={salesModelForm.description}
                onChange={(event) =>
                  setSalesModelForm((prev) => ({ ...prev, description: event.target.value }))
                }
              />
              <div className="flex gap-2">
                <button
                  className="admin-primary-button"
                  type="button"
                  onClick={() =>
                    runAction('sales-save', async () => {
                      const payload = {
                        name: salesModelForm.name,
                        slug: salesModelForm.slug || undefined,
                        description: salesModelForm.description || undefined,
                      };
                      if (editingSalesModelId) {
                        await adminCatalogApi.updateSalesModel(accessToken, editingSalesModelId, payload);
                      } else {
                        await adminCatalogApi.createSalesModel(accessToken, payload);
                      }
                      resetOptionForm('sales');
                    })
                  }
                  disabled={busyAction === 'sales-save' || !salesModelForm.name.trim()}
                >
                  {editingSalesModelId ? 'Atualizar' : 'Cadastrar'}
                </button>
                {editingSalesModelId ? (
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => resetOptionForm('sales')}
                    disabled={busyAction === 'sales-save'}
                  >
                    Cancelar
                  </button>
                ) : null}
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              {salesModels.length === 0 ? (
                <div className="state-card">Nenhum tipo cadastrado.</div>
              ) : (
                salesModels.map((item) => (
                  <div key={item.id} className="support-row">
                    <div>
                      <strong>{item.name}</strong>
                      <span className="auth-helper">{item.slug}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="ghost-button"
                        type="button"
                        onClick={() => {
                          setEditingSalesModelId(item.id);
                          setSalesModelForm({
                            name: item.name,
                            slug: item.slug,
                            description: item.description ?? '',
                          });
                        }}
                      >
                        Editar
                      </button>
                      <button
                        className="ghost-button"
                        type="button"
                        onClick={() =>
                          runAction('sales-delete', async () => {
                            if (!confirm('Remover tipo?')) {
                              return;
                            }
                            await adminCatalogApi.deleteSalesModel(accessToken, item.id);
                            resetOptionForm('sales');
                          })
                        }
                        disabled={busyAction === 'sales-delete'}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
            <div className="panel-header">
              <h2>Procedencias</h2>
            </div>
            <div className="grid gap-2">
              <input
                className="form-input"
                placeholder="Nome da procedência"
                value={originForm.name}
                onChange={(event) =>
                  setOriginForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
              <input
                className="form-input"
                placeholder="Slug (opcional)"
                value={originForm.slug}
                onChange={(event) =>
                  setOriginForm((prev) => ({ ...prev, slug: event.target.value }))
                }
              />
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="Descrição (opcional)"
                value={originForm.description}
                onChange={(event) =>
                  setOriginForm((prev) => ({ ...prev, description: event.target.value }))
                }
              />
              <div className="flex gap-2">
                <button
                  className="admin-primary-button"
                  type="button"
                  onClick={() =>
                    runAction('origin-save', async () => {
                      const payload = {
                        name: originForm.name,
                        slug: originForm.slug || undefined,
                        description: originForm.description || undefined,
                      };
                      if (editingOriginId) {
                        await adminCatalogApi.updateOrigin(accessToken, editingOriginId, payload);
                      } else {
                        await adminCatalogApi.createOrigin(accessToken, payload);
                      }
                      resetOptionForm('origin');
                    })
                  }
                  disabled={busyAction === 'origin-save' || !originForm.name.trim()}
                >
                  {editingOriginId ? 'Atualizar' : 'Cadastrar'}
                </button>
                {editingOriginId ? (
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => resetOptionForm('origin')}
                    disabled={busyAction === 'origin-save'}
                  >
                    Cancelar
                  </button>
                ) : null}
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              {origins.length === 0 ? (
                <div className="state-card">Nenhuma procedência cadastrada.</div>
              ) : (
                origins.map((item) => (
                  <div key={item.id} className="support-row">
                    <div>
                      <strong>{item.name}</strong>
                      <span className="auth-helper">{item.slug}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="ghost-button"
                        type="button"
                        onClick={() => {
                          setEditingOriginId(item.id);
                          setOriginForm({
                            name: item.name,
                            slug: item.slug,
                            description: item.description ?? '',
                          });
                        }}
                      >
                        Editar
                      </button>
                      <button
                        className="ghost-button"
                        type="button"
                        onClick={() =>
                          runAction('origin-delete', async () => {
                            if (!confirm('Remover procedência?')) {
                              return;
                            }
                            await adminCatalogApi.deleteOrigin(accessToken, item.id);
                            resetOptionForm('origin');
                          })
                        }
                        disabled={busyAction === 'origin-delete'}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
            <div className="panel-header">
              <h2>Dados de recuperação</h2>
            </div>
            <div className="grid gap-2">
              <input
                className="form-input"
                placeholder="Nome do dado"
                value={recoveryForm.name}
                onChange={(event) =>
                  setRecoveryForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
              <input
                className="form-input"
                placeholder="Slug (opcional)"
                value={recoveryForm.slug}
                onChange={(event) =>
                  setRecoveryForm((prev) => ({ ...prev, slug: event.target.value }))
                }
              />
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="Descrição (opcional)"
                value={recoveryForm.description}
                onChange={(event) =>
                  setRecoveryForm((prev) => ({ ...prev, description: event.target.value }))
                }
              />
              <div className="flex gap-2">
                <button
                  className="admin-primary-button"
                  type="button"
                  onClick={() =>
                    runAction('recovery-save', async () => {
                      const payload = {
                        name: recoveryForm.name,
                        slug: recoveryForm.slug || undefined,
                        description: recoveryForm.description || undefined,
                      };
                      if (editingRecoveryId) {
                        await adminCatalogApi.updateRecoveryOption(accessToken, editingRecoveryId, payload);
                      } else {
                        await adminCatalogApi.createRecoveryOption(accessToken, payload);
                      }
                      resetOptionForm('recovery');
                    })
                  }
                  disabled={busyAction === 'recovery-save' || !recoveryForm.name.trim()}
                >
                  {editingRecoveryId ? 'Atualizar' : 'Cadastrar'}
                </button>
                {editingRecoveryId ? (
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => resetOptionForm('recovery')}
                    disabled={busyAction === 'recovery-save'}
                  >
                    Cancelar
                  </button>
                ) : null}
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              {recoveryOptions.length === 0 ? (
                <div className="state-card">Nenhum dado cadastrado.</div>
              ) : (
                recoveryOptions.map((item) => (
                  <div key={item.id} className="support-row">
                    <div>
                      <strong>{item.name}</strong>
                      <span className="auth-helper">{item.slug}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="ghost-button"
                        type="button"
                        onClick={() => {
                          setEditingRecoveryId(item.id);
                          setRecoveryForm({
                            name: item.name,
                            slug: item.slug,
                            description: item.description ?? '',
                          });
                        }}
                      >
                        Editar
                      </button>
                      <button
                        className="ghost-button"
                        type="button"
                        onClick={() =>
                          runAction('recovery-delete', async () => {
                            if (!confirm('Remover dado?')) {
                              return;
                            }
                            await adminCatalogApi.deleteRecoveryOption(accessToken, item.id);
                            resetOptionForm('recovery');
                          })
                        }
                        disabled={busyAction === 'recovery-delete'}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
};
