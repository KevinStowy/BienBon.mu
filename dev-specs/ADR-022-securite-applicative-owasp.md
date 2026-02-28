# ADR-022 : Securite applicative -- OWASP Top 10 et hardening

| Champ         | Valeur                                                      |
|---------------|-------------------------------------------------------------|
| **Statut**    | Propose                                                     |
| **Date**      | 2026-02-27                                                  |
| **Auteur**    | Kevin (assiste par Claude Opus 4.6)                         |
| **Decideurs** | Equipe technique BienBon                                    |
| **Scope**     | Securite applicative, OWASP Top 10, hardening, headers, rate limiting, secrets, risques IA |
| **Prereqs**   | ADR-001 (stack backend), ADR-004 (API REST), ADR-006 (PCI DSS), ADR-010 (auth), ADR-011 (RBAC), ADR-019 (fraude), ADR-020 (infra), ADR-021 (DPA) |
| **Refs**      | US-T001, OWASP Top 10 2021, OWASP Top 10 2025              |

---

## 1. Contexte

### 1.1 Pourquoi cette ADR est necessaire

Les ADR precedentes ont couvert des aspects de securite par domaine :

| ADR | Domaine de securite couvert | Ce qui reste a couvrir |
|-----|---------------------------|----------------------|
| ADR-006 | PCI DSS SAQ-A, tokenisation, filtre de logs paiement | -- |
| ADR-010 | Auth multi-provider, JWT, rate limiting auth endpoints | Brute force avancee, credential stuffing |
| ADR-011 | RBAC, guards NestJS, RLS Supabase | IDOR, horizontal privilege escalation |
| ADR-019 | Detection de fraude, suspension automatique | -- |
| ADR-020 | Railway, Cloudflare, Supabase infra | Headers securite, WAF config |
| ADR-021 | Data Protection Act, anonymisation, chiffrement | -- |

**Ce qui manque -- et que cette ADR couvre :**

1. **OWASP Top 10** -- mapping systematique sur la stack BienBon (NestJS + Prisma + Supabase + Flutter + React)
2. **Input validation** -- strategie unifiee (class-validator vs Zod, validation client + serveur)
3. **Rate limiting** -- strategie globale au-dela des endpoints d'auth
4. **Headers de securite** -- configuration complete Helmet + Cloudflare
5. **Secrets management** -- politique de stockage, rotation, detection
6. **Risques specifiques au code genere par IA** -- slopsquatting, patterns insecures, secrets hardcodes

### 1.2 Contrainte majeure : code 100% genere par IA

Tout le code de BienBon sera genere par des agents IA (Claude Code). C'est une contrainte de securite sans precedent.

**Chiffres cles (recherche 2025-2026) :**
- 62% du code genere par IA contient des failles de design ou des vulnerabilites connues (CSA, 2025)
- Le code IA contient 2,74x plus de vulnerabilites que le code humain (Veracode GenAI Code Security Report, 2025)
- 86% des echantillons de code IA echouent a se defendre contre le XSS (CWE-80)
- 88% sont vulnerables aux attaques par injection de logs (CWE-117)
- 20% des packages recommandes par les LLM n'existent pas ("slopsquatting")
- Les modeles ne s'ameliorent pas en securite meme en augmentant leur taille

> **Consequence architecturale** : chaque pattern de securite de cette ADR doit etre automatiquement verifiable (lint rules, CI checks, tests) plutot que reposer sur la vigilance humaine seule.

---

## 2. OWASP Top 10 2021 -- mapping complet sur la stack BienBon

> **Note sur OWASP 2025** : l'OWASP Top 10 2025 a ete publie avec des changements significatifs (Supply Chain Failures en A03, Mishandling of Exceptional Conditions en A10). Cette ADR utilise la version 2021 comme reference principale -- conformement a la demande -- mais integre les evolutions 2025 quand pertinent.

### 2.1 Tableau de synthese

| # | Categorie OWASP 2021 | Risque BienBon | Niveau | Mitigation principale | ADR ref |
|---|-----------------------|---------------|--------|----------------------|---------|
| A01 | Broken Access Control | IDOR sur reservations, paniers, profils | **Critique** | Ownership guards NestJS + RLS Supabase | ADR-011, **cette ADR** |
| A02 | Cryptographic Failures | Fuite de tokens, donnees sensibles non chiffrees | Eleve | TLS 1.3, bcrypt, chiffrement at rest, rotation cles | ADR-006, ADR-021 |
| A03 | Injection | SQL injection via `$queryRaw` (PostGIS), XSS | Eleve | Prisma parametrise, CSP, React/Flutter echappement | **cette ADR** |
| A04 | Insecure Design | Business logic bypass (prix, stock, transitions) | Eleve | State machines (ADR-017), validation DTO, rate limiting | ADR-017, **cette ADR** |
| A05 | Security Misconfiguration | CORS `*`, headers manquants, RLS desactive | Eleve | Helmet, CORS strict, checklist config | **cette ADR** |
| A06 | Vulnerable Components | Packages hallucines par IA, deps obsoletes | **Critique** | Lockfile verification, npm audit, Dependabot | **cette ADR** |
| A07 | Auth Failures | Brute force, credential stuffing, session fixation | Eleve | Supabase Auth + throttler + CAPTCHA | ADR-010, **cette ADR** |
| A08 | Software/Data Integrity | CI/CD compromise, deps malveillantes | Eleve | Lockfile integrity, SRI, signatures builds | **cette ADR** |
| A09 | Logging/Monitoring Failures | Incidents non detectes, logs insuffisants | Moyen | Structured logging JSON, alertes Sentry/Grafana | ADR-020, **cette ADR** |
| A10 | SSRF | Upload d'images URL externe, webhooks Peach | Moyen | Validation URL, whitelist IP, signature webhook | **cette ADR** |

---

### 2.2 A01 -- Broken Access Control

**Au-dela du RBAC (ADR-011) : prevention des IDOR**

Un IDOR (Insecure Direct Object Reference) se produit quand un utilisateur peut acceder a une ressource en modifiant un identifiant dans la requete (ex: changer `reservationId` dans l'URL).

**Scenarios BienBon concrets :**

| Scenario | Risque | Endpoint exemple |
|----------|--------|-----------------|
| Consommateur consulte la reservation d'un autre | Fuite de donnees personnelles | `GET /api/v1/reservations/:id` |
| Consommateur annule la reservation d'un autre | Perte financiere partenaire | `DELETE /api/v1/reservations/:id` |
| Partenaire consulte les analytics d'un autre commerce | Espionnage commercial | `GET /api/v1/partner/stores/:id/analytics` |
| Consommateur modifie le profil d'un autre | Usurpation d'identite | `PATCH /api/v1/consumer/profiles/:id` |

**Pattern d'implementation : Ownership Guard NestJS**

Chaque endpoint qui retourne ou modifie une ressource identifiee par un ID doit verifier que l'utilisateur authentifie est le proprietaire de cette ressource (ou un admin).

```typescript
// src/common/guards/ownership.guard.ts

import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Guard generique de verification de propriete.
 * Utilise avec le decorateur @CheckOwnership('reservation', 'consumerId')
 *
 * Logique :
 * 1. Charge la ressource depuis la base via le service injecte
 * 2. Compare le champ de propriete (ex: consumerId) avec l'utilisateur authentifie (req.user.id)
 * 3. Les admins bypass cette verification (role 'admin')
 * 4. Leve ForbiddenException si non-proprietaire
 */
@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Les admins ont acces a toutes les ressources
    if (user.roles?.includes('admin')) return true;

    const metadata = this.reflector.get<OwnershipMetadata>('ownership', context.getHandler());
    if (!metadata) return true; // Pas de contrainte de propriete

    const resourceId = request.params[metadata.paramName || 'id'];
    const resource = await metadata.service.findById(resourceId);

    if (!resource) return true; // Le controller gerera le 404

    if (resource[metadata.ownerField] !== user.id) {
      throw new ForbiddenException('Vous ne pouvez pas acceder a cette ressource');
    }

    return true;
  }
}
```

**Double protection : RLS Supabase**

Meme si le guard NestJS est oublie (risque avec du code IA), le RLS PostgreSQL constitue une deuxieme barriere :

```sql
-- Policy RLS : un consommateur ne voit que SES reservations
CREATE POLICY "consumer_own_reservations" ON reservations
  FOR ALL
  USING (consumer_id = auth.uid() OR is_admin(auth.jwt()));

-- Policy RLS : un partenaire ne voit que les reservations de SES commerces
CREATE POLICY "partner_own_store_reservations" ON reservations
  FOR SELECT
  USING (
    store_id IN (
      SELECT id FROM stores WHERE partner_id = auth.uid()
    )
    OR is_admin(auth.jwt())
  );
```

**Regle pour les agents IA :**

> **REGLE-SEC-001** : Tout endpoint avec un parametre `:id` dans la route DOIT avoir un guard de propriete OU une policy RLS. L'absence des deux est un defaut de securite bloquant en revue de code.

**Prevention du horizontal privilege escalation :**

| Vecteur | Mitigation |
|---------|-----------|
| Modification de l'ID dans l'URL | Ownership guard + RLS |
| Modification de l'ID dans le body | Ignorer `consumerId`/`partnerId` dans le body ; toujours utiliser `req.user.id` |
| Modification du `storeId` dans le body | Verifier que le `storeId` appartient au partenaire authentifie |
| Enumeration sequentielle d'IDs | UUIDs v4 (non sequentiels, non predictibles) -- deja impose par ADR-003 |

---

### 2.3 A02 -- Cryptographic Failures

**Couvert principalement par ADR-006, ADR-010 et ADR-021. Completements ici :**

| Donnee | Chiffrement at rest | Chiffrement in transit | Hashing |
|--------|:------------------:|:---------------------:|:-------:|
| Mots de passe | -- | TLS 1.3 | bcrypt (Supabase Auth, cout 10) |
| Tokens JWT | AES-256 (Supabase AWS) | TLS 1.3 | -- |
| QR code payload reservation | AES-256-GCM (chiffrement applicatif) | TLS 1.3 | HMAC-SHA256 pour integrite (voir spec ci-dessous) |
| Documents partenaires (BRN, Food License) | AES-256 (Supabase Storage, AWS) | TLS 1.3 | -- |

**Specification du chiffrement du QR code de retrait :**

Le QR code affiche par le consommateur lors du retrait contient un payload chiffre qui sert de preuve d'achat. Le partenaire scanne ce QR code pour valider le retrait.

**Format du payload QR :**

```
QR_PAYLOAD = Base64URL(ENCRYPTED_DATA || HMAC)

Ou :
  ENCRYPTED_DATA = AES-256-GCM(key=QR_ENCRYPTION_KEY, plaintext=JSON_PAYLOAD, iv=random_12_bytes)
  JSON_PAYLOAD   = {"order_id": "res_xyz", "pin": "8423", "ts": 1709042400, "exp": 1709046900}
  HMAC           = HMAC-SHA256(key=QR_HMAC_KEY, data=ENCRYPTED_DATA)
```

**Champs du payload :**

| Champ | Type | Description |
|-------|------|-------------|
| `order_id` | string | Identifiant unique de la reservation (UUID) |
| `pin` | string | Code PIN a 4 chiffres genere aleatoirement a la confirmation de reservation |
| `ts` | number | Timestamp Unix de generation du QR code |
| `exp` | number | Timestamp Unix d'expiration = fin de la fenetre de retrait + 15 minutes de grace |

**Regles de validite :**

- Le QR code est valide uniquement pendant la **fenetre de retrait du panier + 15 minutes de grace**. Exemple : si le retrait est prevu entre 17h00 et 18h00, le QR expire a 18h15.
- Le PIN a 4 chiffres est une securite supplementaire : le partenaire peut le demander oralement si le scan echoue (verification manuelle).
- Le QR code est regenere a chaque affichage par l'app Flutter (pas de persistence sur le filesystem -- cf. Annexe D.1).
- Les cles `QR_ENCRYPTION_KEY` et `QR_HMAC_KEY` sont des secrets distincts stockes dans Railway env vars, differents de toutes les autres cles du systeme.

**Verification cote partenaire (scan) :**

```typescript
// src/pickup/qr-verification.service.ts

@Injectable()
export class QrVerificationService {
  async verifyQrCode(qrPayload: string): Promise<PickupVerification> {
    // 1. Decoder le Base64URL
    const buffer = Buffer.from(qrPayload, 'base64url');
    const encryptedData = buffer.slice(0, -32); // Tout sauf les 32 derniers octets (HMAC)
    const receivedHmac = buffer.slice(-32);

    // 2. Verifier le HMAC (integrite)
    const expectedHmac = crypto
      .createHmac('sha256', process.env.QR_HMAC_KEY)
      .update(encryptedData)
      .digest();
    if (!crypto.timingSafeEqual(receivedHmac, expectedHmac)) {
      throw new BadRequestException('QR code invalide (integrite)');
    }

    // 3. Dechiffrer le payload (AES-256-GCM)
    const iv = encryptedData.slice(0, 12);
    const authTag = encryptedData.slice(-16);
    const ciphertext = encryptedData.slice(12, -16);
    const decipher = crypto.createDecipheriv('aes-256-gcm', process.env.QR_ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const payload = JSON.parse(plaintext.toString('utf8'));

    // 4. Verifier l'expiration
    if (Date.now() / 1000 > payload.exp) {
      throw new BadRequestException('QR code expire');
    }

    // 5. Verifier que la reservation existe et est en statut CONFIRMED
    const reservation = await this.reservationService.findById(payload.order_id);
    if (!reservation || reservation.status !== 'CONFIRMED') {
      throw new BadRequestException('Reservation non trouvee ou statut invalide');
    }

    return { reservation, pin: payload.pin };
  }
}
```
| Donnees de carte | Hors perimetre BienBon (Peach Payments) | TLS 1.3 | -- |
| Cles API (Peach, Resend, Twilio) | Variables d'env Railway (chiffrees) | TLS 1.3 | -- |
| Tokens de paiement (`registrationId`) | AES-256 (Supabase AWS) | TLS 1.3 | -- |

**Gestion des cles et rotation :**

| Cle/Secret | Stockage | Rotation | Responsable |
|-----------|---------|---------|-------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Railway env vars | A chaque regeneration Supabase | Tech lead |
| `SUPABASE_ANON_KEY` | Railway env vars + apps Flutter | Non rotatif (cle publique) | -- |
| `PEACH_API_KEY` | Railway env vars | Annuelle ou sur suspicion de compromission | Tech lead |
| `RESEND_API_KEY` | Railway env vars | Annuelle | Tech lead |
| `TWILIO_AUTH_TOKEN` | Railway env vars | Annuelle | Tech lead |
| `JWT_SECRET` (Supabase Auth) | Gere par Supabase | Non rotatif (Supabase manage) | Supabase |
| `FCM_SERVICE_ACCOUNT` | Railway env vars (JSON) | Annuelle ou sur suspicion | Tech lead |

**TLS : configuration minimale**

- TLS 1.2 minimum partout (Cloudflare enforce)
- TLS 1.3 prefere (Cloudflare active par defaut)
- Cipher suites : gere par Cloudflare (AEAD only : AES-256-GCM, ChaCha20-Poly1305)
- Certificate Transparency : active via Cloudflare
- HSTS : `max-age=31536000; includeSubDomains; preload`

---

### 2.4 A03 -- Injection

**SQL Injection :**

Prisma parametrise toutes les requetes par defaut. Le risque residuel vient de `$queryRaw` et `$executeRaw`, necessaires pour les requetes PostGIS (geolocalisation).

```typescript
// INTERDIT -- concatenation de string SQL
const stores = await prisma.$queryRaw`
  SELECT * FROM stores WHERE ST_DWithin(
    location, ST_MakePoint(${lng}, ${lat})::geography, ${radius}
  )
`;
// NOTE : les template literals de $queryRaw sont parametrises automatiquement
// par Prisma. Le code ci-dessus est en fait SECURISE.

// VRAIMENT INTERDIT -- Prisma.sql() avec concatenation manuelle
const query = `SELECT * FROM stores WHERE name = '${userInput}'`; // VULNERABLE
const stores = await prisma.$queryRawUnsafe(query); // JAMAIS
```

**Regle pour les agents IA :**

> **REGLE-SEC-002** : L'utilisation de `$queryRawUnsafe` et `$executeRawUnsafe` est **interdite**. Si un agent IA genere du code avec ces methodes, c'est un defaut bloquant. Utiliser `$queryRaw` avec des tagged template literals (parametrisation automatique Prisma).

**Lint rule ESLint :**

```javascript
// eslint.config.mjs -- regle custom
{
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: "CallExpression[callee.property.name='$queryRawUnsafe']",
        message: 'SECURITE: $queryRawUnsafe est interdit. Utiliser $queryRaw avec template literals.'
      },
      {
        selector: "CallExpression[callee.property.name='$executeRawUnsafe']",
        message: 'SECURITE: $executeRawUnsafe est interdit. Utiliser $executeRaw avec template literals.'
      },
      {
        selector: "CallExpression[callee.name='eval']",
        message: 'SECURITE: eval() est interdit.'
      },
      {
        selector: "MemberExpression[property.name='innerHTML']",
        message: 'SECURITE: innerHTML est interdit. Utiliser textContent ou le rendu React.'
      }
    ]
  }
}
```

**XSS (Cross-Site Scripting) :**

| Client | Protection native | Risque residuel | Mitigation supplementaire |
|--------|-------------------|----------------|--------------------------|
| React (admin) | JSX echappe par defaut | `dangerouslySetInnerHTML` | Lint rule interdisant `dangerouslySetInnerHTML`. CSP strict. |
| Flutter (mobile) | Pas de DOM, pas de XSS classique | WebView pour paiement | WebView sandboxee, CSP sur les pages web chargees |
| Site vitrine | Depends du framework | Contenu dynamique | CSP strict, echappement serveur |

**Command Injection :**

> **REGLE-SEC-003** : Aucun appel a `child_process.exec()`, `child_process.execSync()`, ou `require('child_process')` dans le code backend. Tous les traitements sont effectues via des librairies Node.js natives ou des services managees (Supabase Storage pour les images, Resend pour les emails).

**Template Injection :**

React et Flutter echappent par defaut. Les emails sont generes via React Email (JSX, echappement automatique). Aucun moteur de template cote serveur (pas de Handlebars, EJS, Pug).

---

### 2.5 A04 -- Insecure Design

**Business logic flaws specifiques BienBon :**

| Scenario d'attaque | Impact | Mitigation |
|-------------------|--------|-----------|
| Modifier le prix d'un panier via l'API | Perte financiere | Le prix est calcule cote serveur uniquement. Le DTO de reservation ne contient PAS de champ `price`. |
| Reserver plus que le stock disponible | Surreservation | Verrouillage optimiste + decrementation atomique (ADR-008) : `UPDATE baskets SET available_quantity = available_quantity - 1 WHERE id = $1 AND available_quantity > 0` |
| Contourner les transitions d'etat (ex: passer de NO_SHOW a PICKED_UP) | Fraude au remboursement | State machines avec gardes (ADR-017). Seules les transitions definies sont possibles. |
| Exploiter le programme de parrainage avec de faux comptes | Gain abusif de credits | Device fingerprinting (ADR-019), limite de parrainages, verification telephone unique |
| Modifier les horaires de retrait pour une reservation existante | Confusion, no-show | Les horaires sont lies au panier (immutables apres reservation). Pas de champ `pickupTime` dans le DTO de modification. |
| Appeler l'endpoint de capture de paiement directement | Double facturation | La capture est un effet de bord de la transition d'etat CONFIRMED -> PICKED_UP. Pas d'endpoint API direct de capture. |

**Rate limiting global (au-dela de l'auth)** -- voir section 4.

**Validation des invariants metier :**

```typescript
// Exemple : guard de transition qui valide les invariants
@Injectable()
export class ReservationTransitionGuard {
  /**
   * Verifie que la transition demandee est valide
   * ET que les preconditions metier sont remplies.
   */
  async validateTransition(
    reservation: Reservation,
    targetState: ReservationState,
    actor: User,
  ): Promise<void> {
    // 1. La transition est-elle definie dans la state machine ?
    const allowed = STATE_MACHINE.transitions[reservation.status]?.[targetState];
    if (!allowed) {
      throw new BadRequestException(
        `Transition ${reservation.status} -> ${targetState} non autorisee`
      );
    }

    // 2. L'acteur a-t-il le droit d'effectuer cette transition ?
    if (allowed.actor !== actor.role && actor.role !== 'admin') {
      throw new ForbiddenException('Non autorise pour cette transition');
    }

    // 3. Les preconditions metier sont-elles remplies ?
    for (const guard of allowed.guards) {
      await guard(reservation, actor);
    }
  }
}
```

---

### 2.6 A05 -- Security Misconfiguration

**Voir section 5 (Headers de securite) pour la configuration complete.**

**Points critiques de misconfiguration BienBon :**

| Element | Configuration securisee | Configuration dangereuse (a detecter) |
|---------|------------------------|--------------------------------------|
| CORS | `origin: ['https://admin.bienbon.mu', 'https://bienbon.mu']` | `origin: '*'` ou `origin: true` |
| RLS Supabase | Active sur toutes les tables, policies definies | `ALTER TABLE ... DISABLE ROW LEVEL SECURITY` |
| Swagger UI | Desactive en production | Accessible sans auth en prod |
| Headers | Helmet active, CSP defini | X-Powered-By expose, pas de CSP |
| Debug mode | `NODE_ENV=production`, pas de stack traces | Stack traces dans les reponses API |
| Supabase anon key | Utilise cote client, pouvoirs limites au RLS | `service_role` key exposee cote client |
| Database | Connexion SSL obligatoire | Connexion sans SSL |

**Regle pour les agents IA :**

> **REGLE-SEC-004** : Toute configuration contenant `*` comme valeur d'origin CORS, `DISABLE ROW LEVEL SECURITY`, ou l'exposition de la `service_role` key en dehors du backend est un defaut de securite bloquant.

**Desactiver les fuites d'information :**

```typescript
// main.ts -- configuration NestJS production
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Desactiver X-Powered-By (fuite Express/Fastify)
  // Helmet le fait automatiquement
  app.use(helmet());

  // Desactiver le header Server (Fastify)
  // Fastify ne l'ajoute pas par defaut, mais verifier

  // Error filter : ne jamais retourner de stack trace en production
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger : uniquement en dev
  if (process.env.NODE_ENV !== 'production') {
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }
}
```

**Cloudflare WAF (free tier) :**

Le free tier Cloudflare inclut le "Cloudflare Free Managed Ruleset" qui protege contre les vulnerabilites les plus critiques. Pour BienBon au lancement, c'est suffisant. Regles supplementaires a configurer :

| Regle Cloudflare | Configuration |
|-----------------|---------------|
| SSL/TLS mode | Full (Strict) |
| Always Use HTTPS | Active |
| Minimum TLS Version | TLS 1.2 |
| Automatic HTTPS Rewrites | Active |
| Browser Integrity Check | Active |
| Hotlink Protection | Active |
| Email Address Obfuscation | Active |
| Free Managed Ruleset | Active (par defaut) |

> **Upgrade recommandee (post-lancement)** : Cloudflare Pro (20 $/mois) pour acceder a l'OWASP Core Ruleset complet et au Leaked Credential Check. A evaluer quand le trafic depasse 10 000 utilisateurs actifs.

---

### 2.7 A06 -- Vulnerable and Outdated Components

**Categorie la plus critique pour BienBon en raison du code 100% IA.**

**Risque #1 : Slopsquatting (packages hallucines)**

Le slopsquatting est une evolution du typosquatting causee par les LLM. L'IA recommande un package qui n'existe pas (ex: `nestjs-prisma-guard`), un attaquant l'enregistre sur npm/pub.dev avec du code malveillant, et un autre developpeur (ou le meme agent IA) l'installe.

**Chiffres** :
- 20% des packages recommandes par les LLM n'existent pas
- 43% des noms hallucines sont repetes de facon coherente d'une session a l'autre
- En novembre 2025, une vague de packages npm compromis a vole des tokens GitHub et des credentials CI/CD

**Mitigations :**

| Mesure | Implementation | Quand |
|--------|---------------|-------|
| **Verification manuelle de chaque nouvelle dependance** | Avant `npm install` ou `flutter pub add`, verifier : (1) le package existe sur npmjs.com / pub.dev, (2) il a >100 etoiles GitHub ou >1000 telechargements/semaine, (3) il est maintenu (dernier commit < 6 mois) | Chaque ajout |
| **Lockfile integrity** | `package-lock.json` et `pubspec.lock` commites dans le repo. CI verifie que `npm ci` (pas `npm install`) est utilise. | CI |
| **npm audit / flutter pub outdated** | Execute en CI sur chaque PR. Les vulnerabilites CVSS >= 7.0 (High) sont bloquantes. | CI |
| **Dependabot / Renovate** | Active sur le repo GitHub. PRs automatiques pour les mises a jour de securite. | Continu |
| **Allowlist de packages** | Maintenir un fichier `.allowed-packages.json` listant les packages autorises. Un pre-commit hook verifie que `package.json` n'introduit pas de package hors-liste sans approbation explicite. | Pre-commit + CI |
| **Socket.dev** | Service de detection de packages npm malveillants. Integration GitHub App gratuite pour les repos publics. Alternative : `npm audit signatures`. | CI |

**Script de verification des nouvelles dependances :**

```bash
#!/bin/bash
# scripts/verify-new-deps.sh
# Compare package.json avec la version precedente et verifie chaque nouveau package

NEW_DEPS=$(diff <(git show HEAD~1:package.json | jq -r '.dependencies // {} | keys[]') \
               <(jq -r '.dependencies // {} | keys[]' package.json) \
           | grep '^>' | sed 's/^> //')

for pkg in $NEW_DEPS; do
  echo "Verification de $pkg..."

  # Verifier que le package existe sur npm
  npm view "$pkg" version 2>/dev/null
  if [ $? -ne 0 ]; then
    echo "ERREUR: Le package '$pkg' n'existe pas sur npm. Possible slopsquatting!"
    exit 1
  fi

  # Verifier le nombre de telechargements hebdomadaires
  DOWNLOADS=$(curl -s "https://api.npmjs.org/downloads/point/last-week/$pkg" | jq '.downloads')
  if [ "$DOWNLOADS" -lt 100 ]; then
    echo "ATTENTION: '$pkg' a seulement $DOWNLOADS telechargements/semaine. Verifier manuellement."
  fi

  echo "OK: $pkg ($DOWNLOADS downloads/week)"
done
```

**Risque #2 : Dependances obsoletes**

| Outil | Portee | Frequence | Seuil bloquant |
|-------|--------|-----------|----------------|
| `npm audit` | Dependencies npm | Chaque CI run | CVSS >= 7.0 (High) |
| `flutter pub outdated` | Dependencies Dart/Flutter | Hebdomadaire | Majeures en retard > 2 versions |
| Dependabot | npm + Dart | Continu | PRs automatiques, merge dans les 7 jours |
| Snyk (optionnel) | npm + Docker | Continu | Alternative a npm audit, meilleure base de donnees CVE |

---

### 2.8 A07 -- Identification and Authentication Failures

**Couvert principalement par ADR-010. Completements ici :**

| Vecteur d'attaque | Mitigation ADR-010 | Mitigation supplementaire (cette ADR) |
|-------------------|-------------------|--------------------------------------|
| Brute force login | 5 tentatives, lockout 15 min | Cloudflare rate limiting (1re ligne), CAPTCHA (hCaptcha/Turnstile) apres 3 echecs |
| Credential stuffing | Rate limiting par IP | Cloudflare Bot Management (free tier : Browser Integrity Check). Supabase Auth detecte les patterns de credential stuffing. |
| Session fixation | JWT (pas de session server-side) | Le JWT est genere apres auth, pas avant. Pas de session ID reutilisable. |
| Token leakage | Refresh token rotation | `flutter_secure_storage` (Keychain/Keystore). Jamais de token dans les logs (filtre PCI ADR-006 etendu aux JWT). |
| Password spraying | Account lockout | Rate limiting par IP (pas seulement par compte). Alerte Sentry si > 50 echecs d'auth/minute globaux. |

**Configuration CAPTCHA (Cloudflare Turnstile) :**

Supabase Auth supporte nativement Cloudflare Turnstile. Configuration :

```
# Supabase Dashboard > Authentication > Security
CAPTCHA_ENABLED = true
CAPTCHA_PROVIDER = turnstile
TURNSTILE_SECRET_KEY = 0x... (variable Railway)
```

Le CAPTCHA est affiche :
- Apres 3 tentatives de login echouees
- A chaque inscription (anti-bot)
- Au password reset (anti-enumeration d'emails)

---

### 2.9 A08 -- Software and Data Integrity Failures

**CI/CD Pipeline Integrity :**

| Mesure | Implementation |
|--------|---------------|
| Branch protection | `main` protege : PR obligatoire, 1 review minimum, CI verte obligatoire |
| Signed commits | Recommande (GPG ou SSH) mais non bloquant au lancement |
| CI environment | GitHub Actions, runners heberges par GitHub. Pas de self-hosted runners (risque de compromission). |
| Secrets CI | GitHub Secrets (chiffres, jamais visibles dans les logs) |
| Lockfile CI | `npm ci` (pas `npm install`) pour garantir la reproductibilite |

**Signature des builds Flutter :**

| Plateforme | Mecanisme | Stockage cle |
|-----------|-----------|-------------|
| Android | App Signing by Google Play (cle upload + cle de signature geree par Google) | Google Play Console (HSM Google) |
| iOS | Apple Code Signing (certificat + provisioning profile) | Apple Developer Portal + Keychain CI |

> **Regle** : les cles de signature ne doivent JAMAIS etre commitees dans le repo. Elles sont stockees dans les secrets CI (GitHub Secrets) ou dans le service de signature du store.

**Subresource Integrity (SRI) pour l'admin React :**

Tout script externe charge par l'admin React doit avoir un hash SRI :

```html
<script
  src="https://cdn.example.com/lib.min.js"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8w"
  crossorigin="anonymous"
></script>
```

> Note : ceci est particulierement important pour le widget COPYandPAY de Peach Payments charge dans la WebView (cf. ADR-006 section 7).

---

### 2.10 A09 -- Security Logging and Monitoring Failures

**Evenements de securite a logger obligatoirement :**

| Evenement | Niveau | Donnees loggees | Alerte |
|-----------|--------|----------------|--------|
| Login echoue | WARN | `userId` (si connu), IP, user-agent, raison | Sentry si > 10/min pour un meme user |
| Login reussi | INFO | `userId`, IP, methode d'auth, user-agent | -- |
| Tentative d'acces refuse (403) | WARN | `userId`, endpoint, IP, raison du refus | Sentry si > 5/min pour un meme user |
| Rate limit atteint (429) | WARN | IP, endpoint, limite atteinte | Grafana dashboard |
| Changement de role | INFO | `userId`, ancien role, nouveau role, `adminId` qui a modifie | Toujours |
| Suppression de compte | INFO | `userId`, methode (self-service ou admin), date | Toujours |
| Echec de paiement | WARN | `userId`, `transactionId` (tronque), code erreur Peach | Sentry si > 5 echecs consecutifs |
| Modification RLS / politique | CRITICAL | `adminId`, table, ancienne policy, nouvelle policy | Alerte immediate Slack |
| Webhook Peach invalide (signature incorrecte) | ERROR | IP source, payload (sans donnees sensibles), signature recue | Alerte immediate Sentry |
| Suspension automatique (fraude) | WARN | `userId`, regle declenchee, compteurs | Alerte Slack + notification admin |

**Format de log structure (JSON) :**

```typescript
// src/common/logger/security-logger.service.ts

@Injectable()
export class SecurityLogger {
  private readonly logger = new Logger('SECURITY');

  logSecurityEvent(event: SecurityEvent): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: event.level,
      category: 'SECURITY',
      event: event.type,
      userId: event.userId || null,
      ip: event.ip,
      userAgent: event.userAgent,
      endpoint: event.endpoint,
      details: event.details,
      // JAMAIS de donnees sensibles (mots de passe, tokens, PAN)
    };

    this.logger[event.level.toLowerCase()](JSON.stringify(logEntry));

    // Sentry pour les evenements critiques
    if (['ERROR', 'CRITICAL'].includes(event.level)) {
      Sentry.captureEvent({
        message: `Security: ${event.type}`,
        level: event.level === 'CRITICAL' ? 'fatal' : 'error',
        extra: logEntry,
      });
    }
  }
}
```

**Integration monitoring (ADR-020) :**

| Outil | Usage securite | Cout |
|-------|---------------|------|
| **Sentry** | Alertes en temps reel sur les erreurs et evenements de securite critiques | Free tier (5K events/mois) |
| **Grafana Cloud** | Dashboards de securite (rate limit hits, echecs auth, patterns suspects) | Free tier (50 GB logs/mois) |
| **Railway Logs** | Logs applicatifs bruts, retention 7 jours | Inclus |
| **Supabase Logs** | Logs DB, auth, storage | Inclus (retention 1 jour free, 7 jours pro) |

**Dashboard de securite Grafana recommande :**

- Failed logins / hour (graphe)
- 403 responses / hour par endpoint (graphe)
- Rate limit hits / hour par IP (top 10)
- Active user sessions count (gauge)
- Fraud alerts / day (compteur)
- Webhook validation failures (compteur)

---

### 2.11 A10 -- Server-Side Request Forgery (SSRF)

**Vecteurs SSRF dans BienBon :**

| Vecteur | Description | Mitigation |
|---------|-------------|-----------|
| Upload d'images partenaire | Si on permet un upload par URL (ex: "entrez l'URL de votre logo"), le serveur telechargerait l'URL -- potentiellement une URL interne (`http://169.254.169.254/` pour voler les metadata AWS). | **Ne pas implementer d'upload par URL.** Upload de fichiers uniquement (multipart/form-data). Les fichiers sont envoyes directement a Supabase Storage. |
| Webhooks Peach Payments | Peach envoie des webhooks a l'URL de callback BienBon. Un attaquant pourrait envoyer de faux webhooks. | Verifier la signature HMAC de chaque webhook (cf. ADR-005). Optionnel : whitelist des IPs Peach Payments. |
| Generation de QR code | Si le QR contient une URL, verifier que l'URL pointe vers le domaine BienBon. | Le QR code contient un payload signe (HMAC), pas une URL arbitraire. |

**Regle pour les agents IA :**

> **REGLE-SEC-005** : Le backend ne doit JAMAIS effectuer de requete HTTP vers une URL fournie par l'utilisateur. Toute fonctionnalite d'upload se fait par envoi de fichier (multipart), jamais par URL.

### 2.12 Protection anti-replay des webhooks Peach Payments

Les webhooks de paiement sont un vecteur d'attaque critique : un attaquant qui intercepte un webhook legitime pourrait le rejouer pour declencher un double-traitement (double confirmation de reservation, double credit au partenaire).

**Strategie anti-replay en 2 etapes :**

1. **Verification de la signature HMAC** : chaque webhook Peach est signe avec le `PEACH_WEBHOOK_SECRET`. Le serveur recalcule le HMAC-SHA256 du body et le compare a la signature recue dans le header. Tout webhook dont la signature est invalide est rejete immediatement (401).

2. **Deduplication par `webhook_id` dans Redis** : apres verification de la signature, le `webhook_id` (identifiant unique du webhook Peach) est verifie dans Redis. S'il existe deja, le webhook est un doublon et est rejete (200 OK idempotent, pas de traitement). S'il n'existe pas, il est stocke avec un TTL de 24h puis le webhook est traite.

```typescript
// src/webhooks/peach-webhook.guard.ts

@Injectable()
export class PeachWebhookGuard implements CanActivate {
  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const signature = request.headers['x-peach-signature'];
    const body = request.rawBody; // Body brut pour le calcul HMAC

    // Etape 1 : Verification de la signature HMAC
    const expectedSignature = crypto
      .createHmac('sha256', process.env.PEACH_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    if (!crypto.timingSafeEqual(
      Buffer.from(signature || ''),
      Buffer.from(expectedSignature),
    )) {
      throw new UnauthorizedException('Signature webhook invalide');
    }

    // Etape 2 : Deduplication par webhook_id (anti-replay)
    const webhookId = request.body?.id || request.body?.webhook_id;
    if (!webhookId) {
      throw new BadRequestException('webhook_id manquant');
    }

    const redisKey = `webhook:peach:${webhookId}`;
    const alreadyProcessed = await this.redis.set(
      redisKey,
      '1',
      'EX', 86400,   // TTL 24 heures
      'NX',           // Set uniquement si la cle n'existe pas
    );

    if (alreadyProcessed === null) {
      // La cle existait deja : webhook deja traite (doublon/replay)
      // Retourner 200 OK pour que Peach ne retente pas, mais ne pas traiter
      const response = context.switchToHttp().getResponse();
      response.status(200).send({ status: 'already_processed' });
      return false;
    }

    return true; // Signature valide + premier traitement
  }
}
```

**Metriques anti-replay :**

| Metrique | Description | Alerte si |
|----------|-------------|-----------|
| `webhook.peach.signature_invalid` | Webhooks avec signature HMAC invalide | > 0 (alerte immediate Sentry) |
| `webhook.peach.replay_detected` | Webhooks doublons detectes (anti-replay) | > 10/heure (possible attaque) |
| `webhook.peach.processed` | Webhooks traites avec succes | Monitoring nominal |

> **REGLE-SEC-009** : Tout webhook entrant de Peach Payments DOIT passer par le `PeachWebhookGuard` qui verifie (1) la signature HMAC et (2) l'unicite du `webhook_id` via Redis. Aucun traitement de paiement ne doit etre effectue sans ces deux verifications.

---

## 3. Strategie de validation des inputs

### 3.1 Choix : class-validator (NestJS standard)

| Critere | class-validator | Zod |
|---------|:--------------:|:---:|
| Integration NestJS native | Oui (ValidationPipe, decorateurs) | Via `nestjs-zod` (tiers) |
| Documentation NestJS | Officielle, abondante | Communautaire |
| Code generation OpenAPI | `@nestjs/swagger` + `@ApiProperty` | Necessite adaptateurs |
| Maturite NestJS | 7+ ans | 2-3 ans |
| Maintenance du package | Lente (pas de release depuis 2023) | Tres active |
| Type inference | Faible (decorateurs separees des types) | Excellente |

**Decision** : **class-validator** pour le MVP, en raison de l'integration native NestJS et de la compatibilite avec `@nestjs/swagger` (generation OpenAPI). Migration vers Zod envisageable si class-validator n'est plus maintenu.

> **Note** : class-validator est inactif depuis 2023. Si au moment du developpement backend une meilleure integration Zod/NestJS existe (un `@nestjs/zod` officiel est en discussion, cf. issue #15988), reconsiderer cette decision.

### 3.2 Principe : double validation (client + serveur)

```
                    FLUTTER (UX)                      NESTJS (SECURITE)
                    ============                      ==================
Input utilisateur
        |
        v
  Validation locale          -->    Validation DTO (class-validator)
  (format, longueur,                (memes regles + regles metier)
   feedback instantane)
        |                                    |
        v                                    v
  Affichage erreur UX            400 Bad Request si invalide
  (sans appel API)               (avec details des champs)
```

**La validation Flutter est pour l'UX (feedback rapide). La validation NestJS est pour la securite (source de verite). Un attaquant peut contourner Flutter mais pas NestJS.**

### 3.3 Regles de validation par type de donnee

| Type de donnee | Validation NestJS | Exemple |
|----------------|-------------------|---------|
| Email | `@IsEmail()` | `user@example.com` |
| Telephone Maurice | `@Matches(/^\+230[0-9]{7,8}$/)` | `+23052001234` |
| Mot de passe | `@MinLength(12)`, `@Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)` | |
| UUID | `@IsUUID('4')` | IDs de ressources |
| Prix (MUR) | `@IsNumber()`, `@Min(1)`, `@Max(50000)` | Montant en centimes MUR |
| Latitude | `@IsNumber()`, `@Min(-90)`, `@Max(90)` | Coordonnees GPS |
| Longitude | `@IsNumber()`, `@Min(-180)`, `@Max(180)` | Coordonnees GPS |
| Nom / prenom | `@IsString()`, `@MinLength(1)`, `@MaxLength(100)`, `@Matches(/^[\p{L}\s'-]+$/u)` | Unicode (noms creoles, francais) |
| Description panier | `@IsString()`, `@MaxLength(500)` | Texte libre |
| Quantite | `@IsInt()`, `@Min(1)`, `@Max(100)` | Stock panier |
| URL image | Non applicable (upload fichier, pas URL) | -- |
| Enum (statut, categorie) | `@IsEnum(CategoryEnum)` | Valeurs whitelist |

### 3.4 Uploads

| Contrainte | Valeur | Justification |
|-----------|--------|---------------|
| Taille max image | 20 Mo | Spec US (photos commerces haute qualite) |
| Taille max document | 10 Mo | BRN, Food License (PDF/images) |
| Types autorises images | `image/jpeg`, `image/png`, `image/webp` | Validation content-type + magic bytes |
| Types autorises documents | `image/jpeg`, `image/png`, `application/pdf` | Validation content-type + magic bytes |
| Nombre max images par commerce | 10 | Spec US |
| Resolution max | 4096x4096 | Prevenir les DoS par image geante |

**Validation des uploads (content-type + magic bytes) :**

```typescript
// src/common/validators/file-type.validator.ts

import { FileValidator } from '@nestjs/common';
import * as fileType from 'file-type';

export class FileTypeValidator extends FileValidator {
  private allowedTypes: string[];

  constructor(options: { allowedTypes: string[] }) {
    super({});
    this.allowedTypes = options.allowedTypes;
  }

  async isValid(file: Express.Multer.File): Promise<boolean> {
    // Verifier les magic bytes (pas seulement le content-type du header)
    const detectedType = await fileType.fromBuffer(file.buffer);
    if (!detectedType) return false;
    return this.allowedTypes.includes(detectedType.mime);
  }

  buildErrorMessage(): string {
    return `Le fichier doit etre de type : ${this.allowedTypes.join(', ')}`;
  }
}
```

### 3.5 Scan antimalware des fichiers uploades

Tout fichier uploade par les utilisateurs (photos de paniers, photos de profil, justificatifs partenaires comme le BRN ou la Food License) doit etre scanne avant stockage dans Supabase Storage.

**Risque** : un attaquant uploade un fichier malveillant deguise en image (malware, webshell, polyglot file). Meme avec la validation magic bytes (section 3.4), un fichier peut etre un JPEG valide tout en contenant du code malveillant embarque dans les metadonnees EXIF ou en tant que fichier polyglot.

**Strategie : ClamAV en service sidecar ou service cloud**

| Option | Description | Cout | Latence | Recommandation |
|--------|-------------|------|---------|----------------|
| **ClamAV sidecar** (Docker) | Instance ClamAV dans un container Docker a cote de NestJS sur Railway | ~0 $ (open-source) + RAM container (~512 MB) | ~200-500 ms/fichier | **Phase 1 (MVP)** -- simple, gratuit, suffisant pour les volumes initiaux |
| **VirusTotal API** | API cloud, 74 moteurs antivirus | Gratuit (4 requetes/min), Premium a partir de ~0.001 $/scan | ~5-15 s/fichier (async) | Phase 2+ si besoin de detection avancee |
| **AWS S3 malware scanning** | Service AWS natif via EventBridge + Lambda | Variable | ~1-5 s | Pertinent uniquement si migration vers AWS S3 |

**Implementation Phase 1 (ClamAV) :**

```typescript
// src/common/validators/antimalware.validator.ts

import * as clamd from 'clamdjs';

@Injectable()
export class AntimalwareService {
  private readonly scanner = clamd.createScanner('clamav-sidecar', 3310);

  /**
   * Scanne un buffer de fichier avec ClamAV.
   * Rejette si le fichier est infecte ou si le scan echoue (fail closed).
   */
  async scanFile(buffer: Buffer, filename: string): Promise<void> {
    try {
      const result = await this.scanner.scanBuffer(buffer, 3000, 5 * 1024 * 1024);
      if (result.includes('FOUND')) {
        // Fichier infecte detecte
        this.securityLogger.logSecurityEvent({
          type: 'MALWARE_DETECTED',
          level: 'CRITICAL',
          details: { filename, scanResult: result },
        });
        throw new BadRequestException('Le fichier uploade a ete rejete pour des raisons de securite.');
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      // ClamAV indisponible : fail closed (rejeter le fichier)
      this.securityLogger.logSecurityEvent({
        type: 'ANTIMALWARE_UNAVAILABLE',
        level: 'ERROR',
        details: { filename, error: error.message },
      });
      throw new ServiceUnavailableException(
        'Le service de verification des fichiers est temporairement indisponible. Reessayez.'
      );
    }
  }
}
```

**Contraintes d'upload renforcees :**

| Contrainte | Valeur | Justification |
|-----------|--------|---------------|
| Types MIME acceptes | `image/jpeg`, `image/png`, `image/webp` | Whitelist stricte. Pas de SVG (vecteur XSS), pas de GIF (polyglot abuse). PDF uniquement pour les justificatifs partenaires (`application/pdf`). |
| Taille maximale | **5 MB** pour les photos de paniers et profils. 10 MB pour les documents partenaires. | Reduit la surface d'attaque et le cout de stockage. Les photos haute qualite depassent rarement 5 MB apres compression. |
| Validation multi-couche | (1) Content-Type header -> (2) Magic bytes (`file-type`) -> (3) Scan ClamAV -> (4) Stockage Supabase | Aucune etape ne peut etre contournee. |

**Pipeline d'upload securise :**

```
Fichier uploade (multipart/form-data)
        |
        v
  [1] Verifier Content-Type header (whitelist MIME)
        |
        v
  [2] Verifier magic bytes (file-type library)
        |
        v
  [3] Verifier taille (5 MB max photos, 10 MB max documents)
        |
        v
  [4] Scan antimalware (ClamAV)
        |
        v
  [5] Strip metadonnees EXIF (sharp library pour les images)
        |
        v
  [6] Upload vers Supabase Storage
```

> **REGLE-SEC-010** : Tout fichier uploade doit passer par les 6 etapes du pipeline de validation avant stockage. Le scan antimalware est obligatoire ; si ClamAV est indisponible, le fichier est rejete (fail closed).

### 3.6 Sanitization

| Contexte | Outil | Quand |
|----------|-------|-------|
| Contenu user-generated affiche en HTML (admin React) | `DOMPurify` | Avant affichage cote client |
| Noms, descriptions stockes en base | Trim + normalisation Unicode (NFC) | Avant insertion |
| Recherche textuelle | Echappement des caracteres speciaux PostgreSQL (`%`, `_`, `\`) | Dans le service de recherche |

> **REGLE-SEC-006** : Ne jamais utiliser `dangerouslySetInnerHTML` en React ou `v-html` equivalents pour afficher du contenu utilisateur. Si absolument necessaire, passer par DOMPurify.

---

## 4. Strategie de rate limiting

### 4.1 Architecture a deux niveaux

```
         Requete utilisateur
               |
               v
    +--------------------+
    |  Cloudflare (L7)   |   <-- 1ere ligne : rate limiting IP-based
    |  WAF + Rate Rules  |       (filtre le trafic malveillant avant d'atteindre le serveur)
    +--------------------+
               |
               v
    +--------------------+
    |  NestJS Throttler   |  <-- 2eme ligne : rate limiting applicatif
    |  (par IP + par user)|      (logique fine, par endpoint, par user authentifie)
    +--------------------+
               |
               v
    +--------------------+
    |  Supabase Auth      |  <-- 3eme ligne : rate limiting auth natif
    |  (built-in)         |      (login, register, OTP -- gere par GoTrue)
    +--------------------+
```

### 4.2 Configuration @nestjs/throttler

```typescript
// app.module.ts

import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { minutes, seconds } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: seconds(1),
        limit: 3,       // Max 3 requetes/seconde par IP
      },
      {
        name: 'medium',
        ttl: seconds(10),
        limit: 20,      // Max 20 requetes/10s par IP
      },
      {
        name: 'long',
        ttl: minutes(1),
        limit: 100,     // Max 100 requetes/minute par IP
      },
    ]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

### 4.3 Limites par type d'endpoint

| Categorie d'endpoint | Limite | TTL | Justification |
|-----------------------|--------|-----|---------------|
| **Auth** (login, register, password reset) | 5 requetes | 15 minutes | Brute force protection (conforme ADR-010) |
| **OTP** (envoi SMS) | 3 requetes | 10 minutes | Cout SMS + anti-abuse |
| **Paiement** (creation, capture) | 10 requetes | 1 minute | Protection contre le double-paiement accidentel |
| **Recherche** (baskets, stores) | 30 requetes | 1 minute | Endpoints les plus appeles, limiter le scraping |
| **CRUD standard** (profil, favoris, avis) | 20 requetes | 1 minute | Usage normal |
| **Upload** (images, documents) | 5 requetes | 5 minutes | Prevenir le remplissage du storage |
| **Admin** (bulk operations) | 50 requetes | 1 minute | Operations plus intenses, IP de confiance |
| **Webhooks** (Peach Payments) | Exempt | -- | Les webhooks Peach viennent de IPs connues, ne pas bloquer |
| **SSE** (connexions temps reel) | 3 connexions simultanees | -- | Max 3 connexions SSE ouvertes par utilisateur. Reconnexion : max 1 tentative/5s avec exponential backoff (5s -> 10s -> 20s -> 40s -> max 60s). Empeche un client malveillant d'epuiser les ressources serveur. |

**Configuration par endpoint :**

```typescript
// reservations.controller.ts

@Controller('reservations')
export class ReservationsController {
  @Post()
  @Throttle({ short: { limit: 5, ttl: seconds(60) } }) // 5 reservations/minute max
  async createReservation(@Body() dto: CreateReservationDto) {
    // ...
  }
}

// auth.controller.ts (si endpoints custom au-dela de Supabase Auth)
@Controller('auth')
export class AuthController {
  @Post('verify-phone')
  @Throttle({ short: { limit: 3, ttl: minutes(10) } }) // 3 OTP/10min
  async verifyPhone(@Body() dto: VerifyPhoneDto) {
    // ...
  }
}

// webhooks.controller.ts
@Controller('webhooks')
@SkipThrottle() // Les webhooks Peach ne doivent pas etre throttles
export class WebhooksController {
  @Post('peach')
  async handlePeachWebhook(@Body() payload: PeachWebhookPayload) {
    // Verifier la signature HMAC avant tout traitement
  }
}

// sse.controller.ts -- rate limiting specifique SSE
@Controller('api/sse')
export class SseController {
  // Map userId -> Set<connexion> pour compter les connexions actives
  private readonly activeConnections = new Map<string, Set<string>>();
  private static readonly MAX_SSE_CONNECTIONS_PER_USER = 3;

  @Get('consumer')
  @UseGuards(JwtAuthGuard)
  async consumerStream(@Req() req: Request): Promise<Observable<MessageEvent>> {
    const userId = req.user.id;
    const userConnections = this.activeConnections.get(userId) ?? new Set();

    // Rejeter si l'utilisateur a deja atteint le max de connexions SSE
    if (userConnections.size >= SseController.MAX_SSE_CONNECTIONS_PER_USER) {
      throw new HttpException(
        'Nombre maximum de connexions SSE atteint (3). Fermez une connexion existante.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Enregistrer la connexion et la nettoyer a la fermeture
    const connectionId = randomUUID();
    userConnections.add(connectionId);
    this.activeConnections.set(userId, userConnections);

    req.on('close', () => {
      userConnections.delete(connectionId);
      if (userConnections.size === 0) {
        this.activeConnections.delete(userId);
      }
    });

    return this.sseService.createConsumerStream(userId);
  }
}
```

### 4.4 Gestion du rate limiting avec les mobile wallets

Les paiements par mobile wallets (MCB Juice, Blink, MauCAS) impliquent des redirections :
1. L'app ouvre un deep link vers le wallet
2. L'utilisateur confirme dans le wallet
3. Le wallet redirige vers BienBon (callback URL)

**Probleme** : la redirection de retour peut generer plusieurs requetes rapides (redirections HTTP 302 en chaine). Le throttler ne doit pas bloquer ces redirections.

**Solution** : les endpoints de callback paiement (`/api/v1/payments/callback/*`) ont un rate limit specifique plus eleve (20 requetes/minute) et sont identifies par un token de session jetable (pas d'auth JWT requise pour le callback initial, mais verification HMAC du payload).

### 4.5 Cloudflare rate limiting (1re ligne)

Configuration via les Cloudflare Rules (free tier : 5 custom rules) :

| Regle | Chemin | Limite | Action |
|-------|--------|--------|--------|
| API globale | `/api/*` | 1000 req/min par IP | Challenge (CAPTCHA) |
| Auth endpoints | `/api/v1/auth/*` | 20 req/min par IP | Block |
| Upload endpoints | `/api/v1/*/upload` | 10 req/min par IP | Block |

---

## 5. Headers de securite

### 5.1 Configuration Helmet (NestJS)

```typescript
// main.ts

import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    helmet({
      // Content Security Policy
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            // Peach Payments COPYandPAY widget (si utilise dans une WebView servie par BienBon)
            'https://oppwa.com',
            'https://eu-test.oppwa.com',      // sandbox Peach
            'https://checkout.peachpayments.com',
          ],
          styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind peut necessiter inline styles
          imgSrc: [
            "'self'",
            'data:',
            'https://*.supabase.co',           // Supabase Storage images
            'https://lh3.googleusercontent.com', // Google profile photos
            'https://platform-lookaside.fbsbx.com', // Facebook profile photos
          ],
          connectSrc: [
            "'self'",
            'https://*.supabase.co',           // Supabase API
            'https://checkout.peachpayments.com',
            'https://oppwa.com',
            'https://eu-test.oppwa.com',
            'https://*.sentry.io',             // Sentry error reporting
          ],
          frameSrc: [
            'https://checkout.peachpayments.com', // Hosted Checkout iframe
            'https://oppwa.com',
            'https://eu-test.oppwa.com',
          ],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'], // Nunito font (Google Fonts)
          objectSrc: ["'none'"],
          mediaSrc: ["'none'"],
          frameAncestors: ["'none'"],          // Pas d'embedding dans un iframe
          baseUri: ["'self'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: [],
        },
      },

      // Strict Transport Security
      strictTransportSecurity: {
        maxAge: 31536000,           // 1 an
        includeSubDomains: true,
        preload: true,
      },

      // Prevent MIME type sniffing
      xContentTypeOptions: true,    // X-Content-Type-Options: nosniff

      // Prevent clickjacking
      frameguard: { action: 'deny' }, // X-Frame-Options: DENY

      // Referrer Policy
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

      // Disable X-Powered-By header
      hidePoweredBy: true,

      // Prevent cross-site scripting (legacy, CSP est prefere)
      xssFilter: true,              // X-XSS-Protection: 1; mode=block

      // DNS Prefetch Control
      dnsPrefetchControl: { allow: false },

      // Don't allow downloads in old IE
      ieNoOpen: true,

      // Permissions Policy (ex-Feature-Policy)
      // Note: helmet v8+ supporte permissionsPolicy
    })
  );

  // Ajouter manuellement le Permissions-Policy header
  app.use((req, res, next) => {
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(self), payment=(self "https://checkout.peachpayments.com")'
    );
    next();
  });
}
```

### 5.2 Configuration CORS

```typescript
// main.ts

app.enableCors({
  // ORIGINS AUTORISEES -- liste blanche stricte
  origin: [
    'https://admin.bienbon.mu',     // Admin React
    'https://bienbon.mu',           // Site vitrine
    'https://www.bienbon.mu',       // Site vitrine (www)
    // PAS de localhost en production
    ...(process.env.NODE_ENV !== 'production'
      ? ['http://localhost:3000', 'http://localhost:5173']
      : []),
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Request-ID',
    'X-Timezone',    // Pour l'i18n des dates (ADR-015)
  ],
  credentials: true,
  maxAge: 86400,     // Preflight cache 24h
});
```

> Note : les apps Flutter mobiles ne sont PAS soumises a CORS (pas de navigateur). Le CORS ne concerne que l'admin React et le site vitrine.

### 5.3 Tableau recapitulatif des headers

| Header | Valeur | Effet |
|--------|--------|-------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Force HTTPS pour 1 an |
| `Content-Security-Policy` | Voir section 5.1 | Empeche le chargement de ressources non autorisees |
| `X-Content-Type-Options` | `nosniff` | Empeche le MIME sniffing |
| `X-Frame-Options` | `DENY` | Empeche l'embedding en iframe (anti-clickjacking) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limite les fuites de referrer |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(self)` | Desactive les API non necessaires |
| `X-XSS-Protection` | `1; mode=block` | Protection XSS legacy |
| `X-Powered-By` | (supprime) | Ne pas reveler Express/Fastify |
| `Server` | (supprime ou Cloudflare) | Ne pas reveler le serveur |
| `X-Request-ID` | UUID genere par requete | Tracabilite des requetes |
| `Cache-Control` | `no-store` (endpoints sensibles) | Empeche le cache de donnees sensibles |

### 5.4 CSP et Peach Payments COPYandPAY

Le widget COPYandPAY de Peach Payments necessite des directives CSP specifiques pour fonctionner. Les domaines exacts peuvent varier selon l'environnement (sandbox vs production). Il est recommande de :

1. Tester en mode `Content-Security-Policy-Report-Only` d'abord
2. Monitorer les violations dans la console navigateur
3. Ajouter les domaines necessaires progressivement
4. Contacter le support Peach Payments pour la liste officielle des domaines CSP

> **Action avant la production** : obtenir de Peach Payments la liste exacte des domaines a whitelister pour le CSP en production.

---

## 6. Secrets management

### 6.1 Inventaire des secrets BienBon

| Secret | Usage | Sensibilite | Stockage |
|--------|-------|-------------|----------|
| `SUPABASE_URL` | URL de l'instance Supabase | Faible (publique) | Code source (variable d'env) |
| `SUPABASE_ANON_KEY` | Cle publique Supabase (RLS enforce) | Faible (publique) | Code source Flutter + Railway |
| `SUPABASE_SERVICE_ROLE_KEY` | Cle admin Supabase (bypass RLS) | **Critique** | Railway env vars uniquement |
| `PEACH_API_KEY` | Cle API Peach Payments | **Critique** | Railway env vars uniquement |
| `PEACH_WEBHOOK_SECRET` | Secret HMAC pour verifier les webhooks Peach | **Critique** | Railway env vars uniquement |
| `RESEND_API_KEY` | Cle API Resend (envoi d'emails) | Eleve | Railway env vars uniquement |
| `TWILIO_ACCOUNT_SID` | SID compte Twilio | Eleve | Railway env vars uniquement |
| `TWILIO_AUTH_TOKEN` | Token d'auth Twilio | **Critique** | Railway env vars uniquement |
| `TWILIO_VERIFY_SID` | SID du service Verify | Moyen | Railway env vars uniquement |
| `FCM_SERVICE_ACCOUNT` | Compte de service Firebase (JSON) | **Critique** | Railway env vars (base64 encode) |
| `SENTRY_DSN` | DSN Sentry pour le reporting d'erreurs | Faible | Code source (publique) |
| `TURNSTILE_SECRET_KEY` | Secret Cloudflare Turnstile CAPTCHA | Eleve | Supabase Dashboard + Railway |
| `DATABASE_URL` | URL de connexion PostgreSQL | **Critique** | Railway env vars uniquement |

### 6.2 Regles de stockage

| Environnement | Stockage des secrets | Acces |
|--------------|---------------------|-------|
| **Developpement local** | `.env` (gitignore) | Developpeur individuel |
| **CI/CD (GitHub Actions)** | GitHub Secrets | Workflow uniquement |
| **Production (Railway)** | Railway Environment Variables | Service runtime uniquement |
| **Supabase Auth config** | Supabase Dashboard | Admins Supabase uniquement |

> **REGLE-SEC-007** : Le fichier `.env` est dans le `.gitignore`. Un fichier `.env.example` est commite avec les noms des variables (sans valeurs). Tout commit contenant une valeur de secret est un incident de securite.

### 6.3 Detection de secrets dans le code

**Outil : Gitleaks (pre-commit hook + CI)**

Gitleaks est un outil open-source rapide qui detecte les secrets dans les repos Git. Il est prefere a TruffleHog pour sa vitesse en CI et sa facilite de configuration.

**Installation pre-commit :**

```yaml
# .pre-commit-config.yaml

repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.21.0
    hooks:
      - id: gitleaks
```

**Integration CI (GitHub Actions) :**

```yaml
# .github/workflows/security.yml

name: Security Checks
on: [push, pull_request]

jobs:
  gitleaks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Configuration Gitleaks :**

```toml
# .gitleaks.toml

title = "BienBon Gitleaks Config"

# Regles par defaut + regles custom
[[rules]]
  id = "supabase-service-role"
  description = "Supabase Service Role Key"
  regex = '''eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+'''
  tags = ["supabase", "jwt"]

[[rules]]
  id = "peach-api-key"
  description = "Peach Payments API Key"
  regex = '''(?i)(peach|payment).*(?:key|token|secret)\s*[:=]\s*['\"][a-zA-Z0-9]{20,}['\"]'''
  tags = ["peach", "payment"]

# Fichiers a ignorer (faux positifs)
[allowlist]
  paths = [
    '''.env.example''',
    '''.*test.*''',
    '''.*\.stories\.tsx''',
  ]
```

### 6.4 Politique de rotation

| Secret | Frequence de rotation | Processus |
|--------|----------------------|-----------|
| `SUPABASE_SERVICE_ROLE_KEY` | Sur suspicion de compromission | Regenerer dans Supabase Dashboard, mettre a jour Railway |
| `PEACH_API_KEY` | Annuelle ou sur suspicion | Demander nouvelle cle a Peach, mettre a jour Railway |
| `RESEND_API_KEY` | Annuelle | Regenerer dans Resend Dashboard, mettre a jour Railway |
| `TWILIO_AUTH_TOKEN` | Annuelle ou sur suspicion | Regenerer dans Twilio Console, mettre a jour Railway + Supabase |
| `FCM_SERVICE_ACCOUNT` | Annuelle | Creer nouveau service account dans Firebase Console |
| `DATABASE_URL` | Sur suspicion de compromission | Changer le mot de passe DB dans Supabase |

> **Processus de rotation d'urgence** : si un secret est compromis (detecte dans un commit, logue accidentellement, ou fuite tierce), la rotation doit etre effectuee dans l'heure. Le playbook est : (1) generer un nouveau secret, (2) deployer la mise a jour sur Railway, (3) revoquer l'ancien secret, (4) auditer les logs pour usage malveillant.

---

## 7. Risques specifiques au code genere par IA

### 7.1 Taxonomie des risques

| # | Risque | Probabilite | Impact | Detectabilite |
|---|--------|:-----------:|:------:|:-------------:|
| R1 | **Packages NPM/pub.dev hallucines** (slopsquatting) | Elevee (20% des suggestions) | Critique (malware) | Moyenne (lockfile, audit) |
| R2 | **Patterns insecures reproduits** (eval, innerHTML, SQL concat) | Elevee (45% du code IA a des failles) | Eleve (XSS, injection) | Bonne (lint rules) |
| R3 | **Secrets hardcodes dans le code** | Moyenne | Critique (compromission) | Bonne (Gitleaks) |
| R4 | **Over-permissive configurations** (CORS `*`, RLS off) | Elevee | Eleve (acces non autorise) | Moyenne (revue config) |
| R5 | **Logique d'autorisation manquante** (pas de guard sur un endpoint) | Elevee | Critique (IDOR) | Faible (tests manuels) |
| R6 | **Dependances obsoletes ou non patchees** | Moyenne | Eleve (CVE connues) | Bonne (npm audit, Dependabot) |
| R7 | **Copie de code de mauvaise qualite** (patterns StackOverflow anciens) | Moyenne | Moyen (dette technique) | Faible |
| R8 | **Hallucination d'APIs inexistantes** (methodes Prisma ou NestJS inventees) | Moyenne | Faible (erreur de build) | Excellente (TypeScript) |

### 7.2 Mitigations systematiques

#### R1 -- Packages hallucines (slopsquatting)

**Pipeline de verification :**

```
Agent IA genere du code
        |
        v
  Nouveau package dans package.json ?
        |
   Oui  |  Non --> OK
        v
  Script verify-new-deps.sh
        |
   [Existe sur npm ?] -- Non --> BLOQUE (alerte)
        |
   Oui  |
        v
   [> 100 downloads/week ?] -- Non --> WARNING (review manuelle)
        |
   Oui  |
        v
   [Dernier commit < 12 mois ?] -- Non --> WARNING (review manuelle)
        |
   Oui  |
        v
  OK, installer
```

**Allowlist de packages :** maintenir un fichier `.allowed-packages.json` (ou section dans `package.json`) listant tous les packages approuves. Un check CI compare les deps reelles avec l'allowlist et alerte sur toute deviation.

```json
{
  "approved_packages": {
    "runtime": [
      "@nestjs/core", "@nestjs/common", "@nestjs/platform-fastify",
      "@nestjs/swagger", "@nestjs/throttler", "@nestjs/config",
      "@nestjs/schedule", "@nestjs/bull",
      "@prisma/client", "prisma",
      "helmet", "class-validator", "class-transformer",
      "bcrypt", "uuid", "dayjs", "lodash",
      "bullmq", "ioredis",
      "@supabase/supabase-js",
      "@sentry/node",
      "resend"
    ],
    "dev": [
      "vitest", "eslint", "prettier", "typescript",
      "@types/node", "supertest"
    ]
  }
}
```

#### R2 -- Patterns insecures

**Lint rules ESLint (deja detaillees en section 2.4) :**

| Pattern interdit | Lint rule | Alternative securisee |
|-----------------|----------|----------------------|
| `eval()` | `no-eval` + custom | Jamais necessaire |
| `innerHTML` | Custom no-restricted-syntax | `textContent` ou rendu React |
| `$queryRawUnsafe` | Custom no-restricted-syntax | `$queryRaw` template literal |
| `dangerouslySetInnerHTML` | Custom no-restricted-syntax | Rendu React standard |
| `child_process.exec()` | Custom no-restricted-syntax | Librairies Node.js natives |
| `new Function()` | `no-new-func` | Jamais necessaire |
| `document.write()` | Custom no-restricted-syntax | Rendu React standard |
| `window.location = userInput` | Custom | Validation d'URL, whitelist |
| `fs.readFile(userInput)` | Custom | Chemins en constantes, pas d'input user |
| `CORS origin: '*'` | Custom/revue config | Whitelist de domaines |

#### R3 -- Secrets hardcodes

**Triple filet de detection :**

1. **Pre-commit** : Gitleaks pre-commit hook (detection avant le commit)
2. **CI** : Gitleaks GitHub Action (detection sur chaque push/PR)
3. **Post-facto** : Scan periodique de l'historique Git complet (`gitleaks detect --source . --log-opts "--all"`)

#### R4 -- Over-permissive configurations

**Checklist de configuration automatisee (CI) :**

```bash
#!/bin/bash
# scripts/check-security-config.sh

ERRORS=0

# Verifier CORS -- pas de '*' dans la config
if grep -r "origin.*['\"]\\*['\"]" src/; then
  echo "ERREUR: CORS origin '*' detecte dans le code source"
  ERRORS=$((ERRORS + 1))
fi

# Verifier RLS -- pas de DISABLE ROW LEVEL SECURITY
if grep -ri "DISABLE ROW LEVEL SECURITY" prisma/ supabase/ migrations/; then
  echo "ERREUR: DISABLE ROW LEVEL SECURITY detecte"
  ERRORS=$((ERRORS + 1))
fi

# Verifier que Swagger est desactive en production
if grep -r "SwaggerModule.setup" src/main.ts | grep -v "NODE_ENV"; then
  echo "WARNING: Swagger semble actif sans condition NODE_ENV"
  ERRORS=$((ERRORS + 1))
fi

# Verifier qu'il n'y a pas de service_role key dans le code Flutter
if grep -ri "service_role" lib/ 2>/dev/null; then
  echo "ERREUR: service_role key reference dans le code Flutter"
  ERRORS=$((ERRORS + 1))
fi

exit $ERRORS
```

#### R5 -- Logique d'autorisation manquante

C'est le risque le plus difficile a detecter automatiquement. Mitigations :

1. **Convention de nommage** : tout controller dans `src/modules/*/controllers/*.controller.ts` doit avoir un `@UseGuards(JwtAuthGuard)` au niveau classe (sauf les controllers publics explicitement listes).

2. **Test de couverture auth** : un test automatise verifie que chaque endpoint non-public retourne 401 sans token et 403 sans le bon role.

```typescript
// test/security/auth-coverage.e2e-spec.ts

describe('Auth coverage', () => {
  const publicEndpoints = [
    'GET /api/v1/baskets',
    'GET /api/v1/stores',
    'GET /api/v1/health',
  ];

  // Recuperer tous les endpoints enregistres
  const allEndpoints = getAllRegisteredEndpoints(app);

  for (const endpoint of allEndpoints) {
    if (publicEndpoints.includes(endpoint)) continue;

    it(`${endpoint} doit retourner 401 sans token`, async () => {
      const [method, path] = endpoint.split(' ');
      const response = await request(app.getHttpServer())
        [method.toLowerCase()](path);
      expect(response.status).toBe(401);
    });
  }
});
```

3. **RLS comme filet de securite** : meme si un guard NestJS est oublie, le RLS Supabase empeche l'acces non autorise au niveau base de donnees.

#### R6 -- Dependances obsoletes

| Outil | Frequence | Seuil |
|-------|-----------|-------|
| `npm audit` | Chaque CI run | High/Critical = bloquant |
| Dependabot | Continu (PRs automatiques) | Merge dans les 7 jours |
| `flutter pub outdated` | Hebdomadaire (cron CI) | Warning si > 2 majeures en retard |

### 7.3 Processus de revue du code IA

Chaque PR generee par un agent IA passe par la checklist suivante :

```markdown
## Checklist de securite PR (code genere par IA)

### Dependances
- [ ] Aucun nouveau package non present dans l'allowlist
- [ ] `npm audit` sans vulnerabilites High/Critical
- [ ] Lockfile (`package-lock.json`) coherent et commite

### Injection / XSS
- [ ] Pas de `$queryRawUnsafe` ou `$executeRawUnsafe`
- [ ] Pas de `eval()`, `new Function()`, `innerHTML`, `dangerouslySetInnerHTML`
- [ ] Pas de concatenation de strings dans des requetes SQL

### Autorisation
- [ ] Tout endpoint avec `:id` a un ownership guard OU une policy RLS
- [ ] Le body de la requete n'est pas utilise pour determiner l'identite (toujours `req.user.id`)
- [ ] Les admins-only endpoints ont le guard `@Roles('admin')`

### Configuration
- [ ] Pas de CORS `origin: '*'`
- [ ] Pas de secret hardcode dans le code
- [ ] Swagger desactive en production
- [ ] Error responses ne contiennent pas de stack traces

### Validation
- [ ] Tout DTO a des decorateurs class-validator
- [ ] Les uploads sont valides (content-type + magic bytes + taille max)
- [ ] Les enums sont valides (`@IsEnum()`, pas de string libre pour les statuts)

### Logs
- [ ] Pas de donnees sensibles dans les logs (mots de passe, tokens, PAN)
- [ ] Les evenements de securite sont logges (echecs auth, acces refuses)
```

---

## 8. Plan d'implementation

### Phase 1 -- Fondations (Sprint 1, en parallele du setup backend)

| Tache | Priorite | Effort |
|-------|----------|--------|
| Configurer Helmet dans `main.ts` | P0 | 0.5j |
| Configurer CORS strict | P0 | 0.5j |
| Configurer `@nestjs/throttler` (global + par endpoint) | P0 | 1j |
| Installer et configurer Gitleaks (pre-commit + CI) | P0 | 0.5j |
| Creer le `HttpExceptionFilter` (pas de stack traces en prod) | P0 | 0.5j |
| Ajouter les lint rules de securite ESLint | P0 | 0.5j |
| Creer le `.env.example` et verifier `.gitignore` | P0 | 0.25j |
| Configurer `npm audit` en CI (bloquant sur High/Critical) | P0 | 0.25j |

### Phase 2 -- Autorisation avancee (Sprint 2-3)

| Tache | Priorite | Effort |
|-------|----------|--------|
| Implementer l'OwnershipGuard generique | P0 | 1j |
| Definir les policies RLS pour toutes les tables | P0 | 2j |
| Creer le test e2e de couverture auth | P1 | 1j |
| Configurer Cloudflare WAF rules | P1 | 0.5j |
| Implementer le SecurityLogger | P1 | 1j |

### Phase 3 -- Hardening (Sprint 4-5)

| Tache | Priorite | Effort |
|-------|----------|--------|
| Configurer Cloudflare Turnstile (CAPTCHA) | P1 | 1j |
| Creer le script `verify-new-deps.sh` | P1 | 0.5j |
| Creer le script `check-security-config.sh` | P1 | 0.5j |
| Configurer le dashboard Grafana securite | P2 | 1j |
| Mettre en place l'allowlist de packages | P2 | 0.5j |
| Documenter le playbook de rotation d'urgence des secrets | P2 | 0.5j |

### Phase 4 -- Pre-production (avant le lancement)

| Tache | Priorite | Effort |
|-------|----------|--------|
| Scan de securite complet (npm audit + Gitleaks full history) | P0 | 0.5j |
| Test de penetration leger (OWASP ZAP automated scan) | P1 | 1j |
| Verification des headers de securite (securityheaders.com) | P0 | 0.25j |
| Test CSP avec Peach Payments (sandbox puis production) | P0 | 1j |
| Revue de toutes les policies RLS | P0 | 1j |
| Verification que Swagger est desactive en prod | P0 | 0.1j |

---

## 9. Consequences

### Positives

1. **Defense en profondeur** : trois niveaux de protection (Cloudflare WAF -> NestJS middleware -> RLS Supabase) garantissent qu'une faille a un niveau est compensee par les autres.

2. **Automatisation maximale** : la majorite des controles de securite sont automatises (lint, CI, pre-commit), ce qui compense le risque du code IA qui ne "pense" pas securite.

3. **Conformite OWASP** : le mapping systematique assure qu'aucune categorie OWASP n'est oubliee.

4. **Cout minimal** : toutes les solutions choisies sont gratuites ou a tres faible cout (Cloudflare free, Gitleaks open-source, npm audit natif, Helmet open-source).

### Negatives

1. **Overhead de developpement** : chaque endpoint doit implementer un guard de propriete, des decorateurs de validation, et des tests d'autorisation. Cela ralentit le developpement initial.

2. **Faux positifs** : Gitleaks et les lint rules custom peuvent generer des faux positifs, necessitant de la configuration et de la maintenance de la whitelist.

3. **CSP complexe** : la Content Security Policy, particulierement avec le widget Peach Payments, peut etre difficile a configurer correctement. Un CSP trop restrictif casse le paiement ; un CSP trop permissif est inutile.

4. **Allowlist de packages rigide** : maintenir une allowlist de packages ajoute de la friction pour les developpeurs (et les agents IA). Il faut un processus clair d'ajout de nouveaux packages.

---

## 10. Risques

| Risque | Probabilite | Impact | Mitigation |
|--------|:-----------:|:------:|------------|
| L'agent IA genere un pattern insecure non detecte par les lint rules | Moyenne | Eleve | Enrichir les lint rules au fil du temps. Tests de penetration reguliers. |
| Un package malveillant passe les verifications (supply chain attack sophistiquee) | Faible | Critique | Lockfile integrity, `npm audit signatures`, Socket.dev, alertes Dependabot. |
| Les headers CSP cassent le widget Peach Payments en production | Moyenne | Eleve | Tester en CSP Report-Only d'abord. Avoir un contact support Peach Payments. |
| Le rate limiting bloque des utilisateurs legitimes (faux positifs) | Moyenne | Moyen | Commencer avec des limites genereuses, ajuster en fonction des metriques reelles. |
| La rotation de cles cause un downtime | Faible | Moyen | Processus documente, deploiement bleu-vert Railway (zero downtime). |
| Le RLS est desactive "pour debugger" et oublie | Moyenne | Critique | Script CI `check-security-config.sh` detecte le RLS desactive. Alerte Slack. |

---

## 11. References

### OWASP

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [OWASP Top 10 2025](https://owasp.org/Top10/2025/)
- [OWASP Top 10 2025 vs 2021 : What Has Changed? (Equixly)](https://equixly.com/blog/2025/12/01/owasp-top-10-2025-vs-2021/)
- [OWASP Content Security Policy Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [OWASP Top 10 for Agentic Applications 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/)

### NestJS Security

- [NestJS Helmet Documentation](https://docs.nestjs.com/security/helmet)
- [NestJS Rate Limiting (Throttler)](https://docs.nestjs.com/security/rate-limiting)
- [Securing NestJS Apps: OWASP Protections (Medium)](https://medium.com/@febriandwikimhan/securing-nestjs-apps-implementing-key-owasp-protections-8ef60df6ecf8)
- [Best Security Practices in NestJS (DEV Community)](https://dev.to/drbenzene/best-security-implementation-practices-in-nestjs-a-comprehensive-guide-2p88)
- [Secure Your NestJS Application: Production-Ready Defaults (Medium)](https://medium.com/@s_malyshev/secure-your-nestjs-application-production-ready-defaults-for-safety-and-dx-1b6896b1ce74)
- [API NestJS #187: Rate Limiting using Throttler (Wanago)](https://wanago.io/2025/03/03/api-nestjs-rate-limiting-throttler/)

### Securite du code genere par IA

- [Understanding Security Risks in AI-Generated Code (CSA)](https://cloudsecurityalliance.org/blog/2025/07/09/understanding-security-risks-in-ai-generated-code)
- [Veracode 2025 GenAI Code Security Report](https://www.veracode.com/resources/analyst-reports/2025-genai-code-security-report/)
- [AI Can Write Your Code, But Nearly Half May Be Insecure (Help Net Security)](https://www.helpnetsecurity.com/2025/08/07/create-ai-code-security-risks/)
- [The AI Code Security Crisis of 2026 (GrowExx)](https://www.growexx.com/blog/ai-code-security-crisis-2026-cto-guide/)
- [Most Common Security Vulnerabilities in AI-Generated Code (Endor Labs)](https://www.endorlabs.com/learn/the-most-common-security-vulnerabilities-in-ai-generated-code)
- [As Coders Adopt AI Agents, Security Pitfalls Lurk in 2026 (Dark Reading)](https://www.darkreading.com/application-security/coders-adopt-ai-agents-security-pitfalls-lurk-2026)

### Slopsquatting et Supply Chain

- [Slopsquatting: The AI Package Hallucination Attack (Aikido)](https://www.aikido.dev/blog/slopsquatting-ai-package-hallucination-attacks)
- [AI-Hallucinated Dependencies: The 2025 Slopsquatting Risk (Rescana)](https://www.rescana.com/post/ai-hallucinated-dependencies-in-pypi-and-npm-the-2025-slopsquatting-supply-chain-risk-explained)
- [Slopsquatting: Detecting Malicious Packages (Cloudsmith)](https://cloudsmith.com/blog/slopsquatting-and-typosquatting-how-to-detect-ai-hallucinated-malicious-packages)
- [Slopsquatting: AI Hallucinations and Software Supply Chain (FOSSA)](https://fossa.com/blog/slopsquatting-ai-hallucinations-new-software-supply-chain-risk/)

### Detection de secrets

- [TruffleHog vs Gitleaks Comparison (Jit)](https://www.jit.io/resources/appsec-tools/trufflehog-vs-gitleaks-a-detailed-comparison-of-secret-scanning-tools)
- [Secret Scanning in CI Pipelines using Gitleaks (DEV Community)](https://dev.to/sirlawdin/secret-scanning-in-ci-pipelines-using-gitleaks-and-pre-commit-hook-1e3f)
- [Best Secret Scanning Tools 2025 (Aikido)](https://www.aikido.dev/blog/top-secret-scanning-tools)

### Cloudflare

- [Cloudflare WAF for Everyone (Cloudflare Blog)](https://blog.cloudflare.com/waf-for-everyone/)
- [Cloudflare WAF Managed Rules Documentation](https://developers.cloudflare.com/waf/managed-rules/)

### Validation NestJS

- [Zod vs class-validator (DEV Community)](https://dev.to/abdulghofurme/zod-vs-class-validator-class-transformer-3oam)
- [NestJS Zod First Class Support (GitHub Issue #10974)](https://github.com/nestjs/nest/issues/10974)
- [@nestjs/zod Package Request (GitHub Issue #15988)](https://github.com/nestjs/nest/issues/15988)

### ADR BienBon liees

- ADR-001 : Stack backend (NestJS + Prisma + Supabase)
- ADR-004 : Strategie API (REST + OpenAPI)
- ADR-006 : PCI DSS SAQ-A et tokenisation
- ADR-010 : Strategie d'authentification
- ADR-011 : Modele d'autorisation RBAC
- ADR-017 : State machines metier
- ADR-019 : Detection de fraude
- ADR-020 : Hebergement et infrastructure
- ADR-021 : Conformite Data Protection Act

---

## Annexe A : Checklist de securite par PR/commit

A copier dans le template de PR GitHub :

```markdown
## Security Checklist

### Mandatory (bloquant)
- [ ] `npm audit` sans vulnerabilites High/Critical
- [ ] Gitleaks CI passe (aucun secret detecte)
- [ ] Pas de nouveau package hors allowlist (ou justification ajoutee)
- [ ] Lint CI passe (inclut les regles de securite custom)
- [ ] Tout nouvel endpoint a un guard d'authentification
- [ ] Tout endpoint avec `:id` a un ownership guard ou RLS

### Recommende (non bloquant mais revu)
- [ ] Nouveaux DTOs ont des validations class-validator completes
- [ ] Les evenements de securite sont logges
- [ ] Pas de donnees sensibles dans les logs
- [ ] Les tests couvrent le cas 401/403
```

---

## Annexe B : Correspondance OWASP 2021 / OWASP 2025

| OWASP 2021 | OWASP 2025 | Changement |
|------------|-----------|-----------|
| A01 Broken Access Control | A01 Broken Access Control | Inchange (#1). SSRF (ex-A10:2021) integre dans A01:2025. |
| A02 Cryptographic Failures | A04 Cryptographic Failures | Descend de #2 a #4. |
| A03 Injection | A05 Injection | Descend de #3 a #5. |
| A04 Insecure Design | A06 Insecure Design | Descend de #4 a #6. |
| A05 Security Misconfiguration | A02 Security Misconfiguration | Monte de #5 a #2 (plus prevalent). |
| A06 Vulnerable Components | A03 Software Supply Chain Failures | Monte de #6 a #3. Elargi a toute la supply chain (CI/CD, build tools). |
| A07 Auth Failures | A07 Authentication Failures | Inchange (#7). |
| A08 Software/Data Integrity | A08 Software or Data Integrity Failures | Inchange (#8). |
| A09 Logging/Monitoring | A09 Logging & Alerting Failures | Inchange (#9). "Alerting" ajoute au titre. |
| A10 SSRF | (integre dans A01:2025) | Supprime comme categorie distincte. |
| (nouveau) | A10 Mishandling of Exceptional Conditions | Nouveau : erreurs mal gerees, fail open, conditions exceptionnelles. |

> **Impact pour BienBon** : le passage de "Vulnerable Components" a "Software Supply Chain Failures" (A03:2025, monte a #3) renforce l'importance critique de la section 7 de cette ADR (risques IA + allowlist + verification de packages). La montee de Security Misconfiguration a #2 renforce l'importance de la section 5 (headers) et des scripts de verification de configuration.

---

## Annexe C : A10:2025 -- Mishandling of Exceptional Conditions (nouveau)

L'OWASP Top 10 2025 introduit une nouvelle categorie A10 : "Mishandling of Exceptional Conditions". Cela couvre les erreurs mal gerees qui provoquent des comportements "fail open" (autoriser l'acces en cas d'erreur plutot que le refuser).

### Risques BienBon concrets

| Scenario | Impact | Mitigation |
|----------|--------|-----------|
| Le guard d'autorisation leve une exception inattendue et le framework laisse passer la requete | Acces non autorise | NestJS guards retournent `false` par defaut si une erreur non interceptee se produit. Ajouter un try/catch explicite qui retourne `false` (fail closed). |
| Supabase Auth est indisponible temporairement ; le backend laisse passer les requetes sans verification JWT | Acces non autorise total | Le `JwtAuthGuard` doit echouer avec 503 si le JWKS (cle publique Supabase) est inaccessible. Ne jamais ignorer l'erreur de verification JWT. |
| Le service de paiement Peach ne repond pas ; le backend confirme la reservation sans capture | Perte financiere | La state machine (ADR-017) exige un status de paiement explicite avant la transition `PENDING_PAYMENT -> CONFIRMED`. Timeout Peach = la reservation reste en `PENDING_PAYMENT` et expire. |
| Un rate limiter echoue (Redis down) ; toutes les requetes passent | DDoS, brute force | `@nestjs/throttler` en mode memoire locale comme fallback. Cloudflare WAF en 1re ligne (independant de Redis). |
| L'upload de fichier echoue a la validation du content-type ; le fichier est quand meme stocke | Stockage de fichiers malveillants | Le `FileTypeValidator` (section 3.4) doit rejeter avant tout appel a Supabase Storage. Ne jamais stocker d'abord puis valider ensuite. |
| Le HMAC du webhook Peach est incorrect ; le backend traite quand meme le webhook | Injection de faux evenements de paiement | Le middleware de verification HMAC doit etre le premier middleware execute. Tout echec de verification = 401 immediat, pas de traitement du body. |

### Principe general : "Fail Closed"

> **REGLE-SEC-008** : Tout composant de securite (guard, validator, rate limiter, signature verifier) DOIT echouer en mode "deny" (ferme) en cas d'erreur interne. Aucune requete ne doit etre autorisee si le composant de securite n'a pas pu effectuer sa verification. Cela s'applique a :
> - Les JWT auth guards (pas de JWT valide = 401, verification impossible = 503)
> - Les ownership guards (ressource introuvable = 404, erreur DB = 500, jamais 200)
> - Les rate limiters (Redis down = utiliser un fallback local restrictif, pas "tout passer")
> - Les webhook verifiers (signature invalide ou verification impossible = 401, jamais 200)

### Implementation du fail-closed dans les guards NestJS

```typescript
// src/common/guards/fail-closed-jwt.guard.ts

import { ExecutionContext, Injectable, UnauthorizedException, ServiceUnavailableException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class FailClosedJwtGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // Si une erreur survient (JWKS indisponible, token malformed, etc.)
    if (err) {
      // Distinguer les erreurs d'infrastructure des erreurs d'auth
      if (err.message?.includes('JWKS') || err.message?.includes('ECONNREFUSED')) {
        // Erreur d'infrastructure : ne PAS laisser passer
        throw new ServiceUnavailableException(
          'Service d\'authentification temporairement indisponible'
        );
      }
      throw new UnauthorizedException('Token invalide');
    }

    // Si pas d'utilisateur (token absent ou invalide)
    if (!user) {
      throw new UnauthorizedException('Authentification requise');
    }

    return user;
  }
}
```

---

## Annexe D : Securite specifique Flutter (mobile)

### D.1 Stockage securise cote mobile

| Donnee | Stockage | Mecanisme |
|--------|----------|-----------|
| JWT access token | `flutter_secure_storage` | Keychain (iOS) / Keystore (Android) -- chiffrement hardware |
| JWT refresh token | `flutter_secure_storage` | Idem -- ne jamais stocker en SharedPreferences |
| Supabase anon key | Code source (publique) | Pas de secret, protege par RLS |
| Cache hors-ligne (favoris, historique) | SQLite chiffre (`sqflite` + `encrypt_shared_preferences`) | Donnees non critiques, chiffrement optionnel |
| QR code de retrait | Memoire volatile uniquement | Ne jamais persister le QR code sur le filesystem -- le regenerer a chaque affichage |

### D.2 Certificate pinning

Le certificate pinning empeche les attaques Man-in-the-Middle (MITM) en verifiant que le certificat TLS du serveur correspond a un hash connu.

**Decision : certificate pinning recommande mais pas obligatoire au MVP.**

**Justification** :
- Cloudflare gere la terminaison TLS avec des certificats renouveles automatiquement
- Le pinning requiert une mise a jour de l'app a chaque renouvellement de certificat (tous les 90 jours avec Let's Encrypt via Cloudflare)
- En cas de pin expire + utilisateur qui n'a pas mis a jour l'app = app inutilisable
- Le rapport risque/benefice est defavorable au lancement pour un marche de 1.3M habitants

**Si implemente (post-MVP)** : utiliser le package `http_certificate_pinning` avec un pin sur le certificat Cloudflare intermediate (plus stable que le leaf certificate).

### D.3 Protection contre le reverse engineering

| Mesure | Outil | Priorite |
|--------|-------|----------|
| Obfuscation du code Dart | `flutter build --obfuscate --split-debug-info=build/debug-info` | P0 (gratuit, natif Flutter) |
| Proguard/R8 (Android) | Active par defaut en release build | P0 |
| Bitcode (iOS) | Active par defaut | P0 |
| Detection de root/jailbreak | `flutter_jailbreak_detection` | P2 (post-MVP) |
| Detection d'emulateur | Custom check | P2 (post-MVP, utile pour la fraude -- cf. ADR-019) |
| Tampering detection | `freerasp` (Talsec) | P2 (post-MVP) |

> **Note** : les verifications root/jailbreak et tampering detection ne doivent PAS bloquer l'app mais plutot : (1) logger l'evenement, (2) desactiver les fonctions sensibles (paiement), (3) alerter le systeme anti-fraude (ADR-019).

### D.4 Deep links et schema d'URL

Les deep links Flutter (pour OAuth callbacks, partage, etc.) doivent etre securises :

| Risque | Mitigation |
|--------|-----------|
| Schema custom (`bienbon://`) intercepte par une app malveillante | Utiliser des Universal Links (iOS) / App Links (Android) avec verification de domaine (`https://bienbon.mu/.well-known/assetlinks.json`) |
| Callback OAuth intercepte | Les tokens OAuth sont transmis via des canaux securises (Supabase Auth gere le callback via un redirect HTTPS) |
| Injection de parametres dans le deep link | Valider et sanitiser tous les parametres de deep link avant utilisation |

---

## Annexe E : HttpExceptionFilter -- pas de fuite d'information

Le filtre d'exceptions global garantit qu'aucune stack trace ou detail technique ne soit expose aux clients en production.

```typescript
// src/common/filters/http-exception.filter.ts

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    let status: number;
    let message: string;
    let errorCode: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Extraire le message sans exposer les details internes
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        message = (resp.message as string) || 'Erreur';
        errorCode = (resp.errorCode as string) || undefined;
      }
    } else {
      // Erreur non-HTTP (erreur interne non prevue)
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Erreur interne du serveur';

      // Logger la stack trace en interne, JAMAIS l'exposer au client
      this.logger.error(
        `Unhandled exception: ${exception instanceof Error ? exception.message : 'Unknown'}`,
        exception instanceof Error ? exception.stack : undefined,
        {
          path: request.url,
          method: request.method,
          ip: request.ip,
          userId: (request as any).user?.id || 'anonymous',
        },
      );
    }

    // Reponse sanitisee -- pas de stack trace, pas de details SQL,
    // pas de noms de tables, pas de chemins de fichiers
    const sanitizedResponse: Record<string, unknown> = {
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Ajouter le code d'erreur metier si present (ex: 'BASKET_SOLD_OUT')
    if (errorCode) {
      sanitizedResponse.errorCode = errorCode;
    }

    // En dev, ajouter la stack trace pour le debugging
    if (process.env.NODE_ENV !== 'production' && exception instanceof Error) {
      sanitizedResponse.stack = exception.stack;
      sanitizedResponse.debug = exception.message;
    }

    response.status(status).send(sanitizedResponse);
  }
}
```

**Enregistrement global dans `main.ts` :**

```typescript
// main.ts
app.useGlobalFilters(new GlobalExceptionFilter());
```

**Erreurs a ne JAMAIS exposer au client :**

| Type d'erreur interne | Ce que le client voit | Ce qui est logue |
|-----------------------|----------------------|------------------|
| `PrismaClientKnownRequestError` (erreur SQL) | `500 Erreur interne du serveur` | Requete SQL, table, contrainte violee |
| `TypeError: Cannot read property 'x' of undefined` | `500 Erreur interne du serveur` | Stack trace complete |
| `Error: ECONNREFUSED (Redis down)` | `503 Service temporairement indisponible` | Adresse Redis, details de connexion |
| `UnauthorizedException` | `401 Authentification requise` | Token (tronque), IP, raison |
| `ForbiddenException` | `403 Acces refuse` | userId, ressource demandee, permissions |

---

## Annexe F : Pipeline CI securite complet (GitHub Actions)

```yaml
# .github/workflows/security.yml

name: Security Pipeline
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  # ============================================================
  # Job 1 : Detection de secrets dans le code
  # ============================================================
  gitleaks:
    name: Secret Detection (Gitleaks)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0   # Historique complet pour scanner tous les commits
      - uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  # ============================================================
  # Job 2 : Audit des dependances (npm audit)
  # ============================================================
  npm-audit:
    name: Dependency Audit (npm)
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./backend    # Repertoire NestJS
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json
      - run: npm ci
      - name: npm audit (bloquant sur High/Critical)
        run: npm audit --audit-level=high
      - name: Verifier l'integrite du lockfile
        run: |
          # Verifier que package-lock.json est synchronise avec package.json
          npm ci --dry-run 2>&1 | grep -q "up to date" || {
            echo "ERREUR: package-lock.json n'est pas synchronise avec package.json"
            exit 1
          }

  # ============================================================
  # Job 3 : Verification des nouvelles dependances
  # ============================================================
  verify-deps:
    name: Verify New Dependencies
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    defaults:
      run:
        working-directory: ./backend
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2   # Pour comparer avec le commit parent
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - name: Detecter les nouvelles dependances
        run: |
          # Comparer package.json actuel avec le commit parent
          NEW_DEPS=$(diff \
            <(git show HEAD~1:backend/package.json 2>/dev/null | jq -r '(.dependencies // {}) + (.devDependencies // {}) | keys[]' | sort) \
            <(jq -r '(.dependencies // {}) + (.devDependencies // {}) | keys[]' package.json | sort) \
            | grep '^>' | sed 's/^> //' || true)

          if [ -z "$NEW_DEPS" ]; then
            echo "Aucune nouvelle dependance detectee."
            exit 0
          fi

          echo "Nouvelles dependances detectees :"
          echo "$NEW_DEPS"

          ERRORS=0
          for pkg in $NEW_DEPS; do
            echo "---"
            echo "Verification de $pkg..."

            # Verifier que le package existe sur npm
            if ! npm view "$pkg" version 2>/dev/null; then
              echo "::error::SLOPSQUATTING POTENTIEL: Le package '$pkg' n'existe pas sur npm !"
              ERRORS=$((ERRORS + 1))
              continue
            fi

            # Verifier le nombre de telechargements
            DOWNLOADS=$(curl -s "https://api.npmjs.org/downloads/point/last-week/$pkg" | jq '.downloads // 0')
            if [ "$DOWNLOADS" -lt 100 ]; then
              echo "::warning::Le package '$pkg' a seulement $DOWNLOADS telechargements/semaine. Verifier manuellement."
            else
              echo "OK: $pkg ($DOWNLOADS downloads/week)"
            fi
          done

          if [ $ERRORS -gt 0 ]; then
            echo "::error::$ERRORS package(s) n'existent pas sur npm. Verifier le code IA."
            exit 1
          fi

  # ============================================================
  # Job 4 : Verification de la configuration de securite
  # ============================================================
  security-config:
    name: Security Configuration Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Verifier les configurations dangereuses
        run: |
          ERRORS=0
          WARNINGS=0

          echo "=== Verification des configurations de securite ==="

          # 1. CORS origin: '*'
          if grep -rn "origin.*['\"]\\*['\"]" backend/src/ 2>/dev/null; then
            echo "::error::CORS origin '*' detecte dans le code source"
            ERRORS=$((ERRORS + 1))
          fi

          # 2. DISABLE ROW LEVEL SECURITY
          if grep -rni "DISABLE ROW LEVEL SECURITY" backend/ supabase/ 2>/dev/null; then
            echo "::error::DISABLE ROW LEVEL SECURITY detecte"
            ERRORS=$((ERRORS + 1))
          fi

          # 3. service_role dans le code Flutter
          if grep -rni "service_role" mobile/ flutter/ lib/ 2>/dev/null; then
            echo "::error::Reference a service_role dans le code client"
            ERRORS=$((ERRORS + 1))
          fi

          # 4. $queryRawUnsafe / $executeRawUnsafe
          if grep -rn "queryRawUnsafe\|executeRawUnsafe" backend/src/ 2>/dev/null; then
            echo "::error::Utilisation de queryRawUnsafe/executeRawUnsafe detectee"
            ERRORS=$((ERRORS + 1))
          fi

          # 5. eval() dans le backend
          if grep -rn "[^a-zA-Z]eval(" backend/src/ 2>/dev/null; then
            echo "::error::Utilisation de eval() detectee dans le backend"
            ERRORS=$((ERRORS + 1))
          fi

          # 6. dangerouslySetInnerHTML dans l'admin React
          if grep -rn "dangerouslySetInnerHTML" admin/src/ 2>/dev/null; then
            echo "::warning::dangerouslySetInnerHTML detecte dans l'admin React"
            WARNINGS=$((WARNINGS + 1))
          fi

          # 7. Swagger sans condition NODE_ENV
          if grep -rn "SwaggerModule.setup" backend/src/main.ts 2>/dev/null | grep -vq "NODE_ENV\|production"; then
            echo "::warning::Swagger potentiellement actif sans condition NODE_ENV"
            WARNINGS=$((WARNINGS + 1))
          fi

          # 8. .env avec des valeurs (pas .env.example)
          if [ -f backend/.env ] && [ "$(wc -l < backend/.env)" -gt 0 ]; then
            # Verifier s'il contient des valeurs (pas juste des commentaires et des cles sans valeurs)
            if grep -q "=." backend/.env 2>/dev/null; then
              echo "::error::Le fichier .env contient des valeurs et ne devrait pas etre commite"
              ERRORS=$((ERRORS + 1))
            fi
          fi

          echo ""
          echo "=== Resultat : $ERRORS erreur(s), $WARNINGS warning(s) ==="

          if [ $ERRORS -gt 0 ]; then
            exit 1
          fi

  # ============================================================
  # Job 5 : Lint de securite (ESLint rules custom)
  # ============================================================
  security-lint:
    name: Security Lint (ESLint)
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json
      - run: npm ci
      - name: ESLint (inclut les regles de securite custom)
        run: npm run lint

  # ============================================================
  # Job 6 : Audit Flutter (si applicable)
  # ============================================================
  flutter-audit:
    name: Flutter Dependency Audit
    runs-on: ubuntu-latest
    if: hashFiles('mobile/pubspec.yaml') != ''
    defaults:
      run:
        working-directory: ./mobile
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.x'
          channel: 'stable'
      - run: flutter pub get
      - name: Verifier les dependances obsoletes
        run: flutter pub outdated
      - name: Verifier le lockfile
        run: |
          if [ ! -f pubspec.lock ]; then
            echo "::error::pubspec.lock manquant. Il doit etre commite."
            exit 1
          fi
```

---

## Annexe G : Configuration ESLint complete -- regles de securite

```javascript
// eslint.config.mjs (extrait des regles de securite)
// A integrer dans la configuration ESLint existante du projet backend

export default [
  // ... autres configs ...
  {
    rules: {
      // ==============================================
      // Regles de securite BienBon (code genere par IA)
      // ==============================================

      // --- Injection ---
      'no-eval': 'error',
      'no-new-func': 'error',
      'no-implied-eval': 'error',

      // --- Patterns interdits ---
      'no-restricted-syntax': [
        'error',
        // $queryRawUnsafe / $executeRawUnsafe (injection SQL)
        {
          selector: "CallExpression[callee.property.name='$queryRawUnsafe']",
          message: 'SECURITE: $queryRawUnsafe est interdit. Utiliser $queryRaw avec template literals (parametrisation automatique Prisma).'
        },
        {
          selector: "CallExpression[callee.property.name='$executeRawUnsafe']",
          message: 'SECURITE: $executeRawUnsafe est interdit. Utiliser $executeRaw avec template literals.'
        },
        // innerHTML (XSS)
        {
          selector: "MemberExpression[property.name='innerHTML']",
          message: 'SECURITE: innerHTML est interdit. Utiliser textContent ou le rendu React standard.'
        },
        // dangerouslySetInnerHTML (XSS)
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: 'SECURITE: dangerouslySetInnerHTML est interdit. Utiliser le rendu React standard.'
        },
        // document.write (XSS)
        {
          selector: "CallExpression[callee.object.name='document'][callee.property.name='write']",
          message: 'SECURITE: document.write est interdit.'
        },
        // child_process (command injection)
        {
          selector: "CallExpression[callee.name='require'][arguments.0.value='child_process']",
          message: 'SECURITE: child_process est interdit dans le code applicatif.'
        },
        {
          selector: "ImportDeclaration[source.value='child_process']",
          message: 'SECURITE: child_process est interdit dans le code applicatif.'
        },
        // exec / execSync (command injection via child_process)
        {
          selector: "CallExpression[callee.property.name='exec']",
          message: 'SECURITE: exec() est potentiellement dangereux. Verifier qu\'il ne s\'agit pas de child_process.exec().'
        },
      ],

      // --- Modules interdits ---
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'child_process',
              message: 'SECURITE: child_process est interdit. Utiliser des librairies Node.js natives.'
            },
          ],
        },
      ],

      // --- Bonnes pratiques ---
      'no-var': 'error',             // Eviter var (scope issues)
      'prefer-const': 'error',       // Immutabilite
      'eqeqeq': ['error', 'always'], // Egalite stricte (eviter les coercitions dangereuses)
    },
  },
];
```

---

## Annexe H : Matrice de responsabilite securite (RACI)

| Domaine de securite | Tech Lead | Developpeur | Agent IA | DevOps / CI | Cloudflare |
|---------------------|:---------:|:-----------:|:--------:|:-----------:|:----------:|
| Configuration Helmet / headers | A | R | R | C | -- |
| CORS configuration | A | R | R | C | -- |
| Rate limiting NestJS | A | R | R | -- | -- |
| Rate limiting Cloudflare WAF | A | -- | -- | R | I |
| RLS Supabase policies | A | R | R | -- | -- |
| Ownership guards NestJS | A | R | R | -- | -- |
| Gitleaks configuration | A | C | -- | R | -- |
| npm audit en CI | A | I | -- | R | -- |
| Rotation des secrets | R | -- | -- | C | -- |
| Revue de securite PR (checklist) | R | C | -- | -- | -- |
| Lint rules ESLint securite | A | R | R | C | -- |
| Scan pre-production (OWASP ZAP) | R | C | -- | I | -- |
| Monitoring Sentry / Grafana | A | C | -- | R | -- |
| Allowlist de packages | A | C | -- | R | -- |
| Certificate management (TLS) | I | -- | -- | C | R |

**Legende** : **R** = Responsable (fait le travail), **A** = Accountable (decide, approuve), **C** = Consulte, **I** = Informe

---

## Annexe I : Recapitulatif de toutes les REGLE-SEC

| # | Regle | Section | Description |
|---|-------|---------|-------------|
| REGLE-SEC-001 | Ownership obligatoire | 2.2 | Tout endpoint avec `:id` DOIT avoir un guard de propriete OU une policy RLS. |
| REGLE-SEC-002 | Pas de queryRawUnsafe | 2.4 | `$queryRawUnsafe` et `$executeRawUnsafe` sont interdits. Utiliser les tagged template literals. |
| REGLE-SEC-003 | Pas de child_process | 2.4 | Aucun appel a `child_process.exec()` ou `execSync()` dans le code applicatif. |
| REGLE-SEC-004 | Pas de CORS wildcard / RLS off | 2.6 | `origin: '*'`, `DISABLE ROW LEVEL SECURITY`, et l'exposition de `service_role` cote client sont des defauts bloquants. |
| REGLE-SEC-005 | Pas de fetch URL utilisateur | 2.11 | Le backend ne doit JAMAIS effectuer de requete HTTP vers une URL fournie par l'utilisateur. Uploads par fichier uniquement. |
| REGLE-SEC-006 | Pas de dangerouslySetInnerHTML | 3.5 | Ne jamais utiliser `dangerouslySetInnerHTML` pour afficher du contenu utilisateur. |
| REGLE-SEC-007 | Pas de secrets dans le repo | 6.2 | `.env` est gitignore. `.env.example` est commite sans valeurs. Tout secret dans un commit est un incident. |
| REGLE-SEC-008 | Fail closed | Annexe C | Tout composant de securite DOIT echouer en mode "deny" en cas d'erreur interne. |

Ces regles sont conçues pour etre verifiables automatiquement (lint, CI, pre-commit) et constituent le minimum non negociable de securite pour tout code -- humain ou genere par IA -- du projet BienBon.
