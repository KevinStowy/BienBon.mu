---
name: create-astro-page
description: Crée une page Astro avec SEO + CSP headers
argument-hint: <page-name>
---

# Create Astro Page

Crée une page Astro `$ARGUMENTS` pour le site vitrine bienbon.mu.

## Étape 1 — Créer la page

Fichier : `apps/website/src/pages/<page-name>.astro`

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';

const title = 'Page Title — BienBon.mu';
const description = 'Description SEO de la page (150-160 caractères)';
---

<BaseLayout title={title} description={description}>
  <main class="container mx-auto px-4 py-12">
    <h1 class="text-4xl font-bold text-green-900 mb-8">Titre de la page</h1>

    <section class="prose prose-lg max-w-none">
      <!-- Contenu -->
    </section>
  </main>
</BaseLayout>
```

## Étape 2 — Layout avec SEO

Le `BaseLayout.astro` inclut :

```astro
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title}</title>
  <meta name="description" content={description} />

  <!-- Open Graph -->
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:image" content="/og-image.png" />
  <meta property="og:url" content={`https://bienbon.mu/${Astro.url.pathname}`} />
  <meta property="og:type" content="website" />

  <!-- JSON-LD -->
  <script type="application/ld+json" set:html={JSON.stringify(jsonLd)} />
</head>
```

## Étape 3 — JSON-LD structured data

```typescript
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": title,
  "description": description,
  "publisher": {
    "@type": "Organization",
    "name": "BienBon.mu",
    "logo": "https://bienbon.mu/logo.png",
  },
};
```

## Étape 4 — CSP Headers

Dans `astro.config.mjs`, configurer les headers de sécurité :
```javascript
headers: {
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data: https:; script-src 'self'",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
}
```

## Étape 5 — Performance

- Images optimisées avec `<Image>` d'Astro (WebP, lazy loading)
- Préfetch des liens internes (`<a data-astro-prefetch>`)
- 0 JS côté client (sauf React islands si nécessaire avec `client:visible`)
- Fonts préchargées

## Validation

- [ ] Page rend en HTML statique (0 JS)
- [ ] SEO : title, description, Open Graph, JSON-LD
- [ ] CSP headers configurés
- [ ] Images optimisées
- [ ] Accessible (headings hiérarchiques, alt text)
