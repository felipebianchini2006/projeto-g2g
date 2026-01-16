
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, RefreshCw } from 'lucide-react';

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
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';

type CatalogForm = {
  name: string;
  slug: string;
  description: string;
};

const emptyForm: CatalogForm = { name: '', slug: '', description: '' };

const selectBaseClassName =
  'h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none focus:border-meow-red/60 focus:ring-4 focus:ring-meow-red/15';

const filterSelectClassName =
  'h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 outline-none focus:border-meow-red/60 focus:ring-4 focus:ring-meow-red/10';

const itemRowClass = (active: boolean) =>
  `flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 transition ${active
    ? 'border-meow-red/30 bg-meow-red/5'
    : 'border-slate-100 bg-white hover:border-meow-red/20 hover:bg-slate-50'
  }`;

const compactTextareaClassName = 'min-h-[90px]';

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
      handleError(error, 'N├úo foi poss├¡vel carregar cadastros.');
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
      handleError(error, 'N├úo foi poss├¡vel salvar.');
    } finally {
      setBusyAction(null);
    }
  };

  if (loading) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-4 text-sm text-meow-muted">
          Carregando sess├úo...
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
      <Card className="rounded-2xl border border-meow-red/20 p-5 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-meow-charcoal">Cadastros do sistema</h1>
            <p className="mt-2 text-sm text-meow-muted">
              Gerencie categorias, opcoes e configuracoes do anuncio.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={loadCatalog}
              disabled={busyAction === 'load'}
            >
              <RefreshCw
                size={16}
                className={`mr-2 ${busyAction === 'load' ? 'animate-spin' : ''}`}
              />
              {busyAction === 'load' ? 'Atualizando...' : 'Atualizar'}
            </Button>
            <Link
              href="/conta"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-400 shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition hover:text-meow-deep hover:shadow-md"
            >
              <ChevronLeft size={20} />
            </Link>
          </div>
        </div>
      </Card>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 animate-in fade-in slide-in-from-top-2">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 animate-in fade-in slide-in-from-top-2">
          {notice}
        </div>
      ) : null}

      <div className="space-y-6">
        <Card className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4">
            <div>
              <h2 className="text-sm font-bold text-meow-charcoal">Categorias</h2>
              <p className="text-xs text-meow-muted">Crie categorias principais do catalogo.</p>
            </div>
            <Badge variant="neutral" size="sm">
              {categories.length} itens
            </Badge>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
              <div className="grid gap-3">
                <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                  Nome da categoria
                  <Input
                    placeholder="Nome da categoria"
                    value={categoryForm.name}
                    onChange={(event) =>
                      setCategoryForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                  Slug (opcional)
                  <Input
                    placeholder="Slug (opcional)"
                    value={categoryForm.slug}
                    onChange={(event) =>
                      setCategoryForm((prev) => ({ ...prev, slug: event.target.value }))
                    }
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                  Descricao (opcional)
                  <Textarea
                    rows={2}
                    className={compactTextareaClassName}
                    placeholder="Descricao (opcional)"
                    value={categoryForm.description}
                    onChange={(event) =>
                      setCategoryForm((prev) => ({ ...prev, description: event.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="flex flex-col gap-2">
                <Button
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
                </Button>
                {editingCategoryId ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetCategoryForm}
                    disabled={busyAction === 'category-save'}
                  >
                    Cancelar
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="grid gap-2">
              {categories.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  Nenhuma categoria cadastrada.
                </div>
              ) : (
                categories.map((item) => (
                  <div key={item.id} className={itemRowClass(editingCategoryId === item.id)}>
                    <div>
                      <p className="text-sm font-bold text-meow-charcoal">{item.name}</p>
                      {item.slug ? <p className="text-xs text-slate-400">{item.slug}</p> : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
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
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
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
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4">
            <div>
              <h2 className="text-sm font-bold text-meow-charcoal">Subcategorias / Jogos</h2>
              <p className="text-xs text-meow-muted">Organize subcategorias por categoria.</p>
            </div>
            <Badge variant="neutral" size="sm">
              {filteredGroups.length} itens
            </Badge>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
              <div className="grid gap-3">
                <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                  Categoria
                  <select
                    className={selectBaseClassName}
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
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                  Nome da subcategoria
                  <Input
                    placeholder="Nome da subcategoria"
                    value={groupForm.name}
                    onChange={(event) =>
                      setGroupForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                  Slug (opcional)
                  <Input
                    placeholder="Slug (opcional)"
                    value={groupForm.slug}
                    onChange={(event) =>
                      setGroupForm((prev) => ({ ...prev, slug: event.target.value }))
                    }
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                  Descricao (opcional)
                  <Textarea
                    rows={2}
                    className={compactTextareaClassName}
                    placeholder="Descricao (opcional)"
                    value={groupForm.description}
                    onChange={(event) =>
                      setGroupForm((prev) => ({ ...prev, description: event.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="flex flex-col gap-2">
                <Button
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
                </Button>
                {editingGroupId ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetGroupForm}
                    disabled={busyAction === 'group-save'}
                  >
                    Cancelar
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
              <span className="font-semibold text-slate-600">Filtrar por categoria:</span>
              <select
                className={filterSelectClassName}
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

            <div className="grid gap-2">
              {filteredGroups.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  Nenhuma subcategoria cadastrada.
                </div>
              ) : (
                filteredGroups.map((item) => (
                  <div key={item.id} className={itemRowClass(editingGroupId === item.id)}>
                    <div>
                      <p className="text-sm font-bold text-meow-charcoal">{item.name}</p>
                      {item.slug ? <p className="text-xs text-slate-400">{item.slug}</p> : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
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
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
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
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4">
            <div>
              <h2 className="text-sm font-bold text-meow-charcoal">Secoes</h2>
              <p className="text-xs text-meow-muted">Defina agrupamentos para os jogos.</p>
            </div>
            <Badge variant="neutral" size="sm">
              {filteredSections.length} itens
            </Badge>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
              <div className="grid gap-3">
                <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                  Subcategoria
                  <select
                    className={selectBaseClassName}
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
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                  Nome da secao
                  <Input
                    placeholder="Nome da secao"
                    value={sectionForm.name}
                    onChange={(event) =>
                      setSectionForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                  Slug (opcional)
                  <Input
                    placeholder="Slug (opcional)"
                    value={sectionForm.slug}
                    onChange={(event) =>
                      setSectionForm((prev) => ({ ...prev, slug: event.target.value }))
                    }
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                  Descricao (opcional)
                  <Textarea
                    rows={2}
                    className={compactTextareaClassName}
                    placeholder="Descricao (opcional)"
                    value={sectionForm.description}
                    onChange={(event) =>
                      setSectionForm((prev) => ({ ...prev, description: event.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="flex flex-col gap-2">
                <Button
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
                </Button>
                {editingSectionId ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetSectionForm}
                    disabled={busyAction === 'section-save'}
                  >
                    Cancelar
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
              <span className="font-semibold text-slate-600">Filtrar por subcategoria:</span>
              <select
                className={filterSelectClassName}
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

            <div className="grid gap-2">
              {filteredSections.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  Nenhuma secao cadastrada.
                </div>
              ) : (
                filteredSections.map((item) => (
                  <div key={item.id} className={itemRowClass(editingSectionId === item.id)}>
                    <div>
                      <p className="text-sm font-bold text-meow-charcoal">{item.name}</p>
                      {item.slug ? <p className="text-xs text-slate-400">{item.slug}</p> : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
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
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
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
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4">
              <h2 className="text-sm font-bold text-meow-charcoal">Tipos de venda</h2>
              <Badge variant="neutral" size="sm">
                {salesModels.length} itens
              </Badge>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid gap-3">
                <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                  Nome do tipo
                  <Input
                    placeholder="Nome do tipo"
                    value={salesModelForm.name}
                    onChange={(event) =>
                      setSalesModelForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                  Slug (opcional)
                  <Input
                    placeholder="Slug (opcional)"
                    value={salesModelForm.slug}
                    onChange={(event) =>
                      setSalesModelForm((prev) => ({ ...prev, slug: event.target.value }))
                    }
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                  Descricao (opcional)
                  <Textarea
                    rows={2}
                    className={compactTextareaClassName}
                    placeholder="Descricao (opcional)"
                    value={salesModelForm.description}
                    onChange={(event) =>
                      setSalesModelForm((prev) => ({ ...prev, description: event.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
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
                </Button>
                {editingSalesModelId ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => resetOptionForm('sales')}
                    disabled={busyAction === 'sales-save'}
                  >
                    Cancelar
                  </Button>
                ) : null}
              </div>
              <div className="grid gap-2">
                {salesModels.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    Nenhum tipo cadastrado.
                  </div>
                ) : (
                  salesModels.map((item) => (
                    <div key={item.id} className={itemRowClass(editingSalesModelId === item.id)}>
                      <div>
                        <p className="text-sm font-bold text-meow-charcoal">{item.name}</p>
                        {item.slug ? <p className="text-xs text-slate-400">{item.slug}</p> : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
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
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
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
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4">
              <h2 className="text-sm font-bold text-meow-charcoal">Procedencias</h2>
              <Badge variant="neutral" size="sm">
                {origins.length} itens
              </Badge>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid gap-3">
                <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                  Nome da procedencia
                  <Input
                    placeholder="Nome da procedencia"
                    value={originForm.name}
                    onChange={(event) =>
                      setOriginForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                  Slug (opcional)
                  <Input
                    placeholder="Slug (opcional)"
                    value={originForm.slug}
                    onChange={(event) =>
                      setOriginForm((prev) => ({ ...prev, slug: event.target.value }))
                    }
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                  Descricao (opcional)
                  <Textarea
                    rows={2}
                    className={compactTextareaClassName}
                    placeholder="Descricao (opcional)"
                    value={originForm.description}
                    onChange={(event) =>
                      setOriginForm((prev) => ({ ...prev, description: event.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
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
                </Button>
                {editingOriginId ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => resetOptionForm('origin')}
                    disabled={busyAction === 'origin-save'}
                  >
                    Cancelar
                  </Button>
                ) : null}
              </div>
              <div className="grid gap-2">
                {origins.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    Nenhuma procedencia cadastrada.
                  </div>
                ) : (
                  origins.map((item) => (
                    <div key={item.id} className={itemRowClass(editingOriginId === item.id)}>
                      <div>
                        <p className="text-sm font-bold text-meow-charcoal">{item.name}</p>
                        {item.slug ? <p className="text-xs text-slate-400">{item.slug}</p> : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
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
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            runAction('origin-delete', async () => {
                              if (!confirm('Remover procedencia?')) {
                                return;
                              }
                              await adminCatalogApi.deleteOrigin(accessToken, item.id);
                              resetOptionForm('origin');
                            })
                          }
                          disabled={busyAction === 'origin-delete'}
                        >
                          Excluir
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4">
              <h2 className="text-sm font-bold text-meow-charcoal">Dados de recuperacao</h2>
              <Badge variant="neutral" size="sm">
                {recoveryOptions.length} itens
              </Badge>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid gap-3">
                <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                  Nome do dado
                  <Input
                    placeholder="Nome do dado"
                    value={recoveryForm.name}
                    onChange={(event) =>
                      setRecoveryForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                  Slug (opcional)
                  <Input
                    placeholder="Slug (opcional)"
                    value={recoveryForm.slug}
                    onChange={(event) =>
                      setRecoveryForm((prev) => ({ ...prev, slug: event.target.value }))
                    }
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                  Descricao (opcional)
                  <Textarea
                    rows={2}
                    className={compactTextareaClassName}
                    placeholder="Descricao (opcional)"
                    value={recoveryForm.description}
                    onChange={(event) =>
                      setRecoveryForm((prev) => ({ ...prev, description: event.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
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
                </Button>
                {editingRecoveryId ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => resetOptionForm('recovery')}
                    disabled={busyAction === 'recovery-save'}
                  >
                    Cancelar
                  </Button>
                ) : null}
              </div>
              <div className="grid gap-2">
                {recoveryOptions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    Nenhum dado cadastrado.
                  </div>
                ) : (
                  recoveryOptions.map((item) => (
                    <div key={item.id} className={itemRowClass(editingRecoveryId === item.id)}>
                      <div>
                        <p className="text-sm font-bold text-meow-charcoal">{item.name}</p>
                        {item.slug ? <p className="text-xs text-slate-400">{item.slug}</p> : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
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
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
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
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AdminShell>
  );
};
