# ADR-006 : Conformite PCI DSS et tokenisation

## Statut : Proposition

**Date** : 2026-02-27
**Auteur** : Equipe architecture BienBon.mu
**Relecteurs** : A definir
**Prerequis** : ADR-005 (architecture paiement), ADR-020 (hebergement infrastructure)

---

## Contexte

L'ADR-005 a defini l'architecture de paiement de BienBon.mu : Peach Payments comme gateway unique, avec Hosted Checkout / COPYandPAY pour que BienBon ne touche jamais les donnees de carte brutes. Ce choix permet d'etre eligible au **SAQ-A** (Self-Assessment Questionnaire A), le niveau de conformite PCI DSS le plus simple.

Cette ADR formalise et complete les aspects specifiques a la conformite PCI DSS v4.0.1 :

1. Le perimetre PCI DSS exact (in-scope vs hors-scope)
2. Le flow checkout et ses implications PCI
3. Le stockage des tokens et references de paiement
4. La gestion des cartes sauvegardees (US-C035)
5. Les regles de logging et masquage des donnees sensibles
6. La checklist SAQ-A v4.0.1 adaptee a BienBon

### Pourquoi cette ADR est necessaire

La conformite PCI DSS n'est pas optionnelle : tout marchand qui accepte les cartes Visa/Mastercard doit la respecter. Meme au niveau SAQ-A (le plus simple), un manquement expose BienBon a des amendes, a la revocation de l'acceptation des cartes, et a un risque reputationnel majeur pour une app de confiance alimentaire.

---

## Decision 1 : Perimetre PCI DSS

### Dans le scope PCI DSS (CDE -- Cardholder Data Environment)

Chez BienBon, le CDE est **vide**. BienBon ne stocke, ne traite et ne transmet jamais de donnees de carte (PAN, CVV, date d'expiration) sous aucune forme. L'integralite du CDE est delegue a Peach Payments (PCI DSS Level 1 certifie).

### Ce que BienBon gere (hors CDE, mais dans le perimetre SAQ-A)

| Element | Contenu | Sensibilite PCI |
|---------|---------|-----------------|
| `saved_payment_methods.provider_token` | `registrationId` Peach Payments | Token opaque, hors scope PCI (non reversible vers un PAN) |
| `saved_payment_methods.last_four` | 4 derniers chiffres de la carte | Autorise par PCI DSS (ne constitue pas un PAN complet) |
| `saved_payment_methods.brand` | "visa", "mastercard" | Pas de donnee sensible |
| `saved_payment_methods.expiry_month/year` | Mois/annee d'expiration | Autorise par PCI DSS sans protection speciale quand isole du PAN |
| `payment_transactions.provider_tx_id` | ID de transaction Peach | Reference opaque, hors scope |
| `payment_transactions.payment_display` | "**** 1234" ou "MCB Juice" | Masque, hors scope |

### Explicitement hors scope

| Element | Justification |
|---------|---------------|
| PAN complet (numero de carte) | Jamais vu, jamais stocke, jamais transmis par BienBon |
| CVV / CVC | Jamais vu, jamais stocke (meme Peach ne le stocke pas apres autorisation) |
| Donnees Track 1 / Track 2 | Card-not-present, pas applicable |
| PIN / PIN Block | Card-not-present, pas applicable |
| Donnees wallet MCB Juice / Blink / MauCAS | Pas des donnees de carte, gere par redirection wallet |

### Principe fondamental

> **BienBon ne voit jamais les donnees de carte brutes.** C'est la condition sine qua non du SAQ-A. Toute evolution architecturale qui introduirait un contact avec les donnees de carte (meme en transit) invaliderait cette conformite et necessiterait une re-evaluation (SAQ A-EP ou SAQ D).

---

## Decision 2 : Checkout flow et implications PCI

### Deux modes d'integration Peach Payments

| Mode | Usage | Flux des donnees carte | Niveau PCI |
|------|-------|----------------------|------------|
| **Hosted Checkout (redirect)** | Ajout d'une nouvelle carte, premier paiement | Le consommateur est redirige vers une page Peach Payments. BienBon ne voit rien. | SAQ-A |
| **COPYandPAY (widget JS/iframe)** | Paiement inline dans l'app Flutter (WebView) | Le widget Peach est charge dans une WebView. Les donnees carte sont saisies dans l'iframe Peach. BienBon ne voit rien. | SAQ-A |
| **Server-to-server avec token** | Paiement avec carte sauvegardee | BienBon envoie le `registrationId` (token opaque) a Peach. Pas de donnees carte. | SAQ-A |

### Flow detaille : ajout d'une nouvelle carte (US-C035)

```
1. Consommateur clique "Ajouter une carte"
2. App Flutter ouvre une WebView avec le Hosted Checkout Peach
   URL : https://checkout.peachpayments.com/v2/checkout?entityId=xxx&...
3. Le consommateur saisit ses donnees carte DANS la page Peach
   (les donnees carte ne passent jamais par les serveurs BienBon)
4. Peach valide la carte (optionnel : zero-auth de Rs 0 pour verification)
5. Peach retourne un registrationId (token) via callback URL
6. L'app envoie le registrationId au backend BienBon :
   POST /api/payment-methods
   { registrationId: "8ac7a4...", type: "card" }
7. Le backend BienBon :
   a. Appelle Peach GET /v1/registrations/{registrationId} pour recuperer
      les metadonnees non-sensibles (brand, last4, expiry)
   b. Stocke dans saved_payment_methods :
      - provider_token = registrationId
      - display_name = "Visa **** 1234"
      - brand = "visa"
      - last_four = "1234"
      - expiry_month = 12, expiry_year = 2028
   c. Ne stocke JAMAIS le PAN, le CVV ou toute donnee brute
8. Consommateur voit "Visa **** 1234" dans sa liste de moyens de paiement
```

### Flow detaille : paiement avec carte sauvegardee

```
1. Consommateur selectionne "Visa **** 1234" et confirme la reservation
2. Backend BienBon :
   a. Recupere le provider_token (registrationId) depuis saved_payment_methods
   b. POST Peach /v1/payments
      { paymentType: "PA", amount: 150, currency: "MUR",
        registrationId: "8ac7a4..." }
      (pas de donnees carte dans cette requete, seulement le token)
   c. Peach effectue la pre-autorisation aupres de la banque
   d. Retour : PA ID + status
3. Suite du flux normal (cf. ADR-005 Flux 1)
```

### Regle absolue pour l'equipe de developpement

> **Aucun endpoint de l'API BienBon ne doit accepter de champ contenant un numero de carte, un CVV, ou une date d'expiration complete.** Si un developpeur cree un DTO avec un champ `cardNumber`, `pan`, `cvv`, `cvc`, `expiryDate` ou equivalent, c'est un defaut de conformite. Les revues de code doivent verifier ce point systematiquement.

---

## Decision 3 : Stockage des tokens et references

### Tokens stockes par BienBon

| Table | Champ | Contenu | Origine | Usage |
|-------|-------|---------|---------|-------|
| `saved_payment_methods` | `provider_token` | `registrationId` Peach Payments | Retour du Hosted Checkout | Paiements recurrents avec carte sauvegardee |
| `payment_transactions` | `provider_tx_id` | ID unique de la transaction Peach | Retour de chaque appel Peach | Reconciliation, suivi, refunds |
| `payment_transactions` | `payment_token` | `registrationId` utilise pour ce paiement | Copie du token au moment du paiement | Audit, traçabilite |
| `payment_transactions` | `payment_display` | "**** 1234" ou "MCB Juice" | Construit par BienBon a partir des metadonnees | Affichage consommateur, recus |

### Tokens NON stockes par BienBon

| Token | Qui le gere | Pourquoi BienBon ne le stocke pas |
|-------|-------------|-----------------------------------|
| PAN tokenise (token de carte) | Peach Payments vault | Le `registrationId` est la reference de BienBon vers ce token. Peach gere le mapping token -> PAN en interne. |
| Checkout nonce / session ID | Peach Payments | Ephemere, usage unique, expire apres le checkout |
| CVV | Personne (interdit par PCI DSS) | Le CVV ne doit jamais etre stocke post-autorisation, meme par la gateway |

### Protection des tokens en base

Bien que les tokens Peach (`registrationId`) ne soient pas des donnees de carte et soient hors scope PCI, BienBon applique une protection defense-in-depth :

1. **Chiffrement au repos** : la base Supabase (PostgreSQL) est chiffree au repos (AES-256, gere par AWS)
2. **Acces restreint** : seul le module `payments` accede a `saved_payment_methods`. Les tokens ne sont jamais exposes dans les API consommateur/partenaire (l'API retourne `display_name`, jamais `provider_token`)
3. **Pas d'export brut** : les tokens ne figurent dans aucun export CSV, releve de reversement, ou rapport admin
4. **Suppression** : quand un consommateur supprime une carte sauvegardee, BienBon appelle Peach `DELETE /v1/registrations/{id}` puis supprime l'entree en base

---

## Decision 4 : Cartes sauvegardees (US-C035)

### Regles metier

1. Un consommateur peut sauvegarder **plusieurs cartes** et **plusieurs wallets mobile money**
2. Une carte est identifiee par son `registrationId` Peach, affichee comme "Visa **** 1234"
3. Un wallet mobile money est identifie par son type (MCB Juice, Blink, MauCAS) -- pas de token persistant (chaque paiement wallet est une nouvelle session)
4. Le consommateur peut definir un **moyen de paiement par defaut** (`is_default = true`)
5. La suppression d'une carte est **interdite** si une pre-autorisation est active (`has_active_preauth = true`)
6. Les cartes expirees sont marquees `is_expired = true` via un job CRON mensuel qui verifie `expiry_month/year`

### Vault : responsabilites

| Responsabilite | Qui |
|----------------|-----|
| Stocker le PAN tokenise (vault) | Peach Payments |
| Stocker la reference vers le vault (`registrationId`) | BienBon |
| Afficher les 4 derniers chiffres et le reseau | BienBon |
| Gerer l'expiration et l'invalidation des tokens | Peach Payments (token expire si la carte expire ou est revoquee par la banque) |
| Detecter un token invalide | BienBon, via le code erreur Peach lors d'un paiement (ex: `800.100.151` carte expiree) |

---

## Decision 5 : Logs et donnees sensibles

### Regles de logging

| Donnee | Autorise dans les logs ? | Format autorise |
|--------|:------------------------:|-----------------|
| PAN (numero de carte) | **NON, JAMAIS** | -- |
| CVV / CVC | **NON, JAMAIS** | -- |
| Date d'expiration complete | **NON, JAMAIS** | -- |
| `registrationId` (token Peach) | Oui, avec precaution | Tronque : `8ac7a4...b3f2` (8 premiers + 4 derniers) |
| `provider_tx_id` | Oui | Complet (necessaire pour le debugging et la reconciliation) |
| 4 derniers chiffres | Oui | `**** 1234` |
| Montant de la transaction | Oui | Complet |
| Methode de paiement | Oui | `card`, `mcb_juice`, `blink`, `maucas` |
| Consumer ID | Oui | UUID complet |
| Reponse brute de Peach Payments | **Avec filtre** | Filtrer tout champ `card.*` sauf `card.last4Digits` et `card.brand` |

### Implementation : filtre de log NestJS

```typescript
// src/common/filters/pci-log-sanitizer.ts

const PCI_SENSITIVE_PATTERNS = [
  /\b\d{13,19}\b/g,                    // PAN potentiel (13-19 chiffres consecutifs)
  /\b\d{3,4}\b(?=.*cvv|cvc|csc)/gi,   // CVV potentiel en contexte
  /"card\.number"\s*:\s*"[^"]+"/g,     // champ card.number dans JSON
  /"card\.cvv"\s*:\s*"[^"]+"/g,        // champ card.cvv dans JSON
  /"card\.expiryMonth"\s*:\s*"[^"]+"/g,
  /"card\.expiryYear"\s*:\s*"[^"]+"/g,
];

export function sanitizeForLog(data: unknown): unknown {
  const serialized = JSON.stringify(data);
  let sanitized = serialized;
  for (const pattern of PCI_SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '"[PCI_REDACTED]"');
  }
  return JSON.parse(sanitized);
}
```

### Recus et affichage (US-C037)

- Le recu PDF affiche : `Visa **** 1234` ou `MCB Juice`
- Le recu n'affiche **jamais** le PAN complet, le CVV, ou la date d'expiration
- Le recu inclut le `provider_tx_id` comme reference de transaction (utile en cas de dispute bancaire)

---

## Decision 6 : HTTPS everywhere

| Composant | Protocole | Responsable | Mecanisme |
|-----------|-----------|-------------|-----------|
| App Flutter <-> API BienBon | HTTPS (TLS 1.2+) | Cloudflare (terminaison TLS) + Railway | Certificat SSL automatique Cloudflare, SSL mode Full (Strict) |
| API BienBon <-> Peach Payments | HTTPS (TLS 1.2+) | Peach Payments | Certificat SSL Peach, verifie par le client HTTP NestJS |
| API BienBon <-> Supabase | HTTPS (TLS 1.2+) | Supabase (AWS) | Connexion PostgreSQL via SSL, Supabase enforce SSL |
| Widget COPYandPAY / Hosted Checkout | HTTPS (TLS 1.2+) | Peach Payments | Domaine Peach avec certificat SSL |
| Admin React <-> API BienBon | HTTPS (TLS 1.2+) | Cloudflare | Meme certificat que l'API |
| Webhooks Peach -> BienBon | HTTPS (TLS 1.2+) | Cloudflare + verification HMAC | Signature HMAC verifiee par le backend (cf. ADR-005) |

### Regle : pas de HTTP en production

> **Aucun composant de BienBon ne doit communiquer en HTTP non chiffre en production.** Cloudflare est configure avec "Always Use HTTPS" et HSTS active. Les redirections HTTP -> HTTPS sont automatiques.

---

## Decision 7 : Checklist SAQ-A PCI DSS v4.0.1

BienBon est eligible au SAQ-A car :

- Toutes les transactions sont **card-not-present** (e-commerce / mobile app)
- Tout le traitement des donnees de carte est **entierement externalise** a Peach Payments (PCI DSS Level 1)
- BienBon ne stocke, ne traite et ne transmet **aucune donnee de carte** sous forme electronique
- Le site / l'app n'est **pas susceptible aux attaques par scripts** affectant les donnees de paiement (critere d'eligibilite v4.0.1)

### Exigences SAQ-A v4.0.1 et conformite BienBon

Les exigences du SAQ-A v4.0.1 sont regroupees par domaine PCI DSS. Depuis la revision v4.0.1 r1 (janvier 2025), les exigences 6.4.3, 11.6.1 et 12.3.1 ont ete **retirees du SAQ-A** pour les marchands qui confirment que leur site n'est pas susceptible aux attaques par scripts.

#### Exigence 2 : Configuration securisee des composants

| Req. | Exigence | Conformite BienBon |
|------|----------|-------------------|
| 2.1.1 | Roles et responsabilites documentes pour la configuration securisee | Document present (cette ADR + ADR-020). L'equipe dev est responsable de la configuration securisee de Railway, Cloudflare, Supabase. |
| 2.1.2 | Roles et responsabilites assignes et compris | Le tech lead est responsable PCI. Revu trimestriellement. |

#### Exigence 6 : Developpement et maintenance securises

| Req. | Exigence | Conformite BienBon |
|------|----------|-------------------|
| 6.2.4 | Techniques de developpement logiciel securise pour prevenir les vulnerabilites courantes | Revues de code obligatoires. ESLint strict. Pas de donnees carte dans le code. Dependances auditees via `npm audit`. |
| 6.3.1 | Les vulnerabilites de securite sont identifiees et gerees | Dependabot active sur GitHub. Alertes CVE surveillees. |
| 6.3.3 | Les correctifs de securite critiques sont deployes dans le mois suivant leur publication | Pipeline CI/CD Railway permet le deploiement rapide. Les patches critiques sont deployes sous 72h (cible), 30 jours (maximum). |

#### Exigence 8 : Identification et authentification

| Req. | Exigence | Conformite BienBon |
|------|----------|-------------------|
| 8.2.1 | Chaque utilisateur dispose d'un identifiant unique | Supabase Auth assigne un UUID unique a chaque utilisateur. Les comptes admin Railway/Cloudflare/Supabase/GitHub sont individuels. |
| 8.2.2 | Les comptes partages/generiques sont interdits (sauf exceptions documentees et limitees dans le temps) | Politique : aucun compte partage. Les comptes de service (CI/CD) sont documentes et individuellement tracables. |
| 8.2.5 | L'acces des utilisateurs desactives est immediatement revoque | Checklist offboarding : revocation Supabase, Railway, Cloudflare, GitHub dans les 24h. |
| 8.3.1 | L'authentification requiert un mot de passe, un token ou un facteur biometrique | Supabase Auth + MFA pour les admins (cf. ADR-010). Railway, Cloudflare, GitHub : SSO ou MFA obligatoire. |
| 8.3.5 | Les mots de passe initiaux sont uniques et forces au premier usage | Supabase Auth genere des liens d'invitation uniques. Pas de mots de passe initiaux par defaut. |
| 8.3.6 | Les mots de passe font au minimum 12 caracteres avec lettres et chiffres | Supabase Auth configure avec `minPasswordLength: 12`. Politique de mot de passe documentee pour les outils internes (Railway, etc.). |
| 8.3.7 | Les 4 derniers mots de passe ne peuvent pas etre reutilises | Supabase Auth ne supporte pas nativement l'historique des mots de passe. Mitigation : MFA obligatoire pour les admins, rotation annuelle recommandee. Risque accepte (SAQ-A, pas de donnees carte en base). |
| 8.3.9 | Les mots de passe sont changes tous les 90 jours OU le MFA est active | MFA active pour tous les comptes admin (Supabase, Railway, Cloudflare, GitHub). Exigence satisfaite par le MFA. |

#### Exigence 9 : Acces physique

| Req. | Exigence | Conformite BienBon |
|------|----------|-------------------|
| 9.9.1 | Les terminaux POI sont proteges contre la falsification | **Non applicable.** BienBon est 100% e-commerce / mobile app. Aucun terminal physique de paiement. |

#### Exigence 11 : Tests de securite reguliers

| Req. | Exigence | Conformite BienBon |
|------|----------|-------------------|
| 11.3.2 | Scans de vulnerabilite externe trimestriels par un ASV (Approved Scanning Vendor) | **A mettre en place.** Un ASV doit etre selectionne et les scans trimestriels programmes. Options : Qualys, SecurityMetrics, Rapid7. Cout estime : 100-500 USD/an. |
| 11.3.2.1 | Re-scan apres changements significatifs ; re-scan jusqu'a resolution des vulnerabilites CVSS >= 4.0 | Integre dans le processus CI/CD : tout deploiement majeur declenche un re-scan. Les vulnerabilites CVSS >= 4.0 sont bloquantes pour la mise en production. |

#### Exigence 12 : Politiques de securite

| Req. | Exigence | Conformite BienBon |
|------|----------|-------------------|
| 12.1.1 | Une politique de securite de l'information est etablie et publiee | Document a rediger (politique de securite BienBon). Cible : avant le lancement en production. |
| 12.8.1 | Une liste des TPSP avec lesquels les donnees de carte sont partagees est maintenue | Liste : Peach Payments (seul TPSP). Aucun autre tiers ne voit les donnees de carte. |
| 12.8.2 | Des accords ecrits avec les TPSP incluent la responsabilite PCI DSS | Contrat Peach Payments a signer. Verification de la clause de responsabilite PCI DSS. |
| 12.8.3 | Un processus est etabli pour la due diligence des TPSP avant engagement | Due diligence Peach Payments effectuee : certification PCI DSS Level 1 verifiee, AOC (Attestation of Compliance) demandee. |
| 12.8.4 | Le statut PCI DSS des TPSP est surveille annuellement | Rappel annuel : verifier la certification PCI DSS de Peach Payments. Demander l'AOC a jour chaque annee. |
| 12.8.5 | La responsabilite PCI DSS de chaque TPSP est clairement definie | Peach Payments : responsable du CDE complet (stockage, traitement, transmission des donnees carte, tokenisation, vault). BienBon : responsable de la conformite SAQ-A (acces, logs, scans, politiques). |

#### Critere d'eligibilite v4.0.1 : protection contre les attaques par scripts

Depuis la revision v4.0.1 r1, les exigences 6.4.3 et 11.6.1 ont ete retirees du SAQ-A. En contrepartie, le marchand doit **confirmer que son site n'est pas susceptible aux attaques par scripts** affectant les donnees de paiement.

BienBon satisfait ce critere par :

| Mesure | Detail |
|--------|--------|
| **Pas de page de paiement hebergee par BienBon** | Le checkout est une redirection vers Peach Payments ou un iframe Peach. Aucun formulaire de carte sur le domaine BienBon. |
| **CSP (Content Security Policy)** | Headers CSP stricts via Cloudflare : `script-src 'self' https://checkout.peachpayments.com`. Bloque l'injection de scripts tiers non autorises. |
| **SRI (Subresource Integrity)** | Les scripts externes charges par l'admin React utilisent des hashes SRI pour detecter toute modification. |
| **Cloudflare WAF** | Regles WAF activees pour bloquer les attaques XSS, injection SQL et script injection. |
| **Dependabot + npm audit** | Les dependances front-end sont surveillees pour les vulnerabilites connues. |
| **Confirmation TPSP** | Peach Payments confirme que son widget COPYandPAY, utilise selon leurs instructions, protege la page marchande contre les attaques par scripts ciblant les donnees de paiement. |

---

## Actions requises avant la mise en production

| # | Action | Priorite | Responsable | Statut |
|---|--------|----------|-------------|--------|
| 1 | Selectionner un ASV pour les scans trimestriels (req. 11.3.2) | Haute | Tech lead | A faire |
| 2 | Rediger la politique de securite de l'information (req. 12.1.1) | Haute | Tech lead + CTO | A faire |
| 3 | Signer le contrat Peach Payments avec clause PCI DSS (req. 12.8.2) | Haute | CEO + CTO | A faire |
| 4 | Demander l'AOC (Attestation of Compliance) de Peach Payments (req. 12.8.3) | Haute | Tech lead | A faire |
| 5 | Configurer les headers CSP sur Cloudflare | Moyenne | Dev | A faire |
| 6 | Implementer le filtre de log PCI (`pci-log-sanitizer.ts`) | Moyenne | Dev | A faire |
| 7 | Documenter la politique de mots de passe (12 caracteres min, MFA admins) | Moyenne | Tech lead | A faire |
| 8 | Configurer Dependabot sur le repo GitHub | Basse | Dev | A faire |
| 9 | Completer et soumettre le SAQ-A | Haute | Tech lead | A faire (avant lancement) |
| 10 | Programmer le rappel annuel de verification AOC Peach Payments | Basse | Tech lead | A faire |

---

## Consequences

### Positives

1. **Scope PCI minimal** : en ne touchant jamais les donnees de carte, BienBon reste au SAQ-A (~26 exigences au lieu de 300+ pour un SAQ-D). Le cout de conformite est minimal pour une startup.

2. **Securite par design** : l'architecture rend physiquement impossible la fuite de donnees de carte depuis les systemes BienBon, puisque ces donnees n'y transitent jamais.

3. **Audit simple** : le SAQ-A est une auto-evaluation. Pas besoin d'un QSA (Qualified Security Assessor) externe, sauf si le volume de transactions depasse 6 millions/an (tres improbable au lancement).

4. **Defense-in-depth** : meme pour les tokens (hors scope PCI), BienBon applique le chiffrement au repos, le controle d'acces, et le masquage dans les logs.

### Negatives

1. **Dependance a Peach Payments pour la conformite** : si Peach perd sa certification PCI DSS Level 1, BienBon doit trouver un nouveau provider ou assumer une partie du CDE. Mitigation : verification annuelle de l'AOC Peach.

2. **Scans ASV trimestriels** : cout recurrent (100-500 USD/an) et charge operationnelle. Necessaire meme si BienBon ne stocke aucune donnee de carte.

3. **Contrainte sur l'evolution** : toute fonctionnalite future qui impliquerait un contact avec les donnees de carte (ex: saisie de carte custom, migration vers un autre processor avec server-to-server) necessiterait une re-evaluation complete du niveau PCI.

4. **Req. 8.3.7 partiellement couvert** : Supabase Auth ne supporte pas nativement l'historique des mots de passe. Le risque est accepte car le MFA est obligatoire et aucune donnee de carte n'est presente dans les systemes BienBon.

---

## Risques

| Risque | Probabilite | Impact | Mitigation |
|--------|:-----------:|:------:|------------|
| Un developpeur introduit accidentellement un endpoint qui accepte des donnees de carte | Faible | Critique | Revue de code obligatoire. Lint rule custom pour detecter les champs `cardNumber`, `pan`, `cvv`, `cvc` dans les DTOs. Tests CI. |
| Peach Payments perd sa certification PCI DSS | Tres faible | Critique | Verification annuelle de l'AOC. Le module gateway est abstrait (ADR-005) : migration possible vers un autre provider certifie. |
| Un scan ASV revele une vulnerabilite CVSS >= 4.0 | Moyenne | Moyen | Processus de patch : correction sous 72h (cible), re-scan pour validation. Les deploiements Railway sont rapides. |
| Les logs contiennent accidentellement des donnees sensibles | Faible | Eleve | Filtre PCI dans le logger NestJS. Revue des logs en staging avant la production. Rotation des logs avec retention limitee (90 jours). |
| Le widget COPYandPAY est compromis (attaque supply-chain) | Tres faible | Critique | Le widget est charge depuis le CDN Peach (HTTPS). CSP restreint les sources de scripts. Peach Payments est responsable de la securite de son widget (couvert par leur certification PCI). |

---

## References

### PCI DSS
- [PCI DSS v4.0 SAQ-A (PDF officiel)](https://listings.pcisecuritystandards.org/documents/PCI-DSS-v4-0-SAQ-A.pdf)
- [PCI DSS v4.0.1 SAQ-A r1 (revision janvier 2025)](https://treasurer.nebraska.gov/tm/pci-dss/documents/PCI_DSS_v4_0_1_SAQ_A_r1.pdf)
- [Annonce PCI SSC : mises a jour SAQ-A](https://blog.pcisecuritystandards.org/important-updates-announced-for-merchants-validating-to-self-assessment-questionnaire-a)
- [FAQ PCI SSC : criteres d'eligibilite SAQ-A pour l'e-commerce](https://blog.pcisecuritystandards.org/faq-clarifies-new-saq-a-eligibility-criteria-for-e-commerce-merchants)
- [PCI DSS v4.0.1 : changements pour SAQ-A (Dionach)](https://www.dionach.com/project/pci-dss-4-ecommerce-changes-for-saq-a-explained/)
- [PCI DSS v4.0.1 : changements 6.4.3 et 11.6.1 (Jscrambler)](https://jscrambler.com/blog/pci-dss-4-0-1)
- [Eligibilite SAQ-A PCI DSS 4.0 (Hyperproof)](https://hyperproof.io/resource/pci-dss-4-0-update-new-saq-a-eligibility-criteria/)
- [PCI DSS Tokenization Guidelines](https://www.pcisecuritystandards.org/documents/Tokenization_Guidelines_Info_Supplement.pdf)

### ADR BienBon
- ADR-005 : Architecture de paiement (Peach Payments, COPYandPAY, tokenisation, ledger)
- ADR-010 : Strategie d'authentification (MFA admins, Supabase Auth)
- ADR-020 : Hebergement et infrastructure (Railway, Cloudflare, Supabase)

### Peach Payments
- [Peach Payments Developer Hub](https://developer.peachpayments.com/)
- [Peach Payments Tokenisation](https://support.peachpayments.com/support/solutions/articles/47001159225-getting-started-with-tokenisation)
- [COPYandPAY Integration](https://developer.peachpayments.com/docs/copy-and-pay)
