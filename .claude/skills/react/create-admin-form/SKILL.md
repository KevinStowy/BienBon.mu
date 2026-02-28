---
name: create-admin-form
description: Crée un formulaire admin avec react-hook-form + zod
argument-hint: <FormName>
---

# Create Admin Form

Crée un formulaire admin `$ARGUMENTS` avec react-hook-form et validation zod.

## Étape 1 — Schéma de validation Zod

Fichier : `src/features/<feature>/schemas/<form-name>.schema.ts`

```typescript
import { z } from 'zod';

export const <formName>Schema = z.object({
  name: z.string().min(1, 'Ce champ est obligatoire').max(100),
  email: z.string().email('Email invalide'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
  // ...
});

export type <FormName>FormData = z.infer<typeof <formName>Schema>;
```

## Étape 2 — Composant formulaire

Fichier : `src/features/<feature>/components/<FormName>Form.tsx`

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

interface <FormName>FormProps {
  defaultValues?: Partial<<FormName>FormData>;
  onSubmit: (data: <FormName>FormData) => Promise<void>;
  isEdit?: boolean;
}

export function <FormName>Form({ defaultValues, onSubmit, isEdit }: <FormName>FormProps) {
  const form = useForm<<FormName>FormData>({
    resolver: zodResolver(<formName>Schema),
    defaultValues,
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <FormField
        label="Nom"
        error={form.formState.errors.name?.message}
      >
        <Input {...form.register('name')} aria-describedby="name-error" />
      </FormField>

      <FormField
        label="Email"
        error={form.formState.errors.email?.message}
      >
        <Input {...form.register('email')} type="email" />
      </FormField>

      <div className="flex justify-end gap-3">
        <Button variant="secondary" type="button" onClick={() => history.back()}>
          Annuler
        </Button>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Enregistrement...' : isEdit ? 'Modifier' : 'Créer'}
        </Button>
      </div>
    </form>
  );
}
```

## Étape 3 — Mutation TanStack Query

```typescript
function useCreate<Entity>() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: <FormName>FormData) => api.<entity>.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['<entities>'] });
      toast.success('Créé avec succès');
      navigate({ to: '/<entities>' });
    },
    onError: (error) => toast.error(error.message),
  });
}
```

## Étape 4 — Accessibilité

- `<label>` associé à chaque input via `htmlFor`
- Messages d'erreur liés via `aria-describedby`
- Focus automatique sur le premier champ en erreur
- Bouton submit désactivé pendant la soumission

## Validation

- [ ] Validation Zod côté client
- [ ] Messages d'erreur en français
- [ ] Loading state sur le submit
- [ ] a11y : labels, aria-describedby, focus
- [ ] Mutation TanStack Query avec invalidation du cache
