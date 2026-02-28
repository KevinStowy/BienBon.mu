# ADR-014 : Architecture de notifications multi-canal

| Champ         | Valeur                                                      |
|---------------|-------------------------------------------------------------|
| **Statut**    | Propose                                                     |
| **Date**      | 2026-02-27                                                  |
| **Auteur**    | Kevin (assiste par Claude Opus 4.6)                         |
| **Decideurs** | Equipe technique BienBon                                    |
| **Scope**     | Push notifications, emails transactionnels, centre in-app   |
| **Refs**      | US-C056, US-C062 a US-C070, US-P025, US-P029, US-A028, ADR-001, ADR-002, ADR-008 |

---

## 1. Contexte

BienBon.mu est une marketplace de paniers anti-gaspi a l'ile Maurice. Le systeme de notifications est un pilier de l'experience utilisateur : il informe le consommateur de la disponibilite des paniers de ses commerces favoris, confirme les reservations, rappelle les creneaux de retrait et gere les alertes transactionnelles (annulation, remboursement, reclamation).

### 1.1 Inventaire des notifications

Le systeme doit gerer **3 canaux de livraison** et **3 audiences** avec des besoins tres differents.

#### Notifications consommateur (9 types, US-C062 a US-C070)

| # | Type | Declencheur | Canaux | Desactivable ? |
|---|------|-------------|--------|----------------|
| 1 | Favori publie un nouveau panier | Event : panier cree par un partenaire en liste de favoris | Push | Oui |
| 2 | Confirmation de reservation | Event : reservation confirmee apres paiement | Push + Email (QR + PIN inline) | **Non** (transactionnel) |
| 3 | Rappel 1h avant le retrait | Schedule : 1h avant le debut du creneau de retrait | Push | Oui |
| 4 | Annulation par le partenaire | Event : partenaire annule un panier reserve | Push + Email | **Non** (transactionnel) |
| 5 | Remboursement effectue | Event : remboursement traite par le PSP | Push + Email | **Non** (transactionnel) |
| 6 | Alerte no-show | Event : creneau de retrait expire sans retrait | Push | Oui |
| 7 | Reclamation resolue | Event : admin traite la reclamation | Push + Email | Oui |
| 8 | Parrainage valide | Event : filleul fait son premier achat | Push | Oui |
| 9 | Marketing occasionnel | Manuel : admin envoie une campagne | Push | Oui |

#### Notifications partenaire (4 types)

| # | Type | Declencheur | Canaux |
|---|------|-------------|--------|
| 1 | Nouvelle reservation recue | Event : consommateur reserve un panier | Push + In-app |
| 2 | No-show detecte | Event : fin du creneau sans retrait | Push + In-app |
| 3 | Payout traite | Event : virement mensuel execute | Push + Email + In-app |
| 4 | Modification approuvee/rejetee | Event : admin traite la demande de modification | Push + In-app |

#### Notifications admin (3 types)

| # | Type | Declencheur | Canaux |
|---|------|-------------|--------|
| 1 | Rapport quotidien | Cron : 7h00 chaque matin | Email uniquement |
| 2 | Alerte fraude | Event : pattern suspect detecte | Email + In-app admin |
| 3 | Nouvelle inscription partenaire | Event : partenaire cree son compte | Email + In-app admin |

### 1.2 Centre de notifications in-app (US-C062)

- Hub accessible depuis toutes les pages (icone cloche dans le header)
- Historique de 30 jours
- 9 types de notifications avec icones differenciees
- Compteur de non-lus (badge rouge)
- Actions : marquer comme lu (individuel), marquer tout comme lu
- Deep link : chaque notification navigue vers l'ecran pertinent (ex: detail reservation)

### 1.3 Preferences utilisateur (US-C056)

- 8 toggles individuels (par type et canal)
- Les notifications transactionnelles (confirmation reservation, annulation, remboursement) sont **toujours envoyees**, non desactivables
- Interface : ecran de parametres avec switches on/off
- Persistees en base de donnees

### 1.4 Contraintes techniques

- **Stack decidee** (ADR-001) : NestJS + Prisma + PostgreSQL (Supabase)
- **Mobile** : Flutter (2 apps : consumer + partner)
- **Admin** : React web
- **Auth** : Supabase Auth (ADR-010)
- **Temps reel existant** : SSE + pg_notify pour le stock (ADR-008)
- **Latence** : confirmation de reservation en < 5 secondes
- **Fiabilite** : les notifications transactionnelles DOIVENT arriver
- **Budget** : startup early-stage, < 100 USD/mois au lancement pour l'infra totale
- **Scalabilite** : de 100 a 50 000 notifications/jour

---

## 2. Questions a trancher

| #  | Question |
|----|----------|
| Q1 | Orchestration : synchrone dans le flow metier ou asynchrone via une queue ? |
| Q2 | Push notifications : FCM unifie (iOS + Android) ou FCM + APNs separes ? Alternatives ? |
| Q3 | Email : quel provider, quel systeme de templating, comment gerer les QR codes inline ? |
| Q4 | In-app : stockage en table PostgreSQL ou service tiers ? Transport temps reel ? |
| Q5 | Orchestration unifiee (Novu, Knock) ou integrations separees orchestrees par NestJS ? |
| Q6 | Retry et Dead Letter Queue : quelle strategie pour les echecs d'envoi ? |
| Q7 | Notifications schedulees (rappel 1h avant retrait) : quelle implementation ? |

---

## 3. Options evaluees

### 3.1 Q1 -- Orchestration synchrone vs asynchrone

#### Option A : Synchrone (dans le flow de la requete HTTP)

```
Client -> API -> [cree reservation] -> [envoie push] -> [envoie email] -> Response 200
```

**Avantages :**
- Simple a implementer
- Pas de composant supplementaire (pas de queue)

**Inconvenients :**
- **Latence** : l'envoi d'email (100-500ms) + push (50-200ms) rallonge le temps de reponse
- **Fragilite** : si FCM ou Resend est down, la requete echoue (ou on perd la notification silencieusement)
- **Pas de retry** : en cas d'echec, la notification est perdue
- **Blocant** : un timeout FCM bloque le thread pendant 5-30 secondes
- **Non compatible avec la latence < 5s exigee** pour la confirmation de reservation si le provider email est lent

#### Option B : Asynchrone via BullMQ (Redis)

```
Client -> API -> [cree reservation] -> [enqueue notification job] -> Response 200
                                              |
                              Worker BullMQ -> [envoie push] + [envoie email]
```

**Avantages :**
- **Decouplage** : la creation de reservation repond immediatement, la notification est traitee en arriere-plan
- **Retry natif** : BullMQ gere les retries avec backoff exponentiel
- **Priorisation** : les notifications transactionnelles peuvent etre prioritaires
- **Parallelisme** : le worker peut envoyer push et email en parallele
- **Monitoring** : BullMQ Board ou Bull Monitor pour visualiser les jobs
- **Deja dans la stack** : ADR-001 et ADR-002 preconisent Redis + BullMQ pour les jobs async

**Inconvenients :**
- Necessite Redis (deja prevu dans la stack)
- Complexite supplementaire (worker, serialisation des jobs)

#### Option C : Asynchrone via pg-boss (PostgreSQL)

```
Client -> API -> [cree reservation] -> [enqueue job dans PostgreSQL] -> Response 200
                                              |
                              Worker pg-boss -> [envoie push] + [envoie email]
```

**Avantages :**
- **Pas de Redis** : utilise PostgreSQL directement comme queue (SKIP LOCKED)
- **Transactionnel** : le job est cree dans la meme transaction que la reservation (garantie exactly-once)
- **Scheduled jobs natifs** : `startAfter` pour le rappel 1h avant retrait
- **Moins de composants d'infra** : pas besoin de Redis

**Inconvenients :**
- **Performance inferieure** a BullMQ pour les hauts debits (pg-boss fait du polling SQL vs pub/sub Redis)
- **Charge sur PostgreSQL** : les jobs ajoutent du load sur la base de donnees principale
- **Ecosysteme NestJS** : l'integration NestJS pour pg-boss est moins mature que `@nestjs/bullmq` (modules communautaires vs module officiel NestJS)

#### Decision Q1 : **Option B -- BullMQ (Redis)**

**Justification :**
1. Redis est deja prevu dans la stack (ADR-001 pour le cache et les sessions)
2. `@nestjs/bullmq` est un module officiel NestJS avec une documentation exhaustive
3. Le retry avec backoff exponentiel est critique pour la fiabilite des notifications transactionnelles
4. BullMQ supporte les delayed jobs nativement (pour le rappel 1h avant retrait)
5. Le decouplage permet de respecter la latence < 5s pour la confirmation de reservation
6. BullMQ Board offre une interface de monitoring des jobs sans effort supplementaire

**pg-boss est une alternative valide** si l'equipe veut eliminer Redis de la stack. La decision de garder Redis etant deja prise dans ADR-001, BullMQ est le choix naturel.

---

### 3.2 Q2 -- Push notifications : provider

#### Option A : Firebase Cloud Messaging (FCM) unifie

**Description :** FCM gere a la fois Android (natif) et iOS (via APNs relay). Un seul token par device, une seule API serveur. Le SDK Flutter `firebase_messaging` est la reference.

**Pricing :** **Gratuit, illimite.** FCM ne facture aucun message, quel que soit le volume. Pas de limites de messages par jour (uniquement des rate limits raisonnables : 1000 messages/seconde par projet pour les topics).

**Disponibilite a Maurice :** FCM est un service global qui fonctionne partout ou Google Play Services est disponible (Android) et partout ou APNs fonctionne (iOS). Il n'y a **aucune restriction geographique** pour Maurice. FCM n'a pas de liste de pays bloques -- il fonctionne via les serveurs Google globaux. Les utilisateurs mauriciens utilisent deja massivement les apps Android/iOS avec des notifications FCM (WhatsApp, Uber, etc.).

**Integration Flutter :**
- Package `firebase_messaging` (FlutterFire) -- le plus mature et utilise
- Setup : ajouter `google-services.json` (Android) + `GoogleService-Info.plist` (iOS)
- iOS : necesssite un APNs key (.p8) uploade dans la console Firebase
- FCM relaye automatiquement vers APNs pour iOS -- pas besoin de gerer APNs directement

**Cote serveur (NestJS) :**
- `firebase-admin` SDK : `admin.messaging().send({ token, notification, data })`
- Supporte les envois individuels, groupes, et topics

**Avantages :**
- Gratuit et illimite
- SDK Flutter de reference (FlutterFire)
- Unifie iOS + Android derriere une seule API
- Aucune restriction geographique
- Delivrabilite excellente (infrastructure Google)
- Deep links supportes via `data` payload

**Inconvenients :**
- Necessite un projet Firebase (meme si on n'utilise pas Firebase Auth -- ADR-010 a choisi Supabase Auth)
- Les tokens FCM expirent et doivent etre rafraichis periodiquement
- Pas de delivery tracking granulaire (on sait si le message est "sent", pas "delivered" ou "read")
- Dependance a Google

#### Option B : OneSignal

**Description :** Plateforme de notifications tout-en-un (push, email, SMS, in-app). SDK Flutter disponible.

**Pricing (fevrier 2026) :**
- Free : push illimite pour 10 000 web push subscribers, mobile push illimite
- Growth : 19 $/mois + 0,012 $/MAU (mobile push)
- Pro/Enterprise : tarification annuelle

**Calcul pour BienBon (5 000 MAU au lancement) :**
- Free tier : gratuit (push mobile illimite)
- Si on depasse : 19 $/mois + 5 000 * 0,012 = 19 + 60 = **79 $/mois**

**Avantages :**
- Dashboard de segmentation et analytics integre
- A/B testing de notifications
- SDK Flutter officiel
- Gere email + push + in-app dans une seule plateforme

**Inconvenients :**
- **Cout** : 79 $/mois pour 5K MAU, vs gratuit pour FCM
- Lock-in sur un SaaS tiers
- Le SDK Flutter est moins mature que FlutterFire
- Surdimensionne pour les besoins de BienBon (on n'a pas besoin de A/B testing de push au lancement)

#### Option C : FCM + APNs separes

**Description :** Utiliser FCM pour Android et APNs directement pour iOS (sans passer par FCM comme relay).

**Avantages :**
- Controle total sur la delivery iOS
- Pas de dependance a FCM pour iOS

**Inconvenients :**
- **Double implementation** : deux APIs differentes cote serveur, deux logiques de gestion de tokens
- Plus complexe a maintenir
- Aucun gain reel : FCM relaye vers APNs de maniere transparente et fiable

#### Decision Q2 : **Option A -- FCM unifie**

**Justification :**
1. **Gratuit et illimite** -- argument massue pour une startup
2. Le SDK Flutter (FlutterFire `firebase_messaging`) est la reference absolue, le plus utilise et le plus documente
3. FCM unifie iOS + Android : une seule API serveur, un seul format de token, une seule logique de retry
4. **Aucune restriction a Maurice** : FCM est un service global
5. Le fait d'avoir un projet Firebase juste pour FCM est courant et n'entre pas en conflit avec Supabase Auth
6. OneSignal serait un cout supplementaire sans benefice reel pour le lancement

**Note :** Un projet Firebase sera cree uniquement pour FCM. On n'utilisera PAS Firebase Auth (Supabase Auth est choisi dans ADR-010), ni Firestore, ni aucun autre service Firebase. Le projet Firebase sert exclusivement de canal de distribution de push notifications.

---

### 3.3 Q3 -- Email : provider et templating

#### 3.3.1 Provider email

| Provider | Free tier | Plan paye | Cout pour 10K emails/mois | Points forts | Points faibles |
|----------|-----------|-----------|---------------------------|--------------|----------------|
| **Resend** | 3 000 emails/mois | Pro : 20 $/mois (50K emails) | ~20 $/mois | DX exceptionnelle, React Email natif, API moderne, webhooks (bounce, delivery) | Jeune entreprise (2023), pas de support SMS |
| **Postmark** | 100 emails/mois | 15 $/mois (10K emails) | 15 $/mois | Delivrabilite #1 du marche (streams transactionnels dedies), templates serveur editables | Plus cher que Resend, pas de React Email natif |
| **SendGrid** | 100 emails/jour (~3K/mois) | 19,95 $/mois (50K emails) | ~20 $/mois | Tres mature, UI de template editor, analytics detaillees | DX plus datee, SDK plus verbeux, acquisition Twilio = support degrade |
| **AWS SES** | Gratuit dans le free tier AWS (1 an) | 0,10 $/1 000 emails | ~1 $/mois | Le moins cher a volume | Zero DX, pas de templates, pas de dashboard, setup DNS complexe |

#### Decision provider email : **Resend**

**Justification :**
1. **React Email natif** : les templates sont des composants React/TSX, coherents avec le stack admin React et la competence TypeScript de l'equipe
2. **Cout raisonnable** : 20 $/mois pour 50K emails, free tier de 3K emails pour le dev/staging
3. **API moderne** : un seul appel `resend.emails.send()` avec le composant React en parametre
4. **Webhooks** : bounce, delivery, open, click -- utile pour le monitoring
5. **Inline images via CID** : Resend supporte les attachments inline avec `content_id`, necessaire pour le QR code dans l'email de confirmation de reservation

**Alternative retenue en fallback** : Postmark, si la delivrabilite de Resend pose probleme en production (Postmark est la reference en transactionnel). La migration est triviale : changer l'adaptateur d'envoi dans le `NotificationModule`.

#### 3.3.2 Templating email

#### Option A : React Email (JSX)

```tsx
// emails/ReservationConfirmation.tsx
import { Html, Head, Body, Container, Img, Text } from '@react-email/components';

interface Props {
  userName: string;
  storeName: string;
  pickupTime: string;
  qrCodeBase64: string;
  pin: string;
  lang: 'fr' | 'en' | 'cr';
}

export function ReservationConfirmation({ userName, storeName, pickupTime, qrCodeBase64, pin, lang }: Props) {
  const t = translations[lang];
  return (
    <Html>
      <Head />
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={styles.heading}>{t.confirmationTitle}</Text>
          <Text>{t.hello} {userName},</Text>
          <Text>{t.reservationAt} {storeName}</Text>
          <Text>{t.pickupTime}: {pickupTime}</Text>
          <Img src={`cid:qr-code`} width={200} height={200} alt="QR Code" />
          <Text style={styles.pin}>PIN: {pin}</Text>
        </Container>
      </Body>
    </Html>
  );
}
```

**Avantages :**
- Type-safe, testable, composable
- Preview en dev avec `npx react-email dev`
- Les templates sont du code : versionnes dans Git, testes en CI
- Coherent avec le stack TypeScript/React

**Inconvenients :**
- Necessite un redeploy pour modifier un template (sauf si on ajoute un layer d'abstraction)
- L'admin ne peut pas editer les templates directement sans toucher au code

#### Option B : MJML + Handlebars

**Avantages :**
- MJML genere du HTML email responsive fiable
- Handlebars permet des templates editables par des non-developpeurs

**Inconvenients :**
- Pas type-safe
- Pas de preview en dev aussi fluide que React Email
- Deux langages supplementaires a connaitre (MJML + Handlebars)

#### Option C : Templates geres par le provider (Postmark/SendGrid)

**Avantages :**
- Editables via l'UI du provider (admin-friendly)
- Pas de code a deployer pour changer un template

**Inconvenients :**
- Lock-in total sur le provider
- Pas de versioning (Git)
- Pas de tests en CI
- Rendu inconsistant entre providers si on migre

#### Decision templating : **Option A -- React Email**

**Justification :**
1. Type-safety et testabilite
2. Integration native avec Resend
3. QR code inline via CID attachment (supporte par Resend)
4. Preview en dev avec le serveur React Email
5. Coherence avec le stack TypeScript

**Pour l'editabilite admin des templates :** les textes (traductions) sont stockes dans des fichiers JSON ou dans la base de donnees. L'admin peut modifier les textes via le backoffice React, sans toucher au layout. Le layout HTML (structure, couleurs, logo) ne change que via un deploy. C'est un compromis acceptable : les templates email changent rarement structurellement, mais les textes peuvent etre ajustes frequemment.

#### 3.3.3 Multilingue

Les templates supportent 3 langues (FR, EN, Creole mauricien). Le choix de la langue est determine par la preference de l'utilisateur (`user.preferredLanguage`).

```
emails/
  translations/
    fr.json    # { "confirmationTitle": "Reservation confirmee", ... }
    en.json    # { "confirmationTitle": "Reservation confirmed", ... }
    cr.json    # { "confirmationTitle": "Rezervasion konfirme", ... }
  templates/
    ReservationConfirmation.tsx
    CancellationNotice.tsx
    RefundConfirmation.tsx
    ClaimResolved.tsx
    ...
```

#### 3.3.4 QR code dans l'email de confirmation

La spec exige que l'email de confirmation de reservation contienne le QR code et le PIN pour le retrait. Implementation :

1. Le backend genere le QR code en image PNG via `qrcode` (librairie Node.js)
2. L'image est attachee a l'email en inline via le mecanisme CID de Resend :

```typescript
await resend.emails.send({
  from: 'BienBon <noreply@bienbon.mu>',
  to: user.email,
  subject: 'Reservation confirmee - BienBon',
  react: ReservationConfirmation({ ... }),
  attachments: [{
    filename: 'qr-code.png',
    content: qrCodeBuffer,        // Buffer PNG
    content_type: 'image/png',
    content_id: 'qr-code',        // Reference par <Img src="cid:qr-code" />
  }],
});
```

**Pourquoi CID et pas une URL externe ?**
- Certains clients email (Outlook, Gmail) bloquent les images externes par defaut
- Le CID inline garantit que le QR code s'affiche sans action de l'utilisateur
- Le QR code est genere a la demande (pas besoin de l'heberger sur un CDN)

---

### 3.4 Q4 -- In-app : stockage et transport temps reel

#### Option A : Table PostgreSQL + SSE (reutilisation de l'infra existante)

**Description :** Les notifications in-app sont stockees dans une table `notification` de PostgreSQL. Les nouvelles notifications sont poussees en temps reel via SSE (Server-Sent Events), deja utilise pour la synchronisation du stock (ADR-008).

**Avantages :**
- **Zero composant supplementaire** : PostgreSQL et SSE sont deja dans la stack
- Controle total sur le schema, les requetes, la retention
- Les notifications sont dans la meme transaction que l'evenement metier (coherence)
- Le compteur de non-lus est une simple requete `COUNT(*) WHERE read_at IS NULL`
- SSE est deja implemente pour le stock, on reutilise le meme canal/pattern

**Inconvenients :**
- Il faut implementer le centre de notifications from scratch (API CRUD, pagination, compteur)
- Le SSE ne fonctionne que quand l'app est au premier plan (pas de push quand l'app est fermee -- d'ou le push FCM en complement)

#### Option B : Novu (orchestrateur complet)

**Description :** Novu est une plateforme open-source d'orchestration de notifications. Il gere push, email, in-app, SMS, et chat dans une interface unifiee. Disponible en self-hosted (gratuit) ou en cloud (payant).

**Pricing Novu (fevrier 2026) :**
- **Self-hosted** : gratuit, open-source (AGPL), necessite Docker + MongoDB + Redis
- **Cloud Free** : 30 000 events/mois
- **Cloud Pro** : 30 $/mois pour 30K events, puis 0,0012 $/event
- **Cloud Team** : 250 $/mois pour 250K events

**Calcul pour BienBon :**
- Au lancement (100 notifs/jour = 3K/mois) : free tier cloud suffit
- A 50K notifs/jour = 1.5M/mois : self-hosted obligatoire (le cloud couterait ~1 800 $/mois)

**Self-hosted : exigences infra :**
- Docker Compose ou Kubernetes
- **MongoDB** (M20+ recommande sur Atlas, ou self-hosted)
- **Redis** (deja dans la stack)
- 4+ services a deployer (API, Worker, Web Dashboard, Widget)
- CPU : 2 vCPU minimum, 4 recommande
- RAM : 4 GB minimum

**Avantages :**
- Orchestrateur unifie : un seul workflow pour push + email + in-app
- Widget in-app prepackage (React component pour le centre de notifications)
- Dashboard pour visualiser les notifications envoyees
- Gestion des preferences utilisateur integree
- Digests, delays, et batching supportes

**Inconvenients :**
- **MongoDB** : un composant d'infra supplementaire. Le projet utilise PostgreSQL exclusivement (ADR-001). Ajouter MongoDB pour Novu est un cout operationnel significatif.
- Self-hosted = 4+ services Docker a maintenir, monitorer, mettre a jour
- Complexite d'integration : le workflow Novu est un DSL a apprendre
- Overkill pour 9 types de notifications avec une logique simple
- Le widget in-app est React -- mais les apps sont en Flutter (il faudrait un bridge WebView ou une implementation custom)
- La version self-hosted n'a pas toutes les features de la version cloud (certains connecteurs, l'editeur de workflow visuel)

#### Option C : Knock.app (SaaS)

**Description :** Plateforme SaaS de notification infrastructure. API-first, SDK React et iOS/Android.

**Pricing Knock (fevrier 2026) :**
- **Developer** : gratuit, 10 000 notifications/mois
- **Starter** : 50 000 notifications/mois, branding supprimee
- **Prepaid** : 0,005 $/message au-dela du quota
- **Enterprise** : volume discounts

**Calcul pour BienBon :**
- Au lancement (3K notifs/mois) : free tier
- A 50K notifs/jour = 1.5M/mois : 1,5M * 0,005 = **7 500 $/mois** (prohibitif)

**Avantages :**
- Zero infra a gerer
- Preferences utilisateur, batching, digests integres
- SDK React pour le centre de notifications in-app

**Inconvenients :**
- **Cout prohibitif a l'echelle** : 7 500 $/mois pour 50K notifs/jour
- Lock-in SaaS total
- Pas de SDK Flutter officiel (API REST uniquement)
- Donnees utilisateur hebergees chez un tiers (GDPR, Data Protection Act 2017 Maurice)

#### Decision Q4 : **Option A -- Table PostgreSQL + SSE**

**Justification :**
1. **Zero composant supplementaire** : pas de MongoDB (Novu), pas de SaaS externe (Knock)
2. Le centre de notifications in-app est un CRUD simple : creer, lister (pagine), marquer comme lu, compter les non-lus. C'est 4 endpoints NestJS + 1 table Prisma.
3. SSE est deja implemente dans ADR-008 pour le stock. On reutilise le meme pattern pour pousser les nouvelles notifications en temps reel.
4. Le cout est zero : la table `notification` dans PostgreSQL + quelques endpoints NestJS.
5. L'implementation custom prend 2-3 jours de developpement pour un composant qui n'evoluera pas beaucoup.
6. Les 9 types de notifications sont simples et bien definis. On n'a pas besoin d'un orchestrateur generique avec un DSL de workflow.

**Pourquoi pas Novu malgre le self-hosting gratuit :**
Novu self-hosted exige MongoDB, ce qui ajoute un composant d'infrastructure que le projet n'a pas (ADR-001 : PostgreSQL uniquement). Deployer, maintenir et monitorer MongoDB pour un orchestrateur de notifications est disproportionne quand la logique de routing est simple (9 types, regles statiques). Si le nombre de types de notifications explose (50+) ou si des workflows complexes apparaissent (branching, A/B testing, digests), Novu sera reconsidered.

---

### 3.5 Q5 -- Orchestration unifiee vs integrations separees

#### Option A : Module NestJS custom (integrations separees)

```
NotificationModule/
  notification.service.ts        # Orchestrateur : route vers le bon canal
  notification.controller.ts     # API in-app (liste, mark as read)
  channels/
    push.channel.ts              # FCM via firebase-admin
    email.channel.ts             # Resend via resend SDK
    inapp.channel.ts             # PostgreSQL write + SSE broadcast
  templates/
    email/                       # React Email templates
    push/                        # Titre + body par type et langue
  preferences/
    preferences.service.ts       # Verification des preferences avant envoi
  processors/
    notification.processor.ts    # Worker BullMQ qui consomme les jobs
```

**Avantages :**
- Controle total sur la logique d'orchestration
- Pas de dependance externe
- Code simple et lisible
- Testable unitairement (mock des canaux)
- Zero cout supplementaire

**Inconvenients :**
- A maintenir en interne
- Pas de dashboard visuel de notification delivery (mais BullMQ Board couvre les jobs)

#### Option B : Novu comme orchestrateur (self-hosted)

Voir section 3.4 Option B. Memes avantages et inconvenients, avec en plus :
- Le workflow de routing est defini dans Novu (pas dans le code NestJS)
- La logique de preferences est geree par Novu
- L'ajout d'un nouveau canal (SMS) se fait dans Novu sans code

#### Decision Q5 : **Option A -- Module NestJS custom**

**Justification :**
Le routing de notification est une logique simple et deterministe :

```
Si type == "reservation_confirmed" :
  -> push (toujours)
  -> email (toujours, transactionnel)
  -> in-app (toujours)

Si type == "favorite_new_basket" :
  -> Verifier preferences[user][favorite_push] == true
  -> Si oui : push
  -> in-app (toujours)
```

C'est un `switch/case` avec verification de preferences, pas un workflow dynamique avec branching et A/B testing. Un module NestJS de 200-300 lignes couvre ce besoin sans abstraction supplementaire.

L'ajout d'un nouveau type de notification = ajouter une entree dans un enum, un template push, eventuellement un template email. C'est 30 minutes de travail, pas un probleme d'orchestration.

---

### 3.6 Q6 -- Retry et Dead Letter Queue

#### Strategie de retry par canal

| Canal | Retry | Backoff | Max attempts | DLQ | Action DLQ |
|-------|-------|---------|:------------:|-----|------------|
| **Push (FCM)** | Oui | Exponentiel : 5s, 30s, 2min, 10min | 4 | Oui | Log + alerte si token invalide (supprimer le token) |
| **Email (Resend)** | Oui | Exponentiel : 10s, 1min, 5min, 30min | 4 | Oui | Log + alerte monitoring |
| **In-app (PostgreSQL)** | Non | -- | 1 | Non | Si la DB est down, toute l'app est down de toute facon |

#### Implementation BullMQ

```typescript
// Definir les options de retry par queue
const PUSH_QUEUE_OPTIONS = {
  attempts: 4,
  backoff: {
    type: 'exponential',
    delay: 5000,  // 5s, 30s, 2min, 10min (approximatif)
  },
};

const EMAIL_QUEUE_OPTIONS = {
  attempts: 4,
  backoff: {
    type: 'exponential',
    delay: 10000,  // 10s, 1min, 5min, 30min (approximatif)
  },
};
```

#### Gestion des tokens FCM expires

Quand FCM retourne une erreur `messaging/registration-token-not-registered` :
1. Supprimer le token de la table `device_token`
2. L'utilisateur ne recevra plus de push tant qu'il ne rouvre pas l'app (qui re-enregistre un token)
3. Log l'evenement pour monitoring

#### Gestion des bounces email

Resend envoie des webhooks pour les bounces et les complaints :
1. `bounce` : marquer l'email comme invalide dans `user.emailBounced = true`
2. `complaint` : idem, desactiver les emails marketing pour cet utilisateur
3. Les emails transactionnels continuent d'etre envoyes meme si un bounce a eu lieu (le user peut avoir corrige son email)

#### Dead Letter Queue

Les jobs en DLQ (apres 4 echecs) sont :
1. Persistes dans une queue BullMQ dediee `notification:dlq`
2. Un endpoint admin permet de lister les jobs en DLQ
3. Une alerte email est envoyee a l'equipe si > 10 jobs en DLQ en 1 heure
4. Les jobs en DLQ sont retenus 7 jours puis supprimes automatiquement

---

### 3.7 Q7 -- Notifications schedulees (rappel 1h avant retrait)

#### Option A : Delayed job BullMQ a la creation de la reservation

```typescript
// Quand une reservation est creee
const pickupStart = reservation.pickupSlot.startTime;
const reminderTime = subHours(pickupStart, 1);
const delay = differenceInMilliseconds(reminderTime, new Date());

if (delay > 0) {
  await this.notificationQueue.add('pickup-reminder', {
    reservationId: reservation.id,
    userId: reservation.userId,
  }, {
    delay,         // BullMQ delayed job
    jobId: `reminder-${reservation.id}`,  // Idempotent : evite les doublons
  });
}
```

**Avantages :**
- Precision au milliseconde : le rappel arrive exactement 1h avant
- Pas de polling : BullMQ gere le timer internement (Redis ZADD + score timestamp)
- Idempotent : le `jobId` empeche les doublons
- Annulable : si la reservation est annulee, on supprime le job par son `jobId`

**Inconvenients :**
- Si Redis redemarrera, les delayed jobs sont persistes (BullMQ utilise les structures Redis persistees). Mais si Redis est completement purge (perte de donnees), les rappels sont perdus.
- Les reservations creees pour un creneau dans > 24h ont un job en attente pendant longtemps (pas un probleme en pratique, Redis gere des millions de delayed jobs)

#### Option B : Cron qui scanne les reservations proches

```typescript
// Toutes les 5 minutes, chercher les reservations dont le pickup est dans ~1h
@Cron('*/5 * * * *')
async sendPickupReminders() {
  const reservations = await this.prisma.reservation.findMany({
    where: {
      pickupSlot: {
        startTime: {
          gte: addMinutes(new Date(), 55),
          lte: addMinutes(new Date(), 65),
        },
      },
      reminderSent: false,
      status: 'CONFIRMED',
    },
  });

  for (const reservation of reservations) {
    await this.notificationService.send('pickup_reminder', reservation.userId, { ... });
    await this.prisma.reservation.update({ where: { id: reservation.id }, data: { reminderSent: true } });
  }
}
```

**Avantages :**
- Ne depend pas de la persistance Redis
- Simple a implementer
- Resilient : si un cycle est rate, le suivant rattrapera les reservations

**Inconvenients :**
- Precision de +/- 5 minutes (le cron tourne toutes les 5 min)
- Charge base de donnees toutes les 5 minutes (requete sur toutes les reservations)
- Le flag `reminderSent` doit etre gere manuellement
- Race condition si deux instances du backend tournent (doublon de rappel)

#### Option C : Hybrid -- delayed job BullMQ + cron de rattrapage

Le delayed job BullMQ est le mecanisme principal. Un cron de rattrapage tourne toutes les 15 minutes et verifie que les rappels n'ont pas ete oublies (en cas de restart Redis, failover, etc.).

#### Decision Q7 : **Option A -- Delayed job BullMQ**

**Justification :**
1. BullMQ est deja choisi pour l'envoi asynchrone de notifications (Q1). Les delayed jobs sont une feature native, pas un ajout.
2. Precision exacte (vs +/- 5 minutes pour le cron).
3. Annulation triviale si la reservation est annulee.
4. Redis persiste les delayed jobs sur disque (RDB/AOF). Un restart Redis ne perd pas les jobs.
5. Un cron de rattrapage (Option C) peut etre ajoute plus tard comme safety net si des rappels sont manques en production. Au lancement, la fiabilite de Redis est suffisante.

---

## 4. Architecture du systeme de notifications

### 4.1 Diagramme d'architecture

```
+------------------------------------------------------------------+
|                         DECLENCHEURS                              |
|                                                                   |
|  [ReservationService]  [PartnerService]  [PaymentService]  [Cron]|
|         |                    |                  |             |    |
|         v                    v                  v             v    |
|  +--------------------------------------------------------------+ |
|  |              NotificationService                              | |
|  |                                                               | |
|  |  1. Determine le type de notification                         | |
|  |  2. Verifie les preferences utilisateur                       | |
|  |  3. Enqueue le(s) job(s) dans BullMQ                          | |
|  +------+-------------------+-------------------+----------------+ |
|         |                   |                   |                  |
+---------|-------------------|-------------------|------------------+
          |                   |                   |
          v                   v                   v
  +---------------+  +----------------+  +----------------+
  | Queue: push   |  | Queue: email   |  | Queue: inapp   |
  | (BullMQ/Redis)|  | (BullMQ/Redis) |  | (BullMQ/Redis) |
  +-------+-------+  +--------+-------+  +--------+-------+
          |                    |                   |
          v                    v                   v
  +---------------+  +----------------+  +------------------+
  | PushProcessor |  | EmailProcessor |  | InAppProcessor   |
  | (Worker)      |  | (Worker)       |  | (Worker)         |
  |               |  |                |  |                  |
  | 1. Fetch      |  | 1. Render      |  | 1. INSERT INTO   |
  |    device     |  |    React Email |  |    notification  |
  |    tokens     |  |    template    |  | 2. SSE broadcast |
  | 2. Send via   |  | 2. Attach QR   |  |    au user       |
  |    FCM        |  |    (si besoin) |  | 3. Mettre a jour |
  | 3. Handle     |  | 3. Send via    |  |    badge count   |
  |    errors     |  |    Resend      |  |                  |
  +-------+-------+  +--------+-------+  +--------+---------+
          |                    |                   |
          v                    v                   v
  +---------------+  +----------------+  +------------------+
  |  FCM / APNs   |  |    Resend      |  |   PostgreSQL     |
  |  (Google)     |  |    (API)       |  |   + SSE stream   |
  +---------------+  +----------------+  +------------------+
          |                    |                   |
          v                    v                   v
  +---------------+  +----------------+  +------------------+
  | Flutter App   |  |  Boite email   |  | Flutter App      |
  | (foreground   |  |  utilisateur   |  | (centre de       |
  |  + background)|  |                |  |  notifications)  |
  +---------------+  +----------------+  +------------------+


  En cas d'echec (apres 4 retries) :

  +---------------+
  | DLQ Queue     |
  | (BullMQ)      |
  | - Log         |
  | - Alerte      |
  | - Retention   |
  |   7 jours     |
  +---------------+
```

### 4.2 Composants et responsabilites

| Composant | Technologie | Responsabilite |
|-----------|-------------|----------------|
| `NotificationService` | NestJS service | Point d'entree unique. Recoit les events metier, determine les canaux, verifie les preferences, enqueue les jobs. |
| `PreferencesService` | NestJS service | CRUD sur les preferences utilisateur. Verifie si un canal est active pour un type donne. Bypass pour les transactionnels. |
| `PushProcessor` | BullMQ worker | Consomme la queue `push`. Recupere les tokens FCM du user, envoie via `firebase-admin`. Gere les retries et les tokens expires. |
| `EmailProcessor` | BullMQ worker | Consomme la queue `email`. Render le template React Email, genere le QR code si necessaire, envoie via Resend. |
| `InAppProcessor` | BullMQ worker | Consomme la queue `inapp`. Insere la notification en base, broadcast via SSE, met a jour le compteur de non-lus. |
| `NotificationController` | NestJS controller | API REST pour le centre in-app : `GET /notifications`, `PATCH /notifications/:id/read`, `POST /notifications/read-all`, `GET /notifications/unread-count`. |
| `NotificationGateway` | NestJS SSE | Endpoint SSE (`GET /notifications/stream`) pour pousser les nouvelles notifications en temps reel. |

---

## 5. Schema de la base de donnees

### 5.1 Table `notification` (centre in-app)

```prisma
model Notification {
  id          String             @id @default(cuid())
  userId      String
  user        User               @relation(fields: [userId], references: [id])
  type        NotificationType
  title       String             // Titre affiche dans le centre (localise)
  body        String             // Corps du message (localise)
  imageUrl    String?            // URL de l'icone/image (ex: photo du commerce)
  data        Json?              // Payload pour le deep link (ex: { reservationId: "xxx" })
  readAt      DateTime?          // null = non lu
  createdAt   DateTime           @default(now())
  expiresAt   DateTime           // createdAt + 30 jours

  @@index([userId, readAt])      // Pour le compteur de non-lus
  @@index([userId, createdAt])   // Pour la liste paginee
  @@index([expiresAt])           // Pour le cleanup TTL
}

enum NotificationType {
  FAVORITE_NEW_BASKET
  RESERVATION_CONFIRMED
  PICKUP_REMINDER
  PARTNER_CANCELLED
  REFUND_PROCESSED
  NO_SHOW_ALERT
  CLAIM_RESOLVED
  REFERRAL_VALIDATED
  MARKETING
  // Partenaire
  NEW_RESERVATION
  PARTNER_NO_SHOW
  PARTNER_PAYOUT
  PARTNER_MODIFICATION
  // Admin
  FRAUD_ALERT
  NEW_PARTNER_SIGNUP
}
```

### 5.2 Table `device_token` (tokens FCM)

```prisma
model DeviceToken {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  token       String   @unique   // Token FCM
  platform    Platform            // iOS ou ANDROID
  appType     AppType             // CONSUMER ou PARTNER
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId])
}

enum Platform {
  IOS
  ANDROID
}

enum AppType {
  CONSUMER
  PARTNER
}
```

### 5.3 Table `notification_preference` (preferences utilisateur)

```prisma
model NotificationPreference {
  id          String             @id @default(cuid())
  userId      String             @unique
  user        User               @relation(fields: [userId], references: [id])

  // Chaque champ represente un toggle (true = active)
  // Les transactionnels (reservation_confirmed, partner_cancelled, refund_processed)
  // sont TOUJOURS envoyes -- pas de toggle dans l'UI, pas de champ ici

  favoritePush         Boolean @default(true)   // Favori publie un nouveau panier
  pickupReminderPush   Boolean @default(true)   // Rappel 1h avant retrait
  noShowPush           Boolean @default(true)   // Alerte no-show
  claimResolvedPush    Boolean @default(true)   // Reclamation resolue (push)
  claimResolvedEmail   Boolean @default(true)   // Reclamation resolue (email)
  referralPush         Boolean @default(true)   // Parrainage valide
  marketingPush        Boolean @default(true)   // Notifications marketing
  marketingEmail       Boolean @default(true)   // Emails marketing

  updatedAt   DateTime @updatedAt
}
```

### 5.4 Table `notification_log` (audit trail)

```prisma
model NotificationLog {
  id              String               @id @default(cuid())
  userId          String
  type            NotificationType
  channel         NotificationChannel
  status          DeliveryStatus
  providerRef     String?              // ID chez le provider (ex: Resend message ID, FCM message ID)
  errorMessage    String?              // Message d'erreur si echec
  attempts        Int                  @default(1)
  createdAt       DateTime             @default(now())

  @@index([userId, createdAt])
  @@index([status, createdAt])         // Pour le dashboard admin
}

enum NotificationChannel {
  PUSH
  EMAIL
  IN_APP
}

enum DeliveryStatus {
  QUEUED
  SENT
  DELIVERED       // Si on a le feedback du provider
  FAILED
  BOUNCED         // Email specifique
}
```

### 5.5 Nettoyage TTL

Un cron job NestJS (`@Cron('0 3 * * *')` -- 3h du matin chaque jour) supprime les notifications in-app expirees :

```typescript
@Cron('0 3 * * *')
async cleanupExpiredNotifications() {
  const deleted = await this.prisma.notification.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  this.logger.log(`Cleaned up ${deleted.count} expired notifications`);
}
```

---

## 6. Flow de bout en bout : confirmation de reservation

Ce flow illustre le parcours complet d'une notification multi-canal, du declencheur metier jusqu'au device de l'utilisateur.

```
TEMPS   COMPOSANT                    ACTION
─────   ─────────                    ──────

t0      ConsumerApp (Flutter)        POST /reservations { basketId, paymentMethodId }
        |
t1      ReservationController        Valide la requete, appelle ReservationService
        |
t2      ReservationService           Dans une transaction PostgreSQL :
        |                            1. Verifie le stock (SELECT FOR UPDATE)
        |                            2. Decremente le stock
        |                            3. Cree la reservation (status: CONFIRMED)
        |                            4. Cree le payment intent (via PaymentModule)
        |                            5. Genere le QR code (cuid) et le PIN (4 chiffres)
        |
t3      ReservationService           Appelle NotificationService.send({
        |                              type: 'RESERVATION_CONFIRMED',
        |                              userId: consumer.id,
        |                              data: {
        |                                reservationId, storeName, pickupSlot,
        |                                qrCode, pin, basketPrice
        |                              }
        |                            })
        |
t4      NotificationService          1. Type = RESERVATION_CONFIRMED
        |                            2. C'est un transactionnel -> bypass preferences
        |                            3. Canaux = [PUSH, EMAIL, IN_APP]
        |                            4. Enqueue 3 jobs BullMQ :
        |                               - push:reservation_confirmed
        |                               - email:reservation_confirmed
        |                               - inapp:reservation_confirmed
        |
t4.1    NotificationService          Enqueue un delayed job pour le rappel :
        |                            push:pickup_reminder (delay = pickupStart - 1h - now)
        |
t5      ReservationController        Retourne 201 Created au client
        |                            (la reservation est confirmee, les notifs sont en queue)
        |                            LATENCE t0->t5 : < 500ms
        |
        |  -------- ASYNCHRONE (workers BullMQ) --------
        |
t6      InAppProcessor               INSERT INTO notification (
        |                              userId, type: RESERVATION_CONFIRMED,
        |                              title: "Reservation confirmee !",
        |                              body: "Votre panier chez {storeName} est reserve.",
        |                              data: { reservationId }
        |                            )
        |                            SSE broadcast -> Flutter app met a jour le badge
        |
t7      PushProcessor                1. SELECT token FROM device_token WHERE userId = ...
        |                            2. admin.messaging().send({
        |                                 token,
        |                                 notification: {
        |                                   title: "Reservation confirmee !",
        |                                   body: "Votre panier chez {storeName}..."
        |                                 },
        |                                 data: { type: "reservation_confirmed",
        |                                         reservationId }
        |                               })
        |                            3. FCM -> APNs (iOS) ou FCM direct (Android)
        |                            4. Push arrive sur le telephone
        |                            LATENCE t5->t7 : < 2 secondes
        |
t8      EmailProcessor               1. Genere le QR code PNG (qrcode library)
        |                            2. Render React Email template :
        |                               ReservationConfirmation({
        |                                 userName, storeName, pickupTime,
        |                                 qrCodeBase64, pin, lang: user.preferredLanguage
        |                               })
        |                            3. resend.emails.send({
        |                                 from: 'BienBon <noreply@bienbon.mu>',
        |                                 to: user.email,
        |                                 subject: 'Reservation confirmee - BienBon',
        |                                 react: template,
        |                                 attachments: [{ content_id: 'qr-code', ... }]
        |                               })
        |                            LATENCE t5->t8 : < 5 secondes
        |
        |  -------- 1H AVANT LE RETRAIT --------
        |
t+1h    PushProcessor                Le delayed job se declenche.
        |                            1. Verifie que la reservation est toujours CONFIRMED
        |                            2. Envoie le push : "Rappel : retrait dans 1h chez {store}"
```

### Latences cibles

| Etape | Latence cible | Justification |
|-------|:------------:|---------------|
| API response (t0 -> t5) | < 500ms | Le consommateur doit voir sa confirmation immediatement |
| Push notification | < 2s apres response | Le telephone vibre pendant que l'ecran de confirmation s'affiche |
| Email | < 10s apres response | L'email n'est pas urgent, mais doit arriver rapidement |
| In-app + badge | < 1s apres response | Le centre de notifications se met a jour en temps reel via SSE |
| Total bout en bout | < 5s (push) | Exigence spec : confirmation en < 5 secondes |

---

## 7. Gestion des preferences utilisateur

### 7.1 Matrice preferences vs types

```
                              Push    Email
                              ─────   ─────
Favori nouveau panier         [x]     --        (push only)
Confirmation reservation      FORCE   FORCE     (transactionnel, non desactivable)
Rappel 1h avant retrait       [x]     --        (push only)
Annulation partenaire         FORCE   FORCE     (transactionnel)
Remboursement effectue        FORCE   FORCE     (transactionnel)
Alerte no-show                [x]     --        (push only)
Reclamation resolue           [x]     [x]       (2 toggles)
Parrainage valide             [x]     --        (push only)
Marketing                     [x]     [x]       (2 toggles)

[x] = toggle activable/desactivable par l'utilisateur
FORCE = toujours envoye, pas de toggle dans l'UI
-- = canal non utilise pour ce type
```

**Total : 8 toggles** (conformement a US-C056)

### 7.2 Implementation dans le NotificationService

```typescript
async send(type: NotificationType, userId: string, data: Record<string, any>) {
  const channels = this.getChannelsForType(type);
  const preferences = await this.preferencesService.getForUser(userId);

  for (const channel of channels) {
    // Les transactionnels bypasses les preferences
    if (this.isTransactional(type) || this.isEnabled(preferences, type, channel)) {
      await this.enqueueNotification(channel, { type, userId, data });
    }
  }

  // Toujours creer la notification in-app (meme si push/email sont desactives)
  await this.enqueueNotification('IN_APP', { type, userId, data });
}

private isTransactional(type: NotificationType): boolean {
  return [
    'RESERVATION_CONFIRMED',
    'PARTNER_CANCELLED',
    'REFUND_PROCESSED',
  ].includes(type);
}
```

### 7.3 API des preferences

```
GET    /notifications/preferences          -> NotificationPreference
PATCH  /notifications/preferences          -> NotificationPreference
       Body: { favoritePush: false, marketingEmail: false, ... }
```

---

## 8. Comparatif de cout (projection)

### 8.1 Phase lancement (0-1 000 utilisateurs, ~500 notifs/jour)

| Composant | Provider | Cout/mois |
|-----------|----------|:---------:|
| Push | FCM | **Gratuit** |
| Email | Resend (free tier : 3K/mois) | **Gratuit** |
| In-app | PostgreSQL (inclus dans Supabase) | **Gratuit** |
| Queue | Redis (inclus dans le VPS ou Upstash free) | **Gratuit** |
| **Total** | | **0 $/mois** |

### 8.2 Phase croissance (5 000 utilisateurs, ~10K notifs/jour)

| Composant | Provider | Cout/mois |
|-----------|----------|:---------:|
| Push | FCM | **Gratuit** |
| Email | Resend Pro (50K emails/mois) | **20 $/mois** |
| In-app | PostgreSQL | **Gratuit** |
| Queue | Redis (Upstash Pro ou VPS) | **~5 $/mois** |
| **Total** | | **~25 $/mois** |

### 8.3 Phase scale (20 000 utilisateurs, ~50K notifs/jour)

| Composant | Provider | Cout/mois |
|-----------|----------|:---------:|
| Push | FCM | **Gratuit** |
| Email | Resend Scale (100K emails/mois) | **90 $/mois** |
| In-app | PostgreSQL | **Gratuit** |
| Queue | Redis managed (Upstash ou Railway) | **~15 $/mois** |
| **Total** | | **~105 $/mois** |

### 8.4 Comparaison avec les alternatives

| Solution | Phase lancement | Phase croissance | Phase scale |
|----------|:--------------:|:----------------:|:-----------:|
| **Notre choix (FCM + Resend + PostgreSQL)** | **0 $/mois** | **25 $/mois** | **105 $/mois** |
| Novu Cloud | 0 $/mois | 30 $/mois + 20 $/email | ~250 $/mois |
| Knock.app | 0 $/mois | ~250 $/mois | ~7 500 $/mois |
| OneSignal + Resend | 0 $/mois | ~100 $/mois | ~300 $/mois |

Notre approche est la plus economique a toutes les phases grace a FCM gratuit et a l'absence de SaaS intermediaire.

---

## 9. Decision

### 9.1 Choix retenus

| Question | Decision | Justification courte |
|----------|----------|---------------------|
| Q1 Orchestration | **BullMQ (Redis)** | Deja dans la stack, retries natifs, delayed jobs, module NestJS officiel |
| Q2 Push | **FCM unifie** | Gratuit, illimite, FlutterFire mature, aucune restriction Maurice |
| Q3 Email provider | **Resend** | React Email natif, CID inline pour QR, 20 $/mois pour 50K, DX moderne |
| Q3 Templating | **React Email (JSX)** | Type-safe, testable, coherent avec le stack TypeScript |
| Q4 In-app stockage | **Table PostgreSQL** | Zero composant supplementaire, CRUD simple, 30 jours TTL |
| Q4 In-app transport | **SSE (reutilisation ADR-008)** | Deja en place pour le stock, simple et suffisant |
| Q5 Orchestration | **Module NestJS custom** | 9 types, logique simple, pas besoin d'un orchestrateur generique |
| Q6 Retry | **BullMQ backoff exponentiel, 4 tentatives, DLQ** | Fiabilite transactionnelle, monitoring via BullMQ Board |
| Q7 Scheduled | **Delayed job BullMQ** | Precision exacte, annulable, natif BullMQ |

### 9.2 Stack de notification

```
+---------------------------------------------------+
|                 Application Layer                  |
|                                                    |
|  NotificationService (NestJS)                      |
|  - Routing par type                                |
|  - Verification des preferences                    |
|  - Enqueue dans BullMQ                             |
+---------------------------------------------------+
                        |
                        v
+---------------------------------------------------+
|                 Queue Layer                        |
|                                                    |
|  BullMQ (Redis)                                    |
|  - Queue: push                                     |
|  - Queue: email                                    |
|  - Queue: inapp                                    |
|  - Queue: dlq (dead letter)                        |
|  - Delayed jobs (rappel pickup)                    |
+---------------------------------------------------+
                        |
                        v
+---------------------------------------------------+
|                 Worker Layer                       |
|                                                    |
|  PushProcessor -> FCM (firebase-admin)             |
|  EmailProcessor -> Resend + React Email            |
|  InAppProcessor -> PostgreSQL + SSE                |
+---------------------------------------------------+
                        |
                        v
+---------------------------------------------------+
|                 Delivery Layer                     |
|                                                    |
|  FCM -> APNs (iOS) / GCM (Android) -> Device      |
|  Resend -> Boite email                             |
|  PostgreSQL -> SSE -> Flutter App (centre notifs)  |
+---------------------------------------------------+
```

---

## 10. Consequences

### 10.1 Positives

1. **Cout quasi-nul au lancement** : 0 $/mois en phase 1, ~25 $/mois en phase 2. FCM gratuit est un avantage majeur.
2. **Fiabilite transactionnelle** : BullMQ avec retries garantit que les notifications critiques (confirmation, annulation, remboursement) arrivent toujours.
3. **Latence < 5s** : le decouplage asynchrone permet de repondre immediatement au client tandis que les notifications sont traitees en parallele.
4. **Zero composant supplementaire** : tout fonctionne avec NestJS + Redis + PostgreSQL + SSE, deja prevus dans la stack.
5. **Simplicite** : un module NestJS de ~500 lignes couvre toute l'orchestration. Pas de DSL de workflow, pas de SaaS externe, pas de MongoDB.
6. **Templates type-safe** : React Email en TSX, testables, versionnes, avec preview en dev.
7. **Multilingue natif** : fichiers de traduction JSON par langue, determines par la preference de l'utilisateur.

### 10.2 Negatives

1. **Implementation custom** : le centre de notifications in-app est a developper from scratch (estimee a 2-3 jours). Un SaaS comme Knock fournirait un widget preconstruit.
2. **Pas de dashboard de notification delivery** : on n'a pas l'equivalent du dashboard Novu ou Knock pour visualiser le delivery rate par canal. Mitigation : les logs BullMQ Board + les webhooks Resend + le `notification_log` en base couvrent les besoins de monitoring essentiels.
3. **Dependance Firebase pour FCM** : meme si on n'utilise que FCM, un projet Firebase est necessaire. C'est un composant supplementaire a gerer dans la console Google.
4. **Templates email non editables par l'admin sans deploy** : les textes sont editables (traductions en base), mais le layout HTML necessite un redeploy. Mitigation : le layout change rarement ; pour les textes, un endpoint admin permet la modification.

---

## 11. Risques

| Risque | Probabilite | Impact | Mitigation |
|--------|:-----------:|:------:|------------|
| **Redis down = plus de notifications** | Faible | Eleve | Redis persiste les jobs sur disque (AOF). En cas de crash, les jobs sont recuperes au restart. Pour une HA plus forte : Redis Sentinel ou Upstash (managed). |
| **FCM change son modele de prix** | Tres faible | Moyen | FCM est gratuit depuis 2014 (ex-GCM). Google n'a pas d'incentive a le rendre payant (il alimente l'ecosysteme Android). Si ca arrive, migration vers OneSignal (1-2 jours de travail). |
| **Resend down = emails retardes** | Faible | Moyen | BullMQ retry pendant 30 minutes. Si Resend est down plus longtemps, les jobs atterrissent en DLQ. L'adaptateur email peut etre switch vers Postmark en cas de probleme prolonge. |
| **Token FCM invalide / expire** | Certaine | Faible | Gestion automatique : detection de l'erreur FCM, suppression du token, le user re-enregistre un token au prochain lancement de l'app. |
| **Spam de notifications (favori sur commerce populaire)** | Moyenne | Moyen | Rate limiting : max 1 notification "favori" par commerce par jour et par utilisateur. Batch si un commerce publie 3 paniers en 5 minutes. |
| **Rappel push arrive apres le retrait (bug delayed job)** | Faible | Faible | Verification dans le PushProcessor : si la reservation n'est plus CONFIRMED (deja retiree ou annulee), le rappel est ignore. |
| **Volume de notifications in-app surcharge la table PostgreSQL** | Faible | Moyen | TTL de 30 jours + cleanup cron quotidien. Index sur (userId, createdAt) et (userId, readAt). A 50K users avec 30 notifs chacun = 1.5M rows : PostgreSQL gere sans probleme. |
| **Les emails tombent en spam** | Moyenne | Eleve | Configuration DNS correcte (SPF, DKIM, DMARC) sur le domaine `bienbon.mu`. Resend gere DKIM automatiquement. Utilisation d'un domaine d'envoi dedie (`mail.bienbon.mu`). Pas de contenu marketing dans les emails transactionnels. Voir section 11.1 pour le detail complet. |

### 11.1 Email deliverability : configuration SPF/DKIM/DMARC

La deliverability des emails transactionnels est **critique** pour BienBon : un email de confirmation de reservation qui tombe en spam signifie un consommateur sans son QR code de retrait. Cette section documente la configuration DNS et les bonnes pratiques pour garantir que les emails arrivent en boite de reception.

#### Inventaire des emails transactionnels du projet

| # | Email | Declencheur | Criticite |
|---|-------|-------------|-----------|
| 1 | **Confirmation de commande** | Reservation confirmee apres paiement | Critique (contient QR + PIN) |
| 2 | **Confirmation de retrait** | Panier retire avec succes | Haute |
| 3 | **Reinitialisation de mot de passe** | Demande utilisateur | Critique (securite) |
| 4 | **Bienvenue** | Creation de compte | Moyenne |
| 5 | **Payout partenaire** | Virement mensuel execute | Haute (financier) |
| 6 | **Alerte fraude admin** | Pattern suspect detecte | Critique (securite) |

#### Configuration SPF (Sender Policy Framework)

SPF declare quels serveurs sont autorises a envoyer des emails pour le domaine `bienbon.mu`. Resend fournit les IP de ses serveurs d'envoi.

```dns
; DNS TXT record pour bienbon.mu
bienbon.mu.  IN  TXT  "v=spf1 include:_spf.resend.com ~all"
```

**Explication :**
- `include:_spf.resend.com` : autorise les serveurs Resend a envoyer pour `bienbon.mu`
- `~all` (softfail) : les serveurs non listes sont marques comme suspects mais pas rejetes. On passera a `-all` (hardfail) apres validation en production.

Si un domaine d'envoi dedie est utilise (`mail.bienbon.mu`), ajouter un record SPF specifique :

```dns
mail.bienbon.mu.  IN  TXT  "v=spf1 include:_spf.resend.com -all"
```

#### Configuration DKIM (DomainKeys Identified Mail)

DKIM signe cryptographiquement chaque email pour prouver qu'il n'a pas ete modifie en transit. **Resend genere automatiquement les cles DKIM** lors de l'ajout du domaine dans le dashboard.

**Procedure :**
1. Ajouter le domaine `bienbon.mu` (ou `mail.bienbon.mu`) dans le dashboard Resend
2. Resend fournit 3 records CNAME a ajouter dans le DNS :

```dns
; Records DKIM fournis par Resend (exemple -- les valeurs exactes sont generees par Resend)
resend._domainkey.bienbon.mu.  IN  CNAME  resend._domainkey.bienbon.mu.xxxxx.dkim.resend.dev.
resend2._domainkey.bienbon.mu. IN  CNAME  resend2._domainkey.bienbon.mu.xxxxx.dkim.resend.dev.
resend3._domainkey.bienbon.mu. IN  CNAME  resend3._domainkey.bienbon.mu.xxxxx.dkim.resend.dev.
```

3. Resend verifie automatiquement la propagation DNS et active le signing DKIM

#### Configuration DMARC (Domain-based Message Authentication, Reporting and Conformance)

DMARC indique aux serveurs recepteurs comment traiter les emails qui echouent les verifications SPF et DKIM. **Strategie de deploiement progressif :**

**Phase 1 -- Monitoring (2 premieres semaines) :**

```dns
_dmarc.bienbon.mu.  IN  TXT  "v=DMARC1; p=none; rua=mailto:dmarc-reports@bienbon.mu; ruf=mailto:dmarc-reports@bienbon.mu; fo=1; pct=100"
```

- `p=none` : aucune action sur les echecs, monitoring uniquement
- `rua` : adresse pour les rapports agreges (un par jour par serveur recepteur)
- `ruf` : adresse pour les rapports forensiques (detail de chaque echec)
- `fo=1` : generer un rapport forensique si SPF **ou** DKIM echoue (pas seulement si les deux echouent)

**Phase 2 -- Quarantaine (apres 2 semaines de monitoring sans faux positifs) :**

```dns
_dmarc.bienbon.mu.  IN  TXT  "v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@bienbon.mu; ruf=mailto:dmarc-reports@bienbon.mu; fo=1; pct=100"
```

- `p=quarantine` : les emails qui echouent SPF/DKIM sont places en spam

**Phase 3 -- Reject (optionnel, apres 1 mois de quarantaine stable) :**

```dns
_dmarc.bienbon.mu.  IN  TXT  "v=DMARC1; p=reject; rua=mailto:dmarc-reports@bienbon.mu; fo=1; pct=100"
```

- `p=reject` : les emails qui echouent sont rejetes. A n'activer que si aucun faux positif en quarantaine.

#### Return-Path alignment

Le Return-Path (adresse de bounce) doit etre aligne avec le domaine d'envoi pour que SPF passe le controle d'alignement DMARC. Resend permet de configurer un domaine de Return-Path custom :

```dns
; CNAME pour le Return-Path (fourni par Resend)
bounce.bienbon.mu.  IN  CNAME  feedback-smtp.resend.com.
```

Cela garantit que l'en-tete `Return-Path: bounce@bounce.bienbon.mu` est aligne avec le domaine `From: noreply@bienbon.mu` (meme domaine organisationnel).

#### Monitoring des rapports DMARC

Les rapports DMARC sont des fichiers XML envoyes par les serveurs recepteurs (Gmail, Outlook, Yahoo, etc.). Ils sont illisibles a l'etat brut. Utiliser un service gratuit pour les agreger et les visualiser :

| Service | Cout | Fonctionnalites |
|---------|------|-----------------|
| **Postmark DMARC** (dmarc.postmarkapp.com) | Gratuit | Digest hebdomadaire, dashboard simple, alertes |
| **dmarcian Free** | Gratuit (1 domaine) | Dashboard detaille, timeline, conseils de remediation |
| **Google Postmaster Tools** | Gratuit | Reputation du domaine aupres de Gmail specifiquement |

**Recommandation** : utiliser **Postmark DMARC** (gratuit, sans compte Postmark requis) pour le monitoring initial, et **Google Postmaster Tools** en complement pour la reputation Gmail (le provider email dominant a Maurice).

#### Validation pre-lancement

Avant de lancer les emails en production, executer les tests suivants :

1. **mail-tester.com** : envoyer un email de test a l'adresse fournie par mail-tester.com. Le service attribue un score sur 10 qui evalue SPF, DKIM, DMARC, contenu, blacklists, etc. **Objectif : score >= 9/10.**

2. **Checklist DNS** :
   - [ ] SPF record present et valide (`v=spf1 include:_spf.resend.com ...`)
   - [ ] DKIM records (3 CNAME) propages et verifies dans le dashboard Resend
   - [ ] DMARC record present (`v=DMARC1; p=none; ...`)
   - [ ] Return-Path CNAME configure
   - [ ] Domaine verifie dans le dashboard Resend (status "Verified")

3. **Test de deliverability multi-provider** : envoyer un email de test a des adresses Gmail, Outlook/Hotmail, Yahoo, et Orange (FAI present a Maurice) pour verifier que l'email arrive en boite de reception (pas en spam).

4. **Verifier les en-tetes** : dans Gmail, "Afficher l'original" pour verifier que SPF = PASS, DKIM = PASS, DMARC = PASS.

#### Bonnes pratiques complementaires

- **Separer les flux transactionnels et marketing** : ne jamais envoyer de contenu marketing dans les emails transactionnels (confirmer la reservation, c'est tout). Cela preserve la reputation du domaine d'envoi.
- **Domaine d'envoi dedie** : utiliser `mail.bienbon.mu` ou `notifications.bienbon.mu` comme sous-domaine d'envoi, pour isoler la reputation email de la reputation du domaine principal.
- **Adresse From coherente** : toujours envoyer depuis `noreply@bienbon.mu` (ou `noreply@mail.bienbon.mu`). Ne pas changer l'adresse d'expedition entre les types d'emails.
- **List-Unsubscribe header** : ajouter un header `List-Unsubscribe` dans les emails marketing (pas dans les transactionnels). C'est exige par Gmail depuis 2024 pour les envois > 5000/jour.
- **Monitorer le taux de bounce** : les webhooks Resend (section 3.3, "Gestion des bounces email") permettent de detecter les adresses invalides. Un taux de bounce > 5% degrade la reputation du domaine.

---

## 12. Plan d'implementation

### Phase 1 -- MVP (Sprint 1-2)

- [ ] Creer le projet Firebase (FCM uniquement)
- [ ] Setup `firebase-admin` dans NestJS
- [ ] Creer le `NotificationModule` avec les 3 processeurs (push, email, in-app)
- [ ] Implementer les queues BullMQ (`push`, `email`, `inapp`, `dlq`)
- [ ] Creer les tables Prisma : `notification`, `device_token`, `notification_preference`, `notification_log`
- [ ] Implementer le `DeviceTokenService` (register, refresh, delete)
- [ ] Implementer 2 types de notifications : `RESERVATION_CONFIRMED` (push + email + in-app) et `PICKUP_REMINDER` (push)
- [ ] Creer le template React Email pour la confirmation de reservation (avec QR code inline)
- [ ] Integrer `firebase_messaging` dans l'app Flutter consumer
- [ ] Creer l'ecran "Centre de notifications" dans Flutter (liste, badge, mark as read)
- [ ] Endpoint SSE pour les notifications in-app temps reel

### Phase 2 -- Completude (Sprint 3-4)

- [ ] Implementer les 7 types de notifications restants (consommateur)
- [ ] Implementer les 4 types partenaire
- [ ] Implementer les 3 types admin
- [ ] Creer les templates React Email restants (annulation, remboursement, reclamation resolue, payout partenaire, daily summary admin)
- [ ] Creer l'ecran "Preferences de notifications" dans Flutter (8 toggles)
- [ ] Traductions FR/EN/Creole pour tous les templates push et email
- [ ] Retry et DLQ avec monitoring BullMQ Board
- [ ] Webhook Resend pour les bounces et complaints
- [ ] Cleanup cron pour les notifications expirees (30 jours)

### Phase 3 -- Durcissement (Sprint 5+)

- [ ] Rate limiting sur les notifications "favori" (anti-spam)
- [ ] Dashboard admin : taux de delivery, jobs en DLQ, bounces
- [ ] Tests E2E du flow de notification complet (reservation -> push + email + in-app)
- [ ] Monitoring : alerte si > 10 jobs en DLQ en 1h
- [ ] Documentation des runbooks (que faire si FCM est down, si Resend bounce, etc.)

---

## 13. Decisions connexes

| ADR | Sujet | Impact sur les notifications |
|-----|-------|-----------------------------|
| ADR-001 | Stack backend (NestJS + Prisma + Redis) | Confirme BullMQ et PostgreSQL comme composants de base |
| ADR-002 | Architecture monolithe modulaire | NotificationModule est un module interne, premier candidat a l'extraction |
| ADR-008 | Stock sync (SSE + pg_notify) | SSE reutilise pour le transport in-app temps reel |
| ADR-010 | Supabase Auth | Les user IDs Supabase sont utilises comme cles dans device_token et notification_preference |
| ADR-005 | Architecture paiement | Les events de paiement (confirmation, remboursement) declenchent des notifications |

---

## 14. References

### Providers -- Pricing et documentation
- [Firebase Cloud Messaging -- Pricing](https://firebase.google.com/pricing) -- FCM gratuit et illimite
- [Resend -- Pricing](https://resend.com/pricing) -- Free 3K/mois, Pro 20$/mois (50K)
- [Novu -- Pricing](https://novu.co/pricing) -- Self-hosted gratuit, Cloud 30$/mois (30K events)
- [OneSignal -- Pricing](https://onesignal.com/pricing) -- Growth 19$/mois + 0,012$/MAU
- [Knock -- Pricing](https://knock.app/pricing) -- Free 10K/mois, 0,005$/message au-dela

### Technique
- [NestJS -- Queues (BullMQ)](https://docs.nestjs.com/techniques/queues) -- Module officiel @nestjs/bullmq
- [BullMQ Documentation](https://docs.bullmq.io/) -- Delayed jobs, retries, DLQ
- [React Email](https://react.email/) -- Templates email en JSX
- [Resend -- Inline images via CID](https://resend.com/changelog/embed-images-using-cid)
- [FlutterFire -- Firebase Messaging](https://firebase.flutter.dev/docs/messaging/apple-integration/) -- Setup FCM pour Flutter iOS/Android
- [pg-boss -- PostgreSQL job queue](https://github.com/timgit/pg-boss) -- Alternative a BullMQ sans Redis

### Architecture de reference
- [Novu vs custom notification system](https://dub.co/blog/best-notification-infrastructure-services)
- [Building a notification system with NestJS and BullMQ](https://blog.devgenius.io/implementing-a-robust-queue-system-in-nestjs-with-postgresql-an-alternative-to-bull-f55aad366912)
- [Knock -- Top notification infrastructure platforms](https://knock.app/blog/the-top-notification-infrastructure-platforms-for-developers)
