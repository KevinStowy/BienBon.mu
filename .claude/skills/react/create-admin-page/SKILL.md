---
name: create-admin-page
description: Crée une page admin avec data table, filtres, actions
argument-hint: <PageName>
---

# Create Admin Page

Crée une page admin `$ARGUMENTS` avec data table, filtres et actions.

## Étape 1 — Créer la route

Fichier : `src/routes/<page-name>.tsx` (TanStack Router file-based)

```typescript
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/<page-name>')({
  component: <PageName>Page,
  beforeLoad: ({ context }) => {
    if (!context.auth.hasRole('ADMIN')) throw redirect({ to: '/unauthorized' });
  },
});
```

## Étape 2 — Créer la page

```typescript
function <PageName>Page() {
  const [filters, setFilters] = useState<<PageName>Filters>(defaultFilters);
  const query = use<PageName>List(filters);

  return (
    <div className="space-y-6">
      <PageHeader
        title="<Page Title>"
        action={<Button onClick={() => navigate({ to: '/<page-name>/new' })}>Ajouter</Button>}
      />

      <<PageName>Filters filters={filters} onChange={setFilters} />

      <DataTable
        columns={columns}
        data={query.data?.items ?? []}
        isLoading={query.isLoading}
        pagination={{
          page: filters.page,
          limit: filters.limit,
          total: query.data?.total ?? 0,
          onChange: (page) => setFilters(f => ({ ...f, page })),
        }}
        onRowClick={(row) => navigate({ to: '/<page-name>/$id', params: { id: row.id } })}
      />
    </div>
  );
}
```

## Étape 3 — Définir les colonnes TanStack Table

```typescript
const columnHelper = createColumnHelper<<EntityType>>();

const columns = [
  columnHelper.accessor('name', { header: 'Nom', cell: (info) => info.getValue() }),
  columnHelper.accessor('status', {
    header: 'Statut',
    cell: (info) => <Badge variant={statusVariant(info.getValue())}>{info.getValue()}</Badge>,
  }),
  columnHelper.accessor('createdAt', {
    header: 'Date',
    cell: (info) => formatDate(info.getValue()),
  }),
  columnHelper.display({
    id: 'actions',
    header: 'Actions',
    cell: (info) => <RowActions row={info.row.original} />,
  }),
];
```

## Étape 4 — Hook TanStack Query

```typescript
function use<PageName>List(filters: <PageName>Filters) {
  return useQuery({
    queryKey: ['<page-name>', filters],
    queryFn: () => api.<pageName>.list(filters),
    placeholderData: keepPreviousData,
  });
}
```

## Étape 5 — Filtres

Composant de filtres avec debounce sur la recherche textuelle, select pour les enums, date range picker pour les dates.

## Validation

- [ ] Route protégée par rôle ADMIN
- [ ] Data table avec tri, pagination, filtres
- [ ] Actions par ligne (voir, éditer, supprimer)
- [ ] Loading/error states
- [ ] Responsive (mobile + desktop)
