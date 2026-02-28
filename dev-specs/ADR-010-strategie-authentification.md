# ADR-010 : Strategie d'authentification

| Champ         | Valeur                                                    |
|---------------|-----------------------------------------------------------|
| **Statut**    | Propose                                                   |
| **Date**      | 2026-02-27                                                |
| **Auteur**    | Kevin (assiste par Claude Opus 4.6)                       |
| **Decideurs** | Equipe technique BienBon                                  |
| **Scope**     | Authentification, autorisation, gestion des identites      |
| **Refs**      | US-C001 a US-C007, US-P001, US-T001, DESIGN_SYSTEM.md    |

---

## 1. Contexte

BienBon.mu est une marketplace mobile-first de paniers anti-gaspi a l'ile Maurice. Le systeme d'authentification doit supporter :

**3 types d'utilisateurs :**
- **Consommateurs** : inscription/connexion multi-methodes (email, telephone +230, Google, Facebook, Apple)
- **Partenaires** : inscription avec formulaire stepper 4 etapes, validation admin requise (documents BRN, Food License)
- **Admins** : backoffice web, comptes crees manuellement avec identifiants temporaires

**Applications clientes :**
- App mobile Flutter (iOS + Android) -- consommateurs et partenaires
- App web (potentiellement Flutter Web) -- tous les profils
- Site vitrine (bienbon.mu) -- pas d'auth sauf formulaire inscription partenaire

**Exigences fonctionnelles extraites des specs (US-C001 a US-C007, US-P001) :**
- 5 methodes d'inscription consommateur : email+mdp, telephone+OTP, Google OAuth, Facebook OAuth, Apple Sign-In
- Session persistante de 30 jours d'inactivite
- Verrouillage apres 5 tentatives echouees (cooldown 15 min)
- Mot de passe oublie par email (lien expire 1h, usage unique)
- Suppression de compte avec export de donnees (Data Protection Act 2017 Maurice)
- Navigation en mode invite (browse sans reservation)
- Inscription partenaire en statut "en attente de validation"
- Verification email (lien expire 24h) et telephone (OTP 6 chiffres, expire 10min)

**Contraintes de securite transversales (US-T001) :**
- HTTPS obligatoire
- CSRF tokens
- Rate limiting sur endpoints d'auth
- XSS/injection protection
- Verification du statut du compte a chaque requete authentifiee (suspension/bannissement)

---

## 2. Questions a trancher

| #  | Question                                                                                   |
|----|--------------------------------------------------------------------------------------------|
| Q1 | Auth maison vs service manage ?                                                            |
| Q2 | Federation de comptes : que faire si un user s'inscrit par email puis Google (meme email) ? |
| Q3 | Strategie de tokens : JWT stateless vs sessions server-side ?                              |
| Q4 | Multi-role : un meme email peut-il etre consommateur ET partenaire ?                       |
| Q5 | Quel provider SMS OTP pour Maurice (+230) ?                                                |
| Q6 | Comment gerer le "Hide My Email" d'Apple Sign-In ?                                        |

---

## 3. Options evaluees

### 3.1 Service d'authentification

#### Option A : Supabase Auth

**Description :** Service d'authentification integre a la plateforme Supabase, base sur GoTrue (serveur Go open-source). Supporte email, phone (via Twilio/Vonage/MessageBird), OAuth (Google, Facebook, Apple, etc.). S'integre nativement avec PostgreSQL et le Row Level Security (RLS).

**Pricing (fevrier 2026) :**
- Free : 50 000 MAU inclus, 500 MB database, 1 GB storage
- Pro : 25 $/mois, 100 000 MAU inclus, puis 0,00325 $/MAU additionnel
- Team : 599 $/mois, limites plus elevees
- Phone auth : Supabase ne facture pas les SMS directement ; le cout depend du provider SMS configure (Twilio, Vonage, MessageBird)

**SDK Flutter :** `supabase_flutter` v2 -- SDK officiel, activement maintenu, mises a jour hebdomadaires. Support complet (Android, iOS, Web, macOS, Windows). Dart 3, type-safe. Documentation de qualite avec exemples Flutter dedies.

**Points forts :**
- Si Supabase est choisi pour la DB, l'auth est "gratuite" (meme plateforme)
- RLS integre : les policies de securite sont definies au niveau SQL
- GoTrue est open-source : possibilite de self-hosting
- 50K MAU gratuits (tres genereux pour un lancement)
- Support natif phone auth avec choix du provider SMS
- Hook "Send SMS" pour integrer n'importe quel provider SMS custom

**Points faibles :**
- Le SDK Flutter, bien que de qualite, est moins mature que FlutterFire
- Le phone auth depend d'un provider SMS tiers a configurer
- Le self-hosting ne beneficie pas des backups automatiques, logs, et email templates du cloud

#### Option B : Firebase Auth

**Description :** Service d'authentification de Google, extremement mature. SDKs Flutter excellents via le projet FlutterFire (maintenu par Google et l'equipe Flutter). Supporte tous les providers demandes.

**Pricing (fevrier 2026) :**
- Spark (gratuit) : 50 000 MAU, PAS de phone auth SMS
- Blaze (pay-as-you-go) : 50 000 MAU gratuits, puis facturation Identity Platform
- Phone auth SMS : 0,01 $ a 0,06 $ par SMS selon le pays (Maurice : probablement ~0,04-0,06 $)
- Au-dela de 50K MAU : migration vers Google Cloud Identity Platform requise (pricing plus complexe)

**SDK Flutter :** `firebase_auth` (FlutterFire) -- SDK de reference, maintenu par Google. Le plus mature et le plus utilise pour Flutter. Support complet iOS, Android, Web, macOS.

**Points forts :**
- SDK Flutter le plus mature et le mieux documente (FlutterFire)
- Tres large communaute, enorme base de tutoriels et exemples
- Phone auth integre (pas de provider tiers a configurer)
- Anonymous auth pour le mode invite
- 50K MAU gratuits suffisants pour le lancement
- Multi-factor auth (MFA) integre

**Points faibles :**
- Vendor lock-in Google fort : l'auth est couplee a l'ecosysteme Firebase/GCP
- Si le backend n'est PAS Firebase (ex: backend custom, Supabase DB), on a un split d'infrastructure
- Phone auth SMS facture par Google (pas de choix de provider local)
- Pas de self-hosting possible
- Les donnees sont stockees chez Google (USA) -- question de souverainete pour le DPA Maurice
- Identity Platform requis au-dela de 50K MAU, complexite tarifaire

#### Option C : Auth0

**Description :** Plateforme d'identite enterprise-grade (Okta). Tres complete (OIDC, SAML, MFA, federation). Tous les providers supportes.

**Pricing (fevrier 2026) :**
- Free : 25 000 MAU (augmente depuis 2024)
- B2C Essentials : 35 $/mois pour 500 MAU
- B2C Professional : 240 $/mois pour 1 000 MAU
- Startup program : gratuit 1 an, 100K MAU
- Escalade tarifaire brutale documentee : passages de ~3 000 $/an a des contrats a 6 chiffres apres certains seuils

**SDK Flutter :** `auth0_flutter` -- SDK officiel. Correct mais moins d'exemples et de communaute que FlutterFire ou Supabase.

**Points forts :**
- Tres complet fonctionnellement (federation, MFA, breached password detection, anomaly detection)
- Universal Login (page hebergee) reduit la surface d'attaque
- Startup program genereux (1 an gratuit, 100K MAU)
- Conformite enterprise (SOC2, HIPAA, GDPR)

**Points faibles :**
- **Cout prohibitif a l'echelle** : la tarification B2C explose apres le free tier. Pour une app grand public a Maurice, c'est un risque financier majeur
- Overhead d'integration : Auth0 est concu pour des cas enterprise complexes
- Universal Login = UX moins fluide (redirection vers une page Auth0)
- Pas de self-hosting (SaaS uniquement)
- Donnees hebergees aux USA/EU (question DPA Maurice)
- SDK Flutter moins documente que FlutterFire

#### Option D : Clerk

**Description :** Plateforme d'auth moderne, orientee developer experience. UI pre-construites, bon DX. Tous les providers supportes.

**Pricing (fevrier 2026) :**
- Free : 10 000 MAU inclus
- Pro : 25 $/mois, 10 000 MAU inclus, puis 0,02 $/MAU additionnel
- Add-ons : MFA a 100 $/mois, SAML a 50 $/connexion, RBAC custom a 100 $/mois
- Le MFA est un add-on payant (100 $/mois) -- contrairement a Supabase/Firebase ou c'est inclus

**SDK Flutter :** `clerk_flutter` -- SDK officiel **en beta** (public beta annoncee mars 2025). iOS, Android, Web. Encore jeune, documentation limitee.

**Points forts :**
- DX excellente (composants UI pre-construits, hooks React)
- Pricing transparent et previsible (0,02 $/MAU)
- Modern stack, bonne integration avec les frameworks web modernes

**Points faibles :**
- **SDK Flutter en beta** : risque de stabilite pour une app mobile en production
- MFA en add-on payant (100 $/mois)
- RBAC custom en add-on payant (100 $/mois) -- necessaire pour le multi-role consommateur/partenaire/admin
- Plus jeune que les alternatives, moins de recul en production
- Pas de self-hosting
- Free tier plus restreint (10K vs 50K pour Supabase/Firebase)

#### Option E : Keycloak self-hosted

**Description :** Serveur d'identite open-source (Red Hat). Tres complet : OIDC, SAML, federation, MFA. Zero cout de licence.

**SDK Flutter :** Packages communautaires (`keycloak_wrapper`, `keycloak_flutter`). Pas de SDK officiel. Integration via OAuth2/OIDC standards.

**Points forts :**
- Open-source, zero cout de licence
- Tres complet fonctionnellement (OIDC, SAML, federation, themes, MFA, identity brokering)
- Self-hosted : controle total des donnees (souverainete DPA Maurice)
- Pas de limite MAU

**Points faibles :**
- **Lourd a operer** : Keycloak est un serveur Java (WildFly/Quarkus), necessite expertise ops, monitoring, mises a jour de securite, HA
- Pas de SDK Flutter officiel (packages communautaires, maintenance incertaine)
- Temps de developpement et de maintenance significatif pour une petite equipe
- Phone auth OTP : pas natif, necessite un SPI custom (Service Provider Interface)
- Pas d'integration native avec un provider SMS -- developpement custom requis
- Overhead infrastructure (serveur dedie, base de donnees dediee)

#### Option F : Auth maison (Passport.js / custom)

**Description :** Developper tout le systeme d'auth from scratch avec des librairies bas niveau (bcrypt, jsonwebtoken, passport.js, etc.).

**Points forts :**
- Controle total sur chaque aspect
- Pas de dependance a un service tiers
- Pas de cout de licence

**Points faibles :**
- **Risque de securite majeur** : l'authentification est un domaine ou les erreurs sont critiques (timing attacks, token management, session fixation, CSRF, etc.)
- Temps de developpement enorme : email verification, phone OTP, OAuth flows, password reset, rate limiting, account lockout, MFA, token refresh, session management...
- Maintenance continue des integrations OAuth (Google, Facebook, Apple changent regulierement leurs APIs)
- Apple Sign-In est particulierement complexe a implementer (token relay, "Hide My Email")
- Non recommande sauf equipe avec expertise securite dediee

---

### 3.2 Federation de comptes

| Option | Description | Evaluation |
|--------|-------------|------------|
| **F1 : Auto-link si meme email verifie** | Si un user s'inscrit par email puis tente Google avec le meme email verifie, les comptes sont automatiquement lies. | **Recommande.** C'est le comportement de Supabase Auth et Firebase Auth par defaut. UX fluide. Securise si les deux emails sont verifies. Conforme aux specs BienBon (US-C003, US-C004 : "Si l'email est deja associe, le consommateur est connecte directement"). |
| F2 : Confirmation utilisateur | Afficher "Ce email existe deja via Google, voulez-vous lier ?" | Plus securise en theorie, mais friction UX importante. La plupart des users ne comprennent pas le concept de "lier des comptes". |
| F3 : Comptes separes | Pas de link. Email et Google = 2 comptes distincts. | UX catastrophique. L'utilisateur se retrouve avec 2 comptes, 2 historiques, confusion garantie. |

**Cas special -- Apple "Hide My Email" :**
L'email-relais Apple (ex: `abc123@privaterelay.appleid.com`) est unique et different de l'email reel de l'utilisateur. Il n'est donc PAS possible de faire un auto-link base sur l'email avec un compte existant (email classique ou Google). Ce cas est traite separement (voir section Q6 ci-dessous).

---

### 3.3 Strategie de tokens

| Option | Description | Evaluation |
|--------|-------------|------------|
| **T1 : JWT access token (court) + refresh token (long)** | Access token JWT 1h, refresh token 30 jours. Le refresh token renouvelle l'access token. | **Recommande.** Standard de l'industrie pour les apps mobiles. L'access token court limite l'impact d'un vol. Le refresh token de 30 jours correspond a l'exigence de session persistante des specs (US-C006). Supabase et Firebase utilisent ce pattern nativement. |
| T2 : Session server-side + cookie httpOnly | Session stockee en base/Redis, cookie pour le web. | Bon pour le web, mais inadapte pour une app mobile native Flutter (pas de cookies natifs). Necessite une gestion de session server-side plus complexe. |
| T3 : Hybrid (JWT mobile + session web) | JWT pour l'app mobile, session cookie pour le web. | Complexite de maintenance double. A eviter sauf si les contraintes web l'exigent. |

**Configuration recommandee :**
- Access token JWT : duree de vie **1 heure**
- Refresh token : duree de vie **30 jours** (conforme a US-C006 : "session expire apres 30 jours d'inactivite")
- Le refresh token est renouvele a chaque utilisation (rotation de token) -- si le refresh token est vole, il ne peut etre utilise qu'une fois avant invalidation
- Stockage securise : `flutter_secure_storage` sur mobile (Keychain iOS, Keystore Android)

---

### 3.4 Multi-role

**Decision recommandee : Un seul compte, plusieurs roles.**

Un meme email peut etre consommateur ET partenaire. Le compte a un attribut `roles[]` (tableau) :
- `consumer` : attribue a l'inscription consommateur
- `partner` : attribue apres validation admin de l'inscription partenaire
- `admin` : attribue manuellement

**Justification :**
- Un commercant peut aussi etre consommateur (acheter des paniers chez d'autres partenaires)
- Evite la duplication de comptes et la confusion
- Le switch de role se fait via l'interface (menu ou toggle) sans re-authentification
- Les roles sont stockes dans les `user_metadata` ou `app_metadata` du provider d'auth, et/ou dans une table `user_roles` en base de donnees
- Le RLS (Row Level Security) de Supabase peut utiliser ces roles pour les policies d'acces

**Implementation :**
```
user.app_metadata = {
  roles: ["consumer"],           // ou ["consumer", "partner"]
  partner_status: "pending",     // "pending" | "active" | "suspended" | "banned"
  partner_id: "uuid-xxx"         // reference vers la table partners
}
```

---

### 3.5 Unicite du numero de telephone

**Decision : le numero de telephone (+230) est UNIQUE par compte.**

Un meme numero de telephone ne peut pas etre associe a plusieurs comptes BienBon. Cette contrainte est essentielle pour :

1. **Prevention de la fraude** : empecher la creation de comptes multiples avec le meme numero (exploitation du programme de parrainage, abus de promotions "premier achat", contournement de suspensions).

2. **Identification fiable** : le numero +230 sert de facteur d'authentification via OTP. Si plusieurs comptes partageaient le meme numero, l'OTP serait ambigu (quel compte authentifier ?).

3. **Conformite avec le device fingerprinting** (ADR-019) : le numero de telephone est l'un des signaux utilises pour detecter les comptes dupliques.

**Implementation :**

```sql
-- Migration Prisma / SQL Supabase
-- Contrainte UNIQUE sur le champ phone de la table auth.users
-- Note : Supabase Auth (GoTrue) impose deja l'unicite du phone en interne.
-- Cette contrainte SQL est un filet de securite supplementaire au niveau base de donnees.

ALTER TABLE auth.users
  ADD CONSTRAINT users_phone_unique UNIQUE (phone);

-- Index pour les lookups rapides (verification d'unicite a l'inscription)
CREATE UNIQUE INDEX idx_users_phone_unique
  ON auth.users (phone)
  WHERE phone IS NOT NULL;
```

**Comportement attendu :**

| Scenario | Resultat |
|----------|---------|
| Inscription avec un numero +230 deja utilise par un autre compte | Erreur : "Ce numero de telephone est deja associe a un compte. Connectez-vous ou utilisez un autre numero." |
| Changement de numero : un utilisateur veut associer un numero deja pris | Erreur : "Ce numero est deja utilise par un autre compte." |
| Suppression de compte : le numero est libere | Le numero peut etre reutilise pour un nouveau compte apres le hard-delete (30 jours apres le soft-delete, cf. ADR-021). |
| Federation : inscription email puis ajout du meme telephone | Le telephone est ajoute au compte existant (pas de creation d'un nouveau compte). |

> **Note** : Supabase Auth (GoTrue) gere nativement l'unicite du numero de telephone. La contrainte SQL est une protection supplementaire "defense en profondeur" au cas ou le GoTrue serait contourne par un acces direct a la base de donnees (ex: via la `service_role` key).

---

### 3.6 Detection de reutilisation du refresh token (Refresh Token Reuse Detection)

**Probleme** : si un attaquant vole un refresh token (via un device compromis, un backup non chiffre, ou une fuite reseau), il peut l'utiliser pour obtenir de nouveaux access tokens et maintenir un acces permanent au compte de la victime.

**Solution : Supabase Auth Refresh Token Reuse Detection**

Supabase Auth (GoTrue) implemente nativement la **Refresh Token Rotation** avec **detection de reutilisation** :

1. **Rotation** : a chaque utilisation d'un refresh token pour obtenir un nouvel access token, le refresh token est invalide et un nouveau refresh token est emis. L'ancien refresh token ne peut plus etre utilise.

2. **Detection de reutilisation** : si un refresh token deja utilise (et donc invalide) est presente au serveur, cela signifie que :
   - Soit le token a ete vole et l'attaquant tente de l'utiliser apres que le proprietaire legitime l'a deja rafraichi
   - Soit le proprietaire legitime tente de l'utiliser apres que l'attaquant l'a deja utilise

   Dans les deux cas, **c'est un signe de compromission de session**. La reponse est : **revoquer TOUTES les sessions actives de l'utilisateur** (tous les refresh tokens de tous les devices). L'utilisateur devra se re-authentifier sur tous ses appareils.

**Configuration dans Supabase :**

```
# Supabase Dashboard > Authentication > Security

# La rotation des refresh tokens est activee par defaut dans Supabase Auth.
# La detection de reutilisation est egalement active par defaut.

# Configuration via les variables d'environnement GoTrue :
GOTRUE_SECURITY_REFRESH_TOKEN_ROTATION_ENABLED=true
GOTRUE_SECURITY_REFRESH_TOKEN_REUSE_INTERVAL=10

# REFRESH_TOKEN_REUSE_INTERVAL (en secondes) :
# Fenetre de grace pendant laquelle un ancien refresh token est encore accepte.
# Valeur recommandee : 10 secondes (pour gerer les race conditions reseau).
# Apres cette fenetre, la reutilisation declenche la revocation totale.
```

**Comportement detaille :**

| Situation | Resultat |
|-----------|---------|
| Utilisation normale : refresh token valide, jamais utilise | Nouveau access token + nouveau refresh token emis. Ancien refresh token invalide. |
| Reutilisation dans la fenetre de grace (< 10s) | Tolere (race condition reseau). Nouveau access token + nouveau refresh token emis. |
| Reutilisation hors fenetre de grace (> 10s) | **Revocation de TOUTES les sessions** de l'utilisateur. Tous les refresh tokens invalides. L'utilisateur doit se re-authentifier. |
| Refresh token totalement inconnu | Rejete (401 Unauthorized). |

**Logging et alertes :**

Lorsqu'une reutilisation de refresh token est detectee (hors fenetre de grace), le systeme doit :

1. **Logger l'evenement** comme incident de securite (niveau WARN) avec les details : `userId`, IP de la tentative, user-agent, timestamp du token original vs timestamp de la reutilisation.
2. **Notifier l'utilisateur** par email et/ou push notification : "Activite suspecte detectee sur votre compte. Toutes vos sessions ont ete deconnectees par securite. Si ce n'etait pas vous, changez votre mot de passe."
3. **Alerter l'equipe** via Sentry si le nombre de detections depasse 5 par heure (possible attaque ciblee).

> **Note** : cette fonctionnalite est geree nativement par Supabase Auth. Aucun code custom n'est necessaire pour l'activer. Il suffit de verifier que les variables d'environnement GoTrue sont correctement configurees (ce qui est le cas par defaut sur Supabase Cloud). Le monitoring et les notifications utilisateur sont des ajouts BienBon au-dessus du comportement natif.

---

## 4. Matrice de decision

### 4.1 Criteres et poids

| Critere                                         | Poids | Justification du poids                                                |
|--------------------------------------------------|-------|------------------------------------------------------------------------|
| Support Flutter natif (SDK qualite)              | 20%   | App mobile Flutter = client principal. SDK mature = velocite dev.       |
| Support de tous les providers requis             | 15%   | 5 methodes d'inscription requises par les specs.                       |
| Cout a l'echelle (MAU pricing)                   | 15%   | Marche mauricien = volumes moderes mais sensibilite au cout.           |
| Integration backend / DB                         | 15%   | Coherence de la stack. Eviter le split d'infrastructure.               |
| Gestion multi-role (consumer/partner/admin)      | 10%   | Exigence structurelle du projet.                                       |
| Conformite DPA Maurice / souverainete donnees    | 10%   | Data Protection Act 2017. Pas de data residency stricte, mais transferts encadres. |
| Self-hostable                                    | 5%    | Nice-to-have. Le DPA n'impose pas de data residency, mais la possibilite existe. |
| DX et velocite de developpement                  | 10%   | Petite equipe, time-to-market important.                               |

### 4.2 Notation (1 a 5)

| Critere (poids)                    | Supabase Auth | Firebase Auth | Auth0    | Clerk    | Keycloak | Auth maison |
|------------------------------------|---------------|---------------|----------|----------|----------|-------------|
| SDK Flutter (20%)                  | 4             | **5**         | 3        | 2        | 2        | N/A (1)     |
| Providers requis (15%)            | **5**         | **5**         | **5**    | **5**    | 3        | 3           |
| Cout a l'echelle (15%)            | **5**         | 4             | 1        | 3        | **5**    | **5**       |
| Integration backend/DB (15%)      | **5**         | 2             | 3        | 3        | 3        | 4           |
| Multi-role (10%)                  | 4             | 3             | **5**    | 3        | **5**    | **5**       |
| Conformite DPA (10%)              | 4             | 3             | 3        | 3        | **5**    | **5**       |
| Self-hostable (5%)                | 4             | 1             | 1        | 1        | **5**    | **5**       |
| DX / velocite (10%)               | **5**         | **5**         | 4        | 4        | 2        | 1           |

### 4.3 Scores ponderes

| Solution        | Score pondere | Calcul                                                                                           |
|-----------------|---------------|---------------------------------------------------------------------------------------------------|
| **Supabase Auth** | **4,55**    | (4x0.20)+(5x0.15)+(5x0.15)+(5x0.15)+(4x0.10)+(4x0.10)+(4x0.05)+(5x0.10)                        |
| Firebase Auth   | 3,80          | (5x0.20)+(5x0.15)+(4x0.15)+(2x0.15)+(3x0.10)+(3x0.10)+(1x0.05)+(5x0.10)                        |
| Auth0           | 3,20          | (3x0.20)+(5x0.15)+(1x0.15)+(3x0.15)+(5x0.10)+(3x0.10)+(1x0.05)+(4x0.10)                        |
| Clerk           | 3,10          | (2x0.20)+(5x0.15)+(3x0.15)+(3x0.15)+(3x0.10)+(3x0.10)+(1x0.05)+(4x0.10)                        |
| Keycloak        | 3,50          | (2x0.20)+(3x0.15)+(5x0.15)+(3x0.15)+(5x0.10)+(5x0.10)+(5x0.05)+(2x0.10)                        |
| Auth maison     | 3,35          | (1x0.20)+(3x0.15)+(5x0.15)+(4x0.15)+(5x0.10)+(5x0.10)+(5x0.05)+(1x0.10)                        |

---

## 5. Decision

### Service d'authentification : Supabase Auth

**Supabase Auth est le choix recommande** avec un score pondere de 4,55/5.

**Justifications principales :**

1. **Coherence de stack** : Si Supabase est choisi pour la base de donnees (PostgreSQL manage), l'auth est integree nativement. Un seul fournisseur pour DB + Auth + Storage + Realtime = simplicite operationnelle maximale, un seul dashboard, une seule facturation, un seul SDK Flutter.

2. **Cout optimal** : 50K MAU gratuits au lancement, puis 0,00325 $/MAU. Pour 10 000 utilisateurs actifs a Maurice (estimation an 1), le cout d'auth est de 0 $. Pour 50 000 MAU (objectif an 3), toujours 0 $ sur le plan Pro a 25 $/mois. Le pricing Auth0 serait a plusieurs centaines de dollars/mois pour le meme volume.

3. **Tous les providers supportes** : Email+mdp, Phone OTP (via Twilio/Vonage/MessageBird), Google OAuth, Facebook OAuth, Apple Sign-In. Aucun provider manquant.

4. **SDK Flutter solide** : `supabase_flutter` v2 est un SDK officiel, maintenu avec des releases hebdomadaires, compatible multi-plateforme. Moins mature que FlutterFire mais suffisamment stable pour la production.

5. **RLS natif** : Les Row Level Security policies dans PostgreSQL utilisent directement `auth.uid()` et `auth.jwt()`. Les roles consumer/partner/admin sont directement exploitables dans les policies SQL, sans couche intermediaire.

6. **Self-hostable** : GoTrue est open-source. Si les exigences de souverainete des donnees evoluent (ex: nouvelle reglementation mauricienne), la migration vers un self-hosting est possible sans changer de paradigme.

7. **Open-source core** : Pas de vendor lock-in aussi fort que Firebase/Google. Migration possible (les donnees sont dans PostgreSQL standard).

**Pourquoi pas Firebase Auth ?**
Firebase Auth est le concurrent le plus serieux (SDK Flutter superior, phone auth integre). Il est elimine pour deux raisons :
- **Split d'infrastructure** : Utiliser Firebase Auth avec une DB Supabase/PostgreSQL cree un split d'architecture artificiel. Les tokens Firebase ne s'integrent pas nativement avec le RLS de PostgreSQL. Il faudrait un middleware de validation des JWT Firebase cote backend, ajoutant de la complexite.
- **Vendor lock-in** : Les donnees d'auth Firebase ne sont pas facilement exportables. Une migration future serait couteuse.

Si le choix de la DB etait Firebase/Firestore (ce qui n'est pas le cas pour BienBon), Firebase Auth serait le choix evident.

---

### Federation de comptes : Auto-link sur email verifie (F1)

- Si un consommateur s'inscrit par email puis tente Google/Facebook avec le meme email verifie, les comptes sont lies automatiquement.
- Comportement conforme aux specs (US-C003 : "Si l'email Google est deja associe a un compte BienBon existant, le consommateur est connecte directement").
- C'est le comportement par defaut de Supabase Auth.

---

### Strategie de tokens : JWT access + refresh (T1)

- Access token JWT : 1 heure (configurable dans Supabase : `JWT_EXPIRY=3600`)
- Refresh token : 30 jours (conforme a US-C006)
- Rotation des refresh tokens activee
- Stockage : `flutter_secure_storage` (Keychain/Keystore) sur mobile, `httpOnly` cookie sur web

---

### Multi-role : Compte unique, roles multiples

- `app_metadata.roles[]` : `["consumer"]`, `["consumer", "partner"]`, `["admin"]`
- Le role `partner` est attribue apres validation admin (US-P002)
- Le statut partenaire (`pending`, `active`, `suspended`, `banned`) est gere en `app_metadata` et/ou table `partners`
- Les RLS policies PostgreSQL filtrent par role

---

## 6. Reponses aux questions specifiques

### Q5 : Provider SMS OTP pour Maurice (+230)

**Recommandation : Twilio Verify**

**Recherche effectuee :**

| Provider     | Support Maurice (+230) | Pricing SMS Maurice          | Integration Supabase       |
|--------------|------------------------|------------------------------|----------------------------|
| **Twilio**   | Oui (confirme)         | ~0,05 $ verification + ~0,20 $/SMS outbound | Support natif (Twilio + Twilio Verify) |
| **Vonage**   | Oui (confirme)         | Variable selon le type       | Support natif              |
| **MessageBird** | Oui (200+ pays)    | Variable                     | Support natif              |
| **TextLocal** | Non confirme          | N/A                          | Communautaire              |

**Twilio** est recommande pour :
- Support confirme de Maurice (+230) avec [documentation SMS dediee](https://www.twilio.com/en-us/guidelines/mu/sms)
- [Page de pricing dediee pour Maurice](https://www.twilio.com/en-us/sms/pricing/mu)
- Integration native avec Supabase Auth (configuration via dashboard, zero code)
- Twilio Verify gere automatiquement : generation OTP, envoi SMS, verification, rate limiting, templates multilingues
- API Verify a 0,05 $ par verification reussie (plus le cout SMS carrier)
- Fallback automatique voice call si le SMS ne passe pas

**Estimation de cout SMS OTP :**
- Hypothese : 5 000 inscriptions/mois par telephone, 50% de re-verifications
- ~7 500 SMS/mois x ~0,25 $ (Verify fee + SMS carrier Mauritius) = ~1 875 $/mois au pic
- En phase de lancement (500 inscriptions/mois) : ~125 $/mois

**Alternative locale :** Aucun provider SMS local mauricien n'offre d'API OTP comparable a Twilio/Vonage. Les operateurs locaux (Emtel, my.t, MTML/Chili) ne proposent pas de SMS API en self-service.

**Configuration Supabase :**
```
# Dans Supabase Dashboard > Authentication > Phone Auth
SMS Provider: Twilio Verify
Account SID: AC...
Auth Token: ...
Verify Service SID: VA...
```

---

### Q6 : Apple Sign-In et "Hide My Email"

**Politique Apple (App Store Review Guidelines 4.8) :**
Si l'app propose des social logins tiers (Google, Facebook), elle **doit** proposer Sign in with Apple comme option equivalente. BienBon propose Google et Facebook, donc Apple Sign-In est **obligatoire** pour la publication sur l'App Store.

**Gestion du "Hide My Email" :**

Apple permet aux utilisateurs de masquer leur email reel et d'utiliser un email-relais (ex: `abc123@privaterelay.appleid.com`). Ce mecanisme a des implications :

1. **Stockage** : Le systeme stocke l'email-relais Apple comme email de contact du compte (conforme a US-C005 : "le systeme stocke cet email-relais pour les communications").

2. **Envoi d'emails** : Les emails envoyes a l'adresse-relais sont transferes par Apple vers la vraie adresse de l'utilisateur. Pour que cela fonctionne, le domaine d'envoi (`bienbon.mu`) doit etre enregistre dans le [Apple Developer Portal > Sign in with Apple > Email Relay Service](https://developer.apple.com/account/resources/services/configure).

3. **Federation impossible** : Si un utilisateur s'inscrit par email classique (`user@gmail.com`) puis utilise Apple Sign-In avec "Hide My Email", les emails sont differents. L'auto-link ne se fait PAS. C'est le comportement attendu et securise (on ne peut pas deviner que `abc123@privaterelay.appleid.com` correspond a `user@gmail.com`).

4. **Federation possible** : Si l'utilisateur partage son vrai email via Apple Sign-In (option "Share My Email"), et que cet email correspond a un compte existant, l'auto-link se fait normalement.

5. **Communication** : Toutes les communications (emails de confirmation, notifications, mot de passe oublie) transitent par l'email-relais Apple. L'utilisateur les recoit dans sa vraie boite mail grace au relay d'Apple.

**Implementation Supabase :**
Supabase Auth supporte nativement Apple Sign-In (provider `apple`). La configuration requiert :
- Apple Developer Account (99 $/an)
- Service ID configure pour Sign in with Apple
- Domaine verifie pour le relay email
- Secret key (.p8) genere dans le portail Apple

---

## 7. Architecture d'authentification

```
+-------------------+     +-------------------+     +-------------------+
|   App Flutter     |     |   App Web         |     |   Site Vitrine    |
|   (iOS/Android)   |     |   (Flutter Web)   |     |   (bienbon.mu)    |
+--------+----------+     +--------+----------+     +--------+----------+
         |                         |                          |
         |  supabase_flutter SDK   |  supabase_flutter SDK    |  API REST
         |                         |                          |  (inscription
         |                         |                          |   partenaire)
         v                         v                          v
+------------------------------------------------------------------------+
|                        Supabase Auth (GoTrue)                          |
|                                                                        |
|  +-- Email/Password --------+  +-- Phone OTP (Twilio Verify) ------+  |
|  |   - Inscription          |  |   - Envoi code 6 chiffres         |  |
|  |   - Connexion            |  |   - Verification                  |  |
|  |   - Email verification   |  |   - Cooldown 60s entre renvois   |  |
|  |   - Password reset       |  |   - Max 3 tentatives             |  |
|  +---------------------------+  +-----------------------------------+  |
|                                                                        |
|  +-- OAuth Providers --------+  +-- Securite ----------------------+  |
|  |   - Google OAuth 2.0     |  |   - Rate limiting (5 tentatives)  |  |
|  |   - Facebook OAuth       |  |   - Account lockout (15 min)      |  |
|  |   - Apple Sign-In        |  |   - JWT access token (1h)         |  |
|  +---------------------------+  |   - Refresh token (30j)           |  |
|                                 |   - Token rotation               |  |
|                                 +-----------------------------------+  |
+------------------------------------------------------------------------+
         |
         |  JWT (auth.uid(), auth.jwt())
         v
+------------------------------------------------------------------------+
|                    Supabase PostgreSQL                                  |
|                                                                        |
|  +-- Row Level Security (RLS) ------------------------------------+   |
|  |   - policies filtrant par auth.uid()                           |   |
|  |   - policies filtrant par auth.jwt() -> app_metadata.roles     |   |
|  +----------------------------------------------------------------+   |
|                                                                        |
|  +-- Tables -------------------------------------------------------+  |
|  |   auth.users (geree par GoTrue)                                 |  |
|  |   public.profiles (prenom, nom, avatar, preferences)            |  |
|  |   public.partners (BRN, food_license, status, documents)        |  |
|  |   public.user_roles (user_id, role, granted_at, granted_by)     |  |
|  +-----------------------------------------------------------------+  |
+------------------------------------------------------------------------+
```

---

## 8. Plan d'implementation

### Phase 1 -- Authentification consommateur (Sprint 1-2)

| Tache                                                    | Specs         | Priorite |
|----------------------------------------------------------|---------------|----------|
| Configurer Supabase Auth (projet, providers)              | --            | P0       |
| Email + mot de passe (inscription + connexion)            | US-C001, C006 | P0       |
| Email verification (lien 24h)                             | US-C001       | P0       |
| Mot de passe oublie (lien 1h, usage unique)               | US-C007       | P0       |
| Google OAuth                                              | US-C003       | P0       |
| Facebook OAuth                                            | US-C004       | P1       |
| Apple Sign-In                                             | US-C005       | P0       |
| Rate limiting + account lockout (5 tentatives, 15 min)    | US-C006       | P0       |
| Session persistante (refresh token 30j)                   | US-C006       | P0       |
| Mode invite (navigation sans auth)                        | US-C001       | P1       |

### Phase 2 -- Phone OTP + Partenaire (Sprint 3-4)

| Tache                                                    | Specs         | Priorite |
|----------------------------------------------------------|---------------|----------|
| Configurer Twilio Verify + Supabase                       | --            | P0       |
| Phone +230 inscription + OTP                              | US-C002       | P0       |
| Phone login (connexion OTP)                               | US-C006       | P0       |
| Inscription partenaire (stepper 4 etapes)                 | US-P001       | P0       |
| Statut "en attente de validation"                         | US-P001       | P0       |
| Upload documents (BRN, Food License)                      | US-P001       | P0       |

### Phase 3 -- Admin + Securite avancee (Sprint 5-6)

| Tache                                                    | Specs         | Priorite |
|----------------------------------------------------------|---------------|----------|
| Backoffice admin : validation/rejet partenaires           | US-P002, P003 | P0       |
| Creation comptes admin (identifiants temporaires)         | --            | P0       |
| Suspension/bannissement (check a chaque requete)          | US-T001       | P0       |
| Suppression de compte + export donnees (DPA)              | US-T0XX       | P1       |
| Audit logging (tentatives de connexion)                   | US-T001       | P1       |
| CSRF tokens (web)                                         | --            | P0       |

---

## 9. Risques et mitigations

| Risque                                                     | Impact | Probabilite | Mitigation                                                                                      |
|------------------------------------------------------------|--------|-------------|-------------------------------------------------------------------------------------------------|
| SMS OTP non delivre a Maurice (latence carrier)            | Eleve  | Moyen       | Fallback voice call via Twilio Verify. Tester avec les 3 operateurs (Emtel, my.t, MTML).        |
| Cout SMS OTP eleve si adoption telephone importante        | Moyen  | Moyen       | Pousser l'inscription email/OAuth en premier. Limiter les renvois OTP. Monitorer les couts.     |
| SDK `supabase_flutter` moins mature que FlutterFire        | Moyen  | Faible      | Le SDK est en production chez de nombreux projets. La communaute est active. Suivre les releases.|
| Supabase Auth ne supporte pas une feature future requise   | Moyen  | Faible      | GoTrue est open-source ; contribuer ou forker. Ou ajouter une couche middleware.                |
| Federation Apple "Hide My Email" = comptes dupliques       | Faible | Moyen       | Documenter clairement pour l'utilisateur. Permettre le link manuel dans les parametres du profil.|
| Data Protection Act Maurice evolue vers data residency     | Eleve  | Faible      | Supabase est self-hostable. Migrer vers un VPS a Maurice ou en Afrique si necessaire.           |
| Rate limiting insuffisant = attaque brute force            | Eleve  | Moyen       | Combiner rate limiting Supabase + rate limiting API Gateway (ex: Cloudflare) + CAPTCHA.         |

---

## 10. Conformite Data Protection Act 2017 (Maurice)

Le Data Protection Act 2017 de Maurice est aligne sur le GDPR europeen. Points cles pour l'authentification :

| Exigence DPA                                              | Implementation                                                            |
|-----------------------------------------------------------|---------------------------------------------------------------------------|
| Base legale du traitement (consentement)                  | Case a cocher CGU obligatoire a l'inscription (US-C001). Date/heure enregistrees. |
| Droit d'acces aux donnees                                  | Endpoint API pour exporter les donnees utilisateur (profil, historique).   |
| Droit a l'effacement (suppression de compte)              | Fonction de suppression de compte avec export prealable. Soft-delete 30 jours puis hard-delete. |
| Droit a la portabilite                                     | Export au format JSON/CSV des donnees personnelles.                        |
| Transferts hors de Maurice                                 | Supabase Cloud heberge les donnees hors Maurice (AWS). Acceptable si le pays de destination assure un "niveau equivalent de protection". L'UE et les USA (avec accords) sont generalement consideres comme adequats. Documenter dans la politique de confidentialite. |
| Securite des donnees                                       | Chiffrement en transit (HTTPS/TLS), chiffrement au repos (Supabase manage), hachage bcrypt des mots de passe (GoTrue). |
| Notification de violation                                  | Supabase fournit des alertes de securite. Mettre en place un processus de notification au Data Protection Office de Maurice sous 72h. |

---

## 11. References

### Pricing et documentation

- [Supabase Pricing](https://supabase.com/pricing)
- [Supabase Auth MAU Management](https://supabase.com/docs/guides/platform/manage-your-usage/monthly-active-users)
- [Firebase Auth Pricing](https://firebase.google.com/pricing)
- [Firebase Phone Verification Pricing](https://firebase.google.com/docs/phone-number-verification/pricing)
- [Auth0 Pricing](https://auth0.com/pricing)
- [Clerk Pricing](https://clerk.com/pricing)

### SMS OTP a Maurice

- [Twilio SMS Guidelines Mauritius](https://www.twilio.com/en-us/guidelines/mu/sms)
- [Twilio SMS Pricing Mauritius](https://www.twilio.com/en-us/sms/pricing/mu)
- [Twilio Verify Pricing](https://www.twilio.com/en-us/verify/pricing)
- [Vonage Mauritius SMS Features](https://api.support.vonage.com/hc/en-us/articles/9246544810140-Mauritius-SMS-Features-and-Restrictions)
- [Supabase Phone Auth with Twilio](https://supabase.com/docs/guides/auth/phone-login/twilio)

### SDK Flutter

- [supabase_flutter (pub.dev)](https://pub.dev/packages/supabase_flutter)
- [firebase_auth / FlutterFire (pub.dev)](https://pub.dev/packages/firebase_auth)
- [Clerk Flutter SDK Beta](https://clerk.com/changelog/2025-03-26-flutter-sdk-beta)

### Apple Sign-In

- [Apple App Store Review Guidelines 4.8](https://developer.apple.com/app-store/review/guidelines/)
- [Apple Sign-In Requirement (WorkOS Analysis)](https://workos.com/blog/apple-app-store-authentication-sign-in-with-apple-2025)

### Data Protection Act Maurice

- [Data Protection Act 2017 (DLA Piper Summary)](https://www.dlapiperdataprotection.com/?t=law&c=MU)
- [Data Protection Office Mauritius](https://dataprotection.govmu.org/Pages/The%20Law/Data-Protection-Act-2017.aspx)

---

## 12. Annexe : Checklist de configuration Supabase Auth

```
[ ] Creer le projet Supabase (region: EU West ou la plus proche de Maurice)
[ ] Activer Email/Password provider
[ ] Configurer les email templates (verification, password reset) en francais
[ ] Activer Google OAuth (Google Cloud Console > OAuth 2.0 Client ID)
[ ] Activer Facebook OAuth (Meta for Developers > Facebook Login)
[ ] Activer Apple Sign-In (Apple Developer Portal > Service ID + Key)
[ ] Enregistrer le domaine bienbon.mu dans le Apple Email Relay Service
[ ] Creer un compte Twilio + Verify Service
[ ] Configurer Twilio Verify dans Supabase Dashboard
[ ] Tester SMS OTP avec les 3 operateurs mauriciens (Emtel, my.t, MTML/Chili)
[ ] Configurer JWT_EXPIRY a 3600 (1 heure)
[ ] Configurer REFRESH_TOKEN_ROTATION a true
[ ] Configurer SECURITY_CAPTCHA_ENABLED (hCaptcha ou Turnstile)
[ ] Configurer le rate limiting (max 5 tentatives de connexion)
[ ] Configurer les custom claims / app_metadata pour les roles
[ ] Creer les RLS policies de base (auth.uid(), auth.jwt())
[ ] Configurer les redirect URLs pour OAuth (deep links Flutter)
[ ] Tester le flow complet sur iOS, Android, et Web
```
