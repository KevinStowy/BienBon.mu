---
name: create-seed
description: Génère des données de seed réalistes pour un module (contexte mauricien)
argument-hint: <module-name>
---

# Create Seed

Génère des données de seed réalistes `$ARGUMENTS` pour le contexte mauricien.

## Contexte mauricien

### Noms et prénoms courants

- Prénoms : Raj, Priya, Kevin, Marie, Jean-Pierre, Aisha, Youssef, Li Wei, Nathalie, Sanjay
- Noms : Doorgakant, Ramsamy, Boolell, Wong, Hossen, Leclerc, Ramgoolam, Ng, Jeetah, Bunwaree

### Adresses

- Villes : Port Louis, Curepipe, Quatre Bornes, Vacoas, Rose Hill, Moka, Beau Bassin, Flacq, Mahébourg
- Format : `12 Rue Royale, Port Louis, Maurice`
- Téléphones : `+230 5XXX XXXX` (mobile), `+230 2XX XXXX` (fixe)

### Types de commerces partenaires

- Boulangerie-pâtisserie
- Restaurant / traiteur
- Supermarché / supérette
- Hôtel-restaurant
- Café / salon de thé
- Fruits & légumes
- Poissonnerie

### Paniers types

- "Panier surprise boulangerie" — pains, viennoiseries, pâtisseries du jour
- "Panier fruits & légumes" — fruits et légumes de saison
- "Panier traiteur" — plats préparés, samoussas, gâteaux piment
- "Panier hôtel" — buffet petit-déjeuner invendu

### Tarification

- Prix original : Rs 200 – Rs 800 (MUR)
- Prix réduit : 30-40% du prix original
- Commission BienBon : 25% du prix réduit

## Pattern de seed

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed<ModuleName>() {
  // Upsert pattern (idempotent)
  for (const item of data) {
    await prisma.<entity>.upsert({
      where: { id: item.id },
      update: item,
      create: item,
    });
  }
}
```

## Conventions

- IDs fixes (UUID déterministes) pour les données de référence
- Upsert pour l'idempotence (relancer le seed sans erreur)
- Données réalistes (pas de "test", "foo", "bar")
- Relations cohérentes (un panier appartient à un commerce existant)
- Données suffisantes pour tester : ~5 commerces, ~15 paniers, ~10 consommateurs, ~20 réservations

## Validation

- [ ] `npx prisma db seed` passe sans erreur
- [ ] Relancer le seed 2x ne produit pas d'erreur (idempotent)
- [ ] Les relations sont cohérentes
- [ ] Les données sont réalistes (contexte mauricien)
