# ADR-036 : Plan de reprise d'activite (Disaster Recovery)

## Statut : Proposition

**Date** : 2026-02-27
**Auteur** : Equipe architecture BienBon.mu
**Relecteurs** : A definir
**Prerequis** : ADR-001 (stack backend), ADR-005 (architecture paiement), ADR-007 (ledger commissions), ADR-012 (offline-first cache), ADR-020 (hebergement infrastructure), ADR-021 (conformite data protection)

---

## Contexte

BienBon.mu est une marketplace de paniers anti-gaspi a l'ile Maurice. L'application gere des transactions financieres (paiements consommateurs, commissions, reversements partenaires) et des donnees perissables par nature (paniers d'invendus a retirer dans un creneau horaire precis). Une panne prolongee a des consequences directes :

- **Financieres** : des paiements en cours de traitement peuvent etre perdus ou dupliques
- **Operationnelles** : des paniers invendus sont perimes et jetes si non retires a temps
- **Reputationnelles** : la confiance des partenaires et consommateurs s'erode rapidement

### Pourquoi cette decision est necessaire maintenant

Le plan de reprise d'activite (PRA / Disaster Recovery Plan) doit etre concu AVANT le lancement, pas apres le premier incident. Les decisions d'architecture (backup, idempotence, mode degrade) doivent etre integrees des la phase de developpement. De plus, le contexte geographique de Maurice (cyclones tropicaux, dependance aux cables sous-marins) impose des contraintes specifiques que les hebergeurs cloud standard ne couvrent pas nativement.

### Architecture de reference

```
Utilisateur (Maurice)
  -> Cloudflare CDN/WAF (global, PoPs Johannesburg/Cape Town)
    -> Railway (Singapour) : NestJS API + BullMQ Workers + Redis
    -> Supabase (Singapour) : PostgreSQL + Auth + Storage + Realtime
  -> Peach Payments (Afrique du Sud) : gateway de paiement
  -> Resend (USA) : emails transactionnels
  -> FCM (USA) : push notifications
  -> Sentry (USA) : error tracking
  -> Grafana Cloud (USA/Europe) : observabilite
```

Cf. ADR-020 pour le detail de l'infrastructure.

### Contraintes

- **Equipe startup** (2-5 devs) : pas de SRE dedie. Les procedures doivent etre simples et executables par n'importe quel developpeur de l'equipe.
- **Budget** : le cout du DR doit rester proportionnel au budget infrastructure total (~40-130 USD/mois selon la phase, cf. ADR-020).
- **SLA cible** : 99.5% de disponibilite (soit ~3.6h de downtime autorise par mois). Pas de SLA enterprise.
- **Donnees perissables** : un panier anti-gaspi a une duree de vie de quelques heures. Une panne de 4h peut rendre obsolete l'integralite du stock du jour.

---

## 1. Classification des risques

### 1.1 Matrice des scenarios de panne

| # | Scenario | Impact | Probabilite | RTO (Recovery Time Objective) | RPO (Recovery Point Objective) |
|---|----------|--------|:-----------:|:-----------------------------:|:------------------------------:|
| S1 | **Supabase down** (PostgreSQL + Auth + Storage) | **Critique** : aucune lecture/ecriture DB, aucune authentification, aucun upload. L'API NestJS retourne des erreurs 500 sur tous les endpoints. | Faible (Supabase SLA 99.9% sur plan Pro) | **< 1h** (dependant de Supabase) | **0** (PITR Supabase si plan Team, sinon daily backup = RPO 24h) |
| S2 | **Railway down** (API NestJS + Workers + Redis) | **Critique** : aucune logique metier, aucun traitement de paiement, aucune notification. Les apps mobiles affichent des erreurs. | Faible | **< 2h** (redeploiement sur provider alternatif) | **0** (stateless, code sur GitHub) |
| S3 | **Cloudflare down** | **Eleve** : les requetes ne sont plus routees vers Railway. Les assets statiques (admin, site vitrine) sont indisponibles. DDoS protection perdue. | Tres faible (Cloudflare SLA 100% sur Enterprise, >99.9% historique sur Free) | **< 30 min** (bypass vers IP directe Railway) | **0** (proxy, pas de donnees) |
| S4 | **Redis crash** (perte memoire) | **Moyen** : cache perdu (reconstructible), jobs BullMQ en cours perdus. Pas de perte de donnees persistantes. Les captures de paiement programmees en queue sont les plus critiques. | Moyenne (Redis en memoire, crash possible) | **< 15 min** (restart automatique Railway) | **Jobs en queue perdus**. Les jobs sont re-enqueuables car idempotents (cf. ADR-005). |
| S5 | **Peach Payments indisponible** | **Moyen** : impossible de creer de nouvelles reservations (le paiement echoue). Les reservations existantes ne sont pas affectees. Les captures programmees echouent et sont retentees. | Faible | **Dependant de Peach** (hors de notre controle) | **0** (les intents de paiement sont persistes en DB avant l'appel Peach) |
| S6 | **Cyclone tropical a Maurice** | **Eleve sur l'usage, faible sur l'infra** : les serveurs sont a Singapour, non affectes. Mais les utilisateurs n'ont potentiellement plus d'electricite ni d'Internet. Les commercants sont fermes (alerte cyclone classe 3/4 = fermeture obligatoire). | Moyenne (saison nov-avril, 2-5 par an dont 1-2 intenses) | **N/A** (l'infra tourne, les utilisateurs ne peuvent pas l'atteindre) | **0** |
| S7 | **Panne electrique generalisee a Maurice** | **Eleve sur l'usage, faible sur l'infra** : meme impact que S6. Le CEB (Central Electricity Board) retablit generalement le courant en 2-12h. | Faible (hors cyclone) | **N/A** (meme raisonnement que S6) | **0** |
| S8 | **Coupure cable sous-marin** (SAFE, LION ou T3) | **Moyen** : latence degradee, potentiellement perte totale de connectivite si les 3 cables sont coupes (tres improbable). Le cable T3 (2023) et SAFE offrent de la redondance. | Tres faible (coupure totale) / Faible (degradation) | **Dependant des operateurs telecoms** (reparation 1-4 semaines) | **0** |
| S9 | **Corruption de la base de donnees** (bug applicatif, migration ratee) | **Critique** : donnees corrompues, potentielle perte d'integrite du ledger financier. | Faible | **< 4h** (restauration depuis backup) | **Dernier backup** (daily = 24h sur plan Pro, PITR = quelques minutes sur plan Team) |
| S10 | **Compromission de securite** (fuite de donnees, injection SQL) | **Critique** : impact reputationnel, obligation de notification au Data Protection Commissioner sous 72h (ADR-021), potentielle perte de donnees. | Faible (Supabase RLS + Cloudflare WAF + OWASP practices, cf. ADR-022) | **< 4h** (isolation, remediation) | **Variable** |

### 1.2 Synthese par criticite

| Criticite | Scenarios | Strategie globale |
|-----------|-----------|-------------------|
| **Critique** | S1, S2, S9, S10 | Backup robuste + procedures de restauration testees + alerting immediat |
| **Eleve** | S3, S6, S7 | Bypass / mode degrade + gestion automatique des paniers perimes |
| **Moyen** | S4, S5, S8 | Retry automatique + idempotence + mode degrade gracieux |

---

## 2. Strategie de backup

### 2.1 PostgreSQL (Supabase)

| Parametre | Plan Pro (25 USD/mois) | Plan Team (599 USD/mois) | Recommandation |
|-----------|----------------------|-------------------------|----------------|
| Backups automatiques | Daily | Daily | - |
| Retention | 7 jours | 14 jours | - |
| PITR (Point-in-Time Recovery) | **Non inclus** | **Inclus** | Phase 1 : Pro. Phase 2 (quand le volume financier depasse Rs 500K/mois) : Team. |
| RPO | 24h (dernier daily) | **Quelques minutes** | - |

**Decision** : Plan Pro au lancement (RPO 24h acceptable pour une startup avec peu de transactions). Migration vers le plan Team quand le volume financier le justifie.

**Backup supplementaire** : un job CRON hebdomadaire exporte un dump SQL complet vers un bucket Cloudflare R2 (ou S3) separe de Supabase. Cela fournit un filet de securite independant du provider.

```bash
# Job CRON hebdomadaire (GitHub Actions schedule ou Railway CRON)
# Dimanche 02h00 MUT (samedi 22h00 UTC)

#!/bin/bash
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DUMP_FILE="bienbon_backup_${TIMESTAMP}.sql.gz"

# Export via pg_dump (connection string Supabase)
pg_dump "$SUPABASE_DB_URL" \
  --no-owner \
  --no-acl \
  --format=plain \
  | gzip > "/tmp/${DUMP_FILE}"

# Upload vers Cloudflare R2 (via AWS CLI compatible S3)
aws s3 cp "/tmp/${DUMP_FILE}" \
  "s3://bienbon-backups/db/${DUMP_FILE}" \
  --endpoint-url "$R2_ENDPOINT"

# Nettoyage local
rm "/tmp/${DUMP_FILE}"

# Retention : garder les 12 derniers backups (3 mois)
# Suppression des plus anciens via lifecycle policy R2
```

**Cout** : Cloudflare R2 free tier = 10 GB stockage + 10M requetes classe A + 1M requetes classe B. Un dump SQL de BienBon au lancement fera < 100 MB. Cout : **0 USD**.

### 2.2 Redis (Railway)

| Donnee Redis | Persistance | Impact en cas de perte | Mitigation |
|-------------|-------------|----------------------|------------|
| Cache applicatif (reponses API, sessions) | Aucune | Faible : reconstruit automatiquement a la prochaine requete | Aucune action necessaire |
| Jobs BullMQ en queue (pending) | AOF configurable sur Railway Redis | Moyen : les jobs non traites sont perdus | Les jobs critiques sont re-enqueuables (voir ci-dessous) |
| Jobs BullMQ en cours (active) | N/A (en memoire du worker) | Moyen : le job en cours est perdu | Idempotence + retry automatique |
| Compteurs de rate limiting | Aucune | Faible : reset des compteurs, pas de consequence fonctionnelle | Aucune action necessaire |

**Strategie pour les jobs BullMQ critiques** :

Les jobs dont la perte a un impact financier sont :

1. **`capture-payment`** : capture de la pre-autorisation au debut du creneau de retrait
2. **`process-refund`** : execution d'un remboursement
3. **`generate-payout`** : generation des releves de reversement mensuels
4. **`send-payout`** : execution des virements

**Mitigation** : chaque job critique est **persiste en base de donnees** avant d'etre enqueue dans BullMQ. La table `scheduled_jobs` sert de source de verite :

```sql
CREATE TABLE scheduled_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,           -- 'capture_payment', 'process_refund', etc.
  payload JSONB NOT NULL,       -- donnees du job
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, queued, processing, completed, failed
  scheduled_at TIMESTAMPTZ NOT NULL,
  queued_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scheduled_jobs_pending ON scheduled_jobs (status, scheduled_at)
  WHERE status IN ('pending', 'queued');
```

**Job de reconciliation** (CRON toutes les 5 minutes) :

```typescript
// ReconcileScheduledJobsService
// Detecte les jobs qui sont en statut 'queued' ou 'processing' depuis trop longtemps
// et les re-enqueue dans BullMQ

async reconcile() {
  const staleJobs = await prisma.scheduledJob.findMany({
    where: {
      status: { in: ['queued', 'processing'] },
      updatedAt: { lt: sub(new Date(), { minutes: 10 }) },
      attempts: { lt: prisma.scheduledJob.fields.maxAttempts },
    },
  });

  for (const job of staleJobs) {
    await prisma.scheduledJob.update({
      where: { id: job.id },
      data: { status: 'pending', attempts: { increment: 1 } },
    });
    // Le job sera re-enqueue par le scheduler normal
  }
}
```

**Configuration Redis Railway** :

- Activer la persistance AOF (`appendonly yes`) pour minimiser la perte de donnees en cas de crash
- Politique AOF : `appendfsync everysec` (compromis performance/durabilite)
- Cela ne garantit pas zero perte, d'ou la source de verite en PostgreSQL pour les jobs critiques

### 2.3 Media et uploads (Supabase Storage)

| Type de media | Volume estime | Backup | Justification |
|--------------|--------------|--------|---------------|
| Photos de profil | < 1 GB | Supabase Storage (S3 sous-jacent, 11 neufs de durabilite) | Pas de backup supplementaire necessaire |
| Photos de paniers | < 5 GB | Idem | Idem |
| Photos de reclamation | < 500 MB | Idem | Retention limitee (90j post-resolution, cf. ADR-021) |
| Documents partenaires (BRN, licences) | < 200 MB | Idem + copie R2 | Documents reglementaires, backup additionnel par precaution |

**Decision** : pas de backup supplementaire pour les medias au lancement. Supabase Storage utilise S3 sous le capot (durabilite 99.999999999%). Si Supabase disparait, les fichiers sont recuperables via l'API S3 standard. En Phase 2, mettre en place une replication vers Cloudflare R2 pour les documents partenaires.

### 2.4 Code source

| Element | Strategie | Notes |
|---------|-----------|-------|
| Code applicatif (NestJS, Flutter, React) | **GitHub** : source de verite unique | Branches protegees, PR obligatoires. Historique Git complet. |
| Schema Prisma | Versionne dans le repo Git | Les migrations sont dans `prisma/migrations/`. Restauration du schema = `npx prisma migrate deploy`. |
| Configuration infrastructure | Railway.json + Dockerfiles dans Git | Permet le redeploiement depuis zero. |
| Storybook / design system | Versionne dans le repo Git | - |

### 2.5 Secrets et variables d'environnement

| Methode | Contenu | Backup |
|---------|---------|--------|
| Railway env vars | Secrets de production (DB URL, API keys, JWT secret, Peach credentials) | Railway conserve un historique des modifications. **Backup manuel** : exporter la liste des variables dans un fichier chiffre (GPG ou age) stocke dans un vault local (Bitwarden, 1Password). |
| GitHub Actions Secrets | Tokens CI/CD | Idem : documentation dans le vault. |
| `.env.example` | Template (pas de secrets) | Versionne dans Git. |

**Procedure de backup des secrets** :

1. Chaque modification de variable d'environnement en production est documentee dans le vault de l'equipe (Bitwarden ou 1Password)
2. Un export complet est effectue mensuellement et stocke chiffre
3. Le document est accessible a au moins 2 membres de l'equipe (mitigation du bus factor)
4. Les secrets Peach Payments (merchant credentials) sont aussi documentes dans le contrat Peach (backup papier)

**Rotation des secrets** : trimestrielle pour le JWT secret, a chaque depart d'un membre de l'equipe pour tous les secrets auxquels il avait acces.

---

## 3. Plan de basculement (failover)

### 3.1 Failover Supabase (S1)

Supabase ne propose pas de failover multi-region natif sur le plan Pro. Le plan Team ne le propose pas non plus -- seul le plan Enterprise offre des replicas read-only.

**Strategie Phase 1 (lancement)** :

- **Accepter le risque** : Supabase Pro a un SLA de 99.9% (8.7h de downtime/an). C'est acceptable pour une startup.
- **Monitoring** : UptimeRobot ping l'endpoint Supabase toutes les 5 minutes. Alerte Slack/email en cas de downtime.
- **Mode degrade** : si Supabase est down, l'API NestJS retourne des reponses 503 avec un message explicite ("Service temporairement indisponible, veuillez reessayer dans quelques minutes"). Les apps mobiles affichent un ecran de maintenance.
- **Backup dump** : le dump hebdomadaire sur R2 permet une restauration manuelle sur un PostgreSQL alternatif (Neon, Railway Postgres, VPS) en dernier recours.

**Strategie Phase 2 (croissance, budget > 100 USD/mois)** :

- **Migration vers Supabase Team** (599 USD/mois) quand le volume financier le justifie. Le PITR reduit le RPO a quelques minutes.
- **Read replica** : si la charge le justifie, ajouter un read replica Supabase pour les requetes de lecture (liste des paniers, recherche). Le write reste sur le primaire.

**Strategie Phase 3 (maturite, si Supabase devient un SPOF inacceptable)** :

- **Migration vers PostgreSQL auto-gere** avec replication streaming vers un standby. Les Dockerfiles et le schema Prisma rendent cette migration faisable.
- Ou migration vers un provider avec HA native (AWS RDS Multi-AZ, Google Cloud SQL HA).

**Procedure de restauration d'urgence (dernier recours, Supabase irrecuperable)** :

```
1. Provisionner un PostgreSQL sur Railway ou Neon (meme region Singapour)
2. Restaurer le dernier dump R2 : gunzip + psql
3. Activer PostGIS et les extensions necessaires
4. Mettre a jour la DATABASE_URL dans Railway env vars
5. Redeployer l'API NestJS
6. Migrer le schema avec `npx prisma migrate deploy`
7. Configurer un provider Auth alternatif (ou Supabase Auth sur un nouveau projet)
8. Mettre a jour les URLs dans les apps mobiles (config Firebase Remote Config)
```

**Temps estime** : 2-4h pour un developpeur experimente. **Perte de donnees** : depuis le dernier dump hebdomadaire (jusqu'a 7 jours).

### 3.2 Failover Railway (S2)

Railway est stateless (le code est dans GitHub, les donnees sont dans Supabase). Le risque est une indisponibilite du compute, pas une perte de donnees.

**Strategie** :

1. **Monitoring** : UptimeRobot ping l'API NestJS toutes les 5 minutes. Healthcheck Railway configure (restart automatique si le process crash).
2. **Railway auto-restart** : Railway redemarre automatiquement les services en cas de crash. Si le redemarrage echoue apres 3 tentatives, alerte.
3. **Si Railway est down > 30 min** : redeployer sur un provider alternatif.

**Procedure de basculement vers un provider alternatif** :

| Etape | Action | Temps estime |
|-------|--------|:------------:|
| 1 | Choisir le provider de fallback : **Render** (region Singapour, deploy depuis GitHub) ou **Fly.io** | 5 min |
| 2 | Creer le projet sur le provider, configurer les variables d'environnement (depuis le backup vault) | 15 min |
| 3 | Deployer depuis le repo GitHub (Dockerfile existant) | 10 min |
| 4 | Provisionner un Redis sur le meme provider | 5 min |
| 5 | Mettre a jour le DNS Cloudflare pour pointer vers la nouvelle IP/URL | 5 min (propagation < 5 min car TTL court) |
| 6 | Verifier le fonctionnement (smoke tests manuels) | 10 min |
| **Total** | | **~50 min** |

**Pre-requis** : les Dockerfiles sont a jour et testes regulierement en CI. Le `docker-compose.yml` de production est versionne dans Git.

### 3.3 Failover Cloudflare (S3)

Cloudflare a un track record de fiabilite exceptionnel (> 99.99% historique). Une panne globale est extremement improbable. Les pannes sont generalement partielles (certains PoPs affectes).

**Strategie** :

1. **Si panne partielle** (certains PoPs) : les utilisateurs sont routes vers le PoP le plus proche fonctionnel. Impact marginal.
2. **Si panne globale** (tres improbable, derniere panne totale Cloudflare = quelques minutes) :
   - **Assets statiques** (admin, site vitrine) : indisponibles. Pas de fallback immediat.
   - **API** : configurer un DNS fallback. Le domaine API a un enregistrement DNS avec un TTL court (5 min). En cas de panne Cloudflare, basculer le DNS vers le registrar et pointer directement vers l'URL Railway (sans proxy Cloudflare).

**Note** : pointer directement vers Railway expose l'IP du serveur et desactive la protection DDoS. C'est un mode degrade temporaire acceptable.

### 3.4 Mode degrade de l'application (S1, S2, S6, S7)

Quand le backend est indisponible, les apps mobiles ne deviennent pas des briques noires. ADR-012 (offline-first) definit trois tiers de donnees :

| Fonctionnalite | Disponible offline ? | Mecanisme | Reference |
|---------------|:--------------------:|-----------|-----------|
| Afficher le QR code / PIN de retrait | **Oui** | Donnees cached localement dans Drift (SQLite) | ADR-012, Tier 1 |
| Presenter la reservation en magasin | **Oui** | Donnees cached localement | ADR-012, Tier 1 |
| Parcourir les commerces (derniere version connue) | **Partiellement** | Cache stale-while-revalidate (24h) | ADR-012, Tier 2 |
| Voir son historique de reservations | **Partiellement** | Cache local (1h) | ADR-012, Tier 2 |
| Creer une nouvelle reservation | **Non** | Necessite le backend (stock temps reel + paiement) | ADR-012, Tier 3 |
| Payer | **Non** | Necessite Peach Payments | ADR-012, Tier 3 |
| Valider un retrait (partenaire) | **Partiellement** | Queue offline locale, synchronisation au retour reseau | ADR-012, section 6 |

**Ecran de mode degrade** : quand le backend est detecte comme indisponible (3 requetes echouees consecutives), l'app affiche un bandeau : "Connexion au serveur impossible. Certaines fonctionnalites sont limitees. Vos reservations en cours restent accessibles."

### 3.5 Fallback paiements (S5 : Peach Payments down)

Peach Payments est le SPOF des paiements (cf. ADR-005 : gateway unique). Si Peach est down :

**Impact immediat** :
- Impossible de creer de nouvelles pre-autorisations (PA) ou debits (DB)
- Impossible de capturer les PA en cours (les captures sont retentees par BullMQ)
- Impossible de rembourser

**Strategie** :

| Situation | Action |
|-----------|--------|
| **Peach down pendant < 1h** | Les captures et remboursements sont retentes automatiquement par BullMQ (backoff exponentiel : 1 min, 5 min, 15 min, 30 min, 1h). Les nouvelles reservations echouent avec un message "Paiement temporairement indisponible, veuillez reessayer dans quelques minutes." |
| **Peach down pendant 1-4h** | Idem + notification push aux consommateurs ayant des reservations dont la capture est bloquee : "Votre reservation est confirmee, le paiement sera finalise des le retour du service." Les paniers restent reserves (le creneau de retrait est respecte). |
| **Peach down pendant > 4h** | Alerte equipe. Decision manuelle : prolonger les creneaux de retrait ? Annuler les reservations non capturees ? Contacter Peach Payments support. |
| **Peach down pendant > 24h** | Activer le mode "retrait sans paiement" : les partenaires distribuent les paniers, les paiements sont reconcilies manuellement apres le retour de Peach. C'est un scenario extreme qui necessite une decision de la direction. |

**Pourquoi pas de gateway de paiement secondaire ?**

ADR-005 a evalue les alternatives (MIPS, MCB Pay+, integration directe). Ajouter une deuxieme gateway impliquerait :
- Double integration et maintenance
- Double certification PCI
- Reconciliation multi-gateway pour le ledger
- Cout de developpement disproportionne pour une startup

**Decision** : pas de gateway secondaire au lancement. Le risque de panne prolongee Peach est faible (SLA contractuel). A reevaluer si Peach a plus de 2 incidents majeurs par an.

---

## 4. Procedures de reprise

### 4.1 Matrice de responsabilites (RACI simplifie)

Dans une equipe de 2-5 devs sans SRE dedie, chaque developpeur doit pouvoir executer les procedures de reprise. Le modele est :

| Role | Qui | Responsabilites DR |
|------|-----|-------------------|
| **On-call** | Un dev (rotation hebdomadaire) | Recevoir les alertes (UptimeRobot, Sentry), diagnostiquer, executer les procedures. Escalader si necessaire. |
| **Lead tech** | Dev senior ou CTO | Decisions critiques (restauration DB, basculement provider, activation mode degrade prolonge). |
| **Toute l'equipe** | Tous les devs | Connaitre les procedures, avoir les acces necessaires (vault, Railway, Supabase, Cloudflare). |

### 4.2 Procedure : Supabase PostgreSQL down (S1)

```
ALERTE : UptimeRobot signale Supabase down
         OU Sentry rapporte des erreurs massives de connexion DB

1. DIAGNOSTIC (5 min)
   [ ] Verifier le status page Supabase : https://status.supabase.com/
   [ ] Verifier si c'est une panne globale ou specifiee a notre region (ap-southeast-1)
   [ ] Verifier les logs Railway (l'API a-t-elle des erreurs de connexion DB ?)

2. COMMUNICATION (5 min)
   [ ] Poster dans le canal Slack #incidents : "Supabase down detecte, diagnostic en cours"
   [ ] Si panne confirmee > 10 min : activer la page de maintenance sur l'API
       (feature flag ou variable d'env MAINTENANCE_MODE=true + redeploy)

3. ATTENTE (30 min)
   [ ] Si Supabase indique un incident en cours : attendre la resolution
   [ ] Surveiller le status page toutes les 10 min
   [ ] Si Supabase estime le retablissement > 2h : passer a l'etape 4

4. RESTAURATION SUR PROVIDER ALTERNATIF (si Supabase irrecuperable, decision Lead tech)
   [ ] Provisionner un PostgreSQL sur Neon ou Railway (region Singapour)
   [ ] Restaurer le dernier dump R2 (pg_dump hebdomadaire)
   [ ] Mettre a jour DATABASE_URL dans Railway env vars
   [ ] Executer les migrations Prisma : npx prisma migrate deploy
   [ ] Redeployer l'API NestJS
   [ ] Smoke tests : creer un compte, lister les paniers, creer une reservation test
   [ ] Desactiver le mode maintenance

5. POST-INCIDENT
   [ ] Post-mortem dans les 48h
   [ ] Evaluer la perte de donnees (delta entre le dump et l'incident)
   [ ] Reconcilier les transactions financieres (cf. section 5)
   [ ] Mettre a jour le runbook si necessaire
```

### 4.3 Procedure : Railway down (S2)

```
ALERTE : UptimeRobot signale l'API down
         OU Sentry ne recoit plus d'events (silence suspect)

1. DIAGNOSTIC (5 min)
   [ ] Verifier le dashboard Railway : https://railway.app/
   [ ] Verifier si le service est en "deploying", "crashed", ou "inactive"
   [ ] Verifier les logs Railway (OOM kill ? Erreur de build ? Quota depasse ?)

2. SI CRASH DU SERVICE (10 min)
   [ ] Tenter un redeploy depuis le dashboard Railway (bouton "Redeploy")
   [ ] Si le redeploy echoue : verifier le dernier commit (regression ?)
   [ ] Si regression : rollback au deploy precedent (Railway > Deployments > Previous > Rollback)

3. SI RAILWAY DOWN (plateforme entiere) (50 min)
   [ ] Confirmer sur https://status.railway.app/ ou Twitter @Railway
   [ ] Deployer sur Render comme fallback :
       a. Creer un projet Render (region Singapour)
       b. Connecter le repo GitHub
       c. Configurer les env vars depuis le vault
       d. Deployer
       e. Provisionner Redis sur Render
       f. Mettre a jour le DNS Cloudflare (CNAME vers l'URL Render)

4. POST-INCIDENT
   [ ] Verifier que les jobs BullMQ ont ete reconcilies (cf. table scheduled_jobs)
   [ ] Re-enqueuer les jobs perdus
   [ ] Post-mortem
```

### 4.4 Procedure : Redis crash (S4)

```
ALERTE : Sentry rapporte des erreurs Redis (connexion refusee)
         OU les jobs BullMQ ne s'executent plus (monitoring Grafana)

1. DIAGNOSTIC (2 min)
   [ ] Verifier le service Redis dans Railway
   [ ] Verifier la memoire utilisee (Redis INFO memory)

2. RESOLUTION (5 min)
   [ ] Si Redis est redemarrable : redemarrer depuis Railway dashboard
   [ ] Si Redis est corrompu : supprimer et recreer le service Redis Railway
   [ ] Mettre a jour REDIS_URL dans les env vars si l'URL change

3. RECONCILIATION DES JOBS (15 min)
   [ ] Executer le job de reconciliation manuellement :
       curl -X POST https://api.bienbon.mu/admin/reconcile-scheduled-jobs
   [ ] Verifier dans la table scheduled_jobs que tous les jobs pending sont re-enqueues
   [ ] Verifier que les captures de paiement en attente sont traitees

4. VERIFICATION
   [ ] Tester un job BullMQ de bout en bout (envoyer une notification test)
   [ ] Verifier le dashboard BullMQ (via Bull Board) : pas de jobs stale
```

### 4.5 Procedure : Peach Payments indisponible (S5)

```
ALERTE : Sentry rapporte des erreurs HTTP 5xx vers l'API Peach
         OU les captures de paiement echouent en boucle

1. DIAGNOSTIC (5 min)
   [ ] Verifier le status page Peach Payments
   [ ] Tester manuellement un appel API Peach depuis un outil (curl/Postman)
   [ ] Verifier si le probleme est specifique a un type de paiement (carte vs mobile money)

2. COMMUNICATION (10 min)
   [ ] Informer l'equipe sur Slack #incidents
   [ ] Si down > 30 min : envoyer une notification push aux consommateurs actifs :
       "Les paiements sont temporairement indisponibles. Vos reservations existantes
        ne sont pas affectees."

3. ATTENTE ET RETRY (automatique)
   [ ] BullMQ retente les jobs de capture/remboursement automatiquement
       (backoff exponentiel, max 6 tentatives sur 4h)
   [ ] Aucune action manuelle necessaire tant que la panne < 4h

4. SI PANNE > 4H (decision Lead tech)
   [ ] Contacter le support Peach Payments
   [ ] Evaluer : prolonger les creneaux de retrait des paniers affectes ?
   [ ] Evaluer : activer le mode "retrait manuel" (paniers distribues, reconciliation a posteriori) ?

5. POST-RETABLISSEMENT
   [ ] Verifier que toutes les captures en attente ont ete executees
   [ ] Reconcilier le ledger (cf. section 5)
   [ ] Verifier les soldes des comptes GATEWAY et CONSUMER_HOLDING
```

### 4.6 Procedure : Cyclone tropical (S6)

Cette procedure est unique car elle est **previsible** (les cyclones sont annonces 48-72h a l'avance par la station meteorologique de Maurice/Vacoas) et l'infrastructure est intacte (serveurs a Singapour).

```
ALERTE METEO : Cyclone tropical annonce, classe 1-2 prevu

1. PREPARATION (24-48h avant impact)
   [ ] Monitorer les bulletins de Mauritius Meteorological Services (metservice.intnet.mu)
   [ ] Preparer une notification push pour les consommateurs (draft)
   [ ] Preparer une notification push pour les partenaires (draft)

2. CLASSE 3 ANNONCEE (commerces doivent fermer dans les 2h)
   [ ] Declencher le workflow "cyclone" :
       a. Envoyer une notification push a tous les partenaires :
          "Alerte cyclone classe 3. Vos paniers du jour seront automatiquement
           annules. Vous ne serez pas penalise."
       b. Envoyer une notification push a tous les consommateurs avec reservation active :
          "En raison de l'alerte cyclone, vos reservations du jour sont annulees
           et remboursees automatiquement."
   [ ] Executer le job d'annulation en masse (cf. ci-dessous)
   [ ] Mettre a jour le bandeau de l'app : "BienBon est en pause en raison de l'alerte cyclone.
       Nous reprendrons des la levee de l'alerte. Restez en securite !"

3. JOB D'ANNULATION EN MASSE (automatise, declenche par l'admin)

   -- Annuler tous les paniers du jour avec reservations actives
   -- Pour chaque reservation non retiree :
   --   Si PA carte : reversal (RV) gratuit, pas d'ecriture ledger
   --   Si DB mobile money : remboursement, ecriture ledger compensatoire
   --   Si capture deja faite : remboursement total (Flux 5 ADR-007)

4. PENDANT LE CYCLONE
   [ ] L'infra tourne normalement (Singapour pas affecte)
   [ ] Les utilisateurs n'ont pas de reseau : l'app fonctionne en mode offline
       (Tier 1 ADR-012 : QR codes accessibles)
   [ ] Aucune action requise de l'equipe (sauf si un dev est a Maurice et n'a pas d'electricite)

5. APRES LE CYCLONE (levee de l'alerte)
   [ ] Envoyer une notification push : "L'alerte cyclone est levee. BienBon reprend !
       De nouveaux paniers seront disponibles bientot."
   [ ] Verifier que les remboursements ont ete traites
   [ ] Reconcilier le ledger (remboursements en masse)
   [ ] Les partenaires reactivent manuellement leurs paniers quand ils sont prets
```

**Gestion automatique des paniers perimes** :

Independamment des cyclones, un job CRON verifie toutes les 15 minutes si des paniers ont depasse leur creneau de retrait sans avoir ete retires. Ces paniers sont marques `expired` :

```typescript
// BasketExpirationService (CRON toutes les 15 min)
async expireBaskets() {
  const expired = await prisma.basket.updateMany({
    where: {
      status: 'published',
      pickupEndAt: { lt: new Date() },
    },
    data: { status: 'expired' },
  });

  // Les reservations non retirees de ces paniers sont traitees :
  // - Si non capturees : reversal/remboursement
  // - Si capturees : no-show (l'argent est conserve, cf. ADR-007 Flux 4)
}
```

### 4.7 Procedure : Corruption de base de donnees (S9)

```
ALERTE : Erreurs de donnees incoherentes detectees par les verifications d'integrite
         OU migration Prisma echouee en production

1. DIAGNOSTIC IMMEDIAT (10 min)
   [ ] Evaluer l'etendue de la corruption :
       - Quelles tables sont affectees ?
       - Le ledger est-il touche ?
       - Depuis quand la corruption est presente ?
   [ ] STOP : ne pas executer de migration corrective avant d'avoir un diagnostic complet

2. ISOLATION (5 min)
   [ ] Activer le mode maintenance (MAINTENANCE_MODE=true)
   [ ] Empecher toute ecriture supplementaire

3. RESTAURATION
   Option A : Rollback de migration (si la corruption vient d'une migration)
   [ ] Identifier la migration problematique dans prisma/migrations/
   [ ] Ecrire une migration de rollback
   [ ] Tester sur un dump local
   [ ] Appliquer en production

   Option B : PITR Supabase (si plan Team avec PITR)
   [ ] Identifier le timestamp juste avant la corruption
   [ ] Utiliser la console Supabase > Database > Point in Time Recovery
   [ ] Restaurer au timestamp choisi
   [ ] Redeployer l'API

   Option C : Restauration depuis dump (si plan Pro, pas de PITR)
   [ ] Telecharger le dernier daily backup Supabase ou le dump R2
   [ ] Restaurer sur une nouvelle instance Supabase (ou PostgreSQL alternatif)
   [ ] Reconcilier les donnees entre le dump et les transactions connues
       (webhooks Peach Payments, logs applicatifs)
   [ ] Basculer l'API vers la nouvelle instance

4. POST-RESTAURATION
   [ ] Verifier l'integrite du ledger (cf. section 5)
   [ ] Reconcilier les transactions financieres
   [ ] Post-mortem : pourquoi la corruption a eu lieu ?
   [ ] Ajouter des tests pour prevenir la recurrence
```

---

## 5. Integrite financiere post-reprise

### 5.1 Le probleme

Pendant une panne, des transactions peuvent etre dans un etat intermediaire :

| Etat intermediaire | Risque | Exemple |
|-------------------|--------|---------|
| PA emise, capture non faite | Le consommateur est bloque (argent bloque sur sa carte), le panier n'est pas confirme | Panne entre la PA Peach et l'ecriture ledger |
| Capture initiee chez Peach, ecriture ledger non faite | L'argent est debite du consommateur mais le ledger ne le reflete pas | Panne entre le callback Peach et l'ecriture DB |
| Remboursement initie chez Peach, ledger non ajuste | L'argent est rendu au consommateur mais le ledger montre toujours la commission et le net partenaire | Panne entre le refund Peach et l'ecriture DB |
| Payout initie en banque, transit non mis a jour | L'argent est parti mais `PAYOUT_TRANSIT` n'est pas credite | Panne pendant l'execution des virements |

### 5.2 Invariants du ledger (ADR-007)

Les invariants suivants DOIVENT etre vrais apres toute reprise :

```sql
-- Invariant 1 : Equilibre global du ledger (sum debits = sum credits)
SELECT
  SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) AS total_debits,
  SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) AS total_credits
FROM ledger_entries;
-- total_debits DOIT etre egal a total_credits

-- Invariant 2 : Chaque transaction financiere a un nombre pair d'ecritures
SELECT transaction_id, COUNT(*)
FROM ledger_entries
GROUP BY transaction_id
HAVING COUNT(*) % 2 != 0;
-- DOIT retourner 0 lignes

-- Invariant 3 : Pas de solde negatif sur les comptes PARTNER_PAYABLE
-- (sauf en cas de remboursement > ventes du mois, gere par le cycle de payout)
SELECT account_id, SUM(
  CASE WHEN type = 'credit' THEN amount ELSE -amount END
) AS balance
FROM ledger_entries
WHERE account_id LIKE 'PARTNER_PAYABLE:%'
GROUP BY account_id
HAVING SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END) < 0;
-- Si des resultats : alerte admin, investigation requise
```

### 5.3 Procedure de reconciliation post-panne

```
RECONCILIATION FINANCIERE
(a executer apres toute panne ayant affecte la DB ou le gateway de paiement)

1. VERIFIER LES INVARIANTS DU LEDGER (5 min)
   [ ] Executer les 3 requetes d'invariants ci-dessus
   [ ] Si un invariant est viole : STOP, ne pas corriger manuellement.
       Identifier la cause.

2. RECONCILIER AVEC PEACH PAYMENTS (30 min)
   [ ] Telecharger le rapport de transactions Peach Payments
       pour la periode de la panne (via le dashboard Peach ou l'API)
   [ ] Comparer chaque transaction Peach avec les ecritures du ledger :

   Pour chaque transaction Peach :
     a. Existe-t-il une ecriture ledger correspondante ?
        - OUI -> OK, passer a la suivante
        - NON -> La transaction a ete capturee par Peach mais pas enregistree
                 dans le ledger. Creer les ecritures manquantes.

   Pour chaque ecriture ledger de type 'capture' pendant la panne :
     a. Existe-t-il une transaction Peach correspondante ?
        - OUI -> OK
        - NON -> L'ecriture ledger est orpheline (la capture n'a pas eu lieu
                 chez Peach). Annuler l'ecriture ledger via une ecriture
                 compensatoire.

3. RECONCILIER LES RESERVATIONS (15 min)
   [ ] Lister les reservations en statut 'confirmed' dont le creneau de retrait
       est passe pendant la panne :
       - Si la capture est faite et le retrait non confirme : marquer no-show
       - Si la capture n'est pas faite : tenter la capture maintenant
         (si encore possible chez Peach, sinon annuler la reservation)

4. VERIFIER LES COMPTES DE TRANSIT
   [ ] Solde de CONSUMER_HOLDING : doit etre >= 0 et correspondre aux
       reservations mobile money non capturees
   [ ] Solde de PAYOUT_TRANSIT : doit etre 0 si aucun virement en cours,
       ou correspondre aux virements inities mais non confirmes
   [ ] Solde de REFUND_PENDING : doit etre 0 ou correspondre aux
       remboursements inities mais non confirmes par Peach

5. GENERER LE RAPPORT DE RECONCILIATION
   [ ] Documenter : nombre de transactions reconciliees, ecritures ajoutees,
       ecritures annulees, montant total des ajustements
   [ ] Archiver dans le dossier /incidents/{date}/reconciliation.md
```

### 5.4 Idempotence des operations financieres

Toutes les operations financieres critiques sont idempotentes (cf. ADR-005). Chaque operation utilise une **idempotency key** :

```typescript
// Exemple : capture de paiement
async capturePayment(reservationId: string) {
  const idempotencyKey = `capture_${reservationId}`;

  // Verifier si la capture a deja ete effectuee
  const existing = await prisma.ledgerEntry.findFirst({
    where: {
      referenceType: 'reservation',
      referenceId: reservationId,
      entryType: 'capture',
    },
  });

  if (existing) {
    // Deja capture, operation idempotente
    return { status: 'already_captured' };
  }

  // Appeler Peach Payments avec la meme idempotency key
  const result = await peach.capture(reservationId, { idempotencyKey });

  // Creer les ecritures ledger dans une transaction
  await prisma.$transaction([...]);
}
```

Cela garantit que rejouer les jobs apres une panne ne cree pas de doublons dans le ledger.

---

## 6. Tests de reprise (Game Days)

### 6.1 Frequence

| Test | Frequence | Duree estimee | Responsable |
|------|-----------|:-------------:|-------------|
| **Restauration depuis dump SQL** | Trimestrielle | 2h | Dev on-call |
| **Simulation Redis crash** | Trimestrielle | 1h | Dev on-call |
| **Basculement Railway -> Render** | Semestrielle | 3h | Lead tech + 1 dev |
| **Verification integrite ledger** | Mensuelle (automatisee) | 5 min | Job CRON |
| **Reconciliation Peach Payments** | Mensuelle (automatisee) | 10 min | Job CRON |
| **Simulation mode cyclone** | Annuelle (avant la saison cyclonique, octobre) | 2h | Toute l'equipe |
| **Restauration complete depuis zero** (full DR) | Annuelle | 4h | Lead tech + 1 dev |

### 6.2 Procedure de Game Day : Restauration DB

```
GAME DAY : Restauration PostgreSQL depuis dump
Objectif : verifier que le dump R2 est utilisable et que la procedure de restauration fonctionne

1. PREPARATION (15 min)
   [ ] Creer un projet PostgreSQL temporaire (Neon free tier ou Railway)
   [ ] Telecharger le dernier dump depuis Cloudflare R2

2. RESTAURATION (30 min)
   [ ] Restaurer le dump : gunzip < dump.sql.gz | psql $TEMP_DB_URL
   [ ] Verifier que toutes les tables sont presentes
   [ ] Verifier les comptages de lignes (comparer avec la production)
   [ ] Activer les extensions (PostGIS, pgcrypto)
   [ ] Executer les migrations Prisma non presentes dans le dump

3. VERIFICATION (30 min)
   [ ] Connecter une instance NestJS temporaire a cette DB
   [ ] Executer les smoke tests : auth, listing, creation reservation
   [ ] Verifier les invariants du ledger (section 5.2)
   [ ] Mesurer le temps total de restauration

4. NETTOYAGE (15 min)
   [ ] Supprimer le projet PostgreSQL temporaire
   [ ] Documenter les resultats dans /game-days/{date}/db-restore.md
   [ ] Si le temps de restauration > RTO : analyser et ameliorer
```

### 6.3 Procedure de Game Day : Simulation cyclone

```
GAME DAY : Mode cyclone (octobre, avant la saison)
Objectif : verifier que le workflow d'annulation en masse fonctionne

1. PREPARATION (30 min)
   [ ] Creer des donnees de test : 10 partenaires, 30 paniers, 50 reservations
       (utiliser l'environnement de staging, PAS la production)
   [ ] Les reservations incluent : PA carte, DB mobile money, deja capturees

2. EXECUTION (1h)
   [ ] Declencher le workflow "cyclone" en staging
   [ ] Verifier que toutes les reservations sont annulees
   [ ] Verifier que les reversals et remboursements sont inities
   [ ] Verifier les ecritures ledger compensatoires
   [ ] Verifier les notifications push/email envoyees (via Resend test mode)

3. RECONCILIATION (30 min)
   [ ] Executer la reconciliation financiere
   [ ] Verifier les invariants du ledger
   [ ] Documenter les resultats
```

### 6.4 Monitoring continu de l'integrite

Un job CRON automatise verifie quotidiennement les invariants financiers :

```typescript
// LedgerIntegrityCheckService (CRON quotidien, 06h00 MUT)
async checkIntegrity() {
  // Invariant 1 : equilibre global
  const balance = await prisma.$queryRaw`
    SELECT
      SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) AS total_debits,
      SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) AS total_credits
    FROM ledger_entries
  `;

  if (balance.total_debits !== balance.total_credits) {
    await this.alertService.critical(
      'LEDGER DESEQUILIBRE',
      `Debits: ${balance.total_debits}, Credits: ${balance.total_credits}`
    );
  }

  // Invariant 2 : transactions equilibrees
  const unbalanced = await prisma.$queryRaw`
    SELECT transaction_id, COUNT(*) as entry_count
    FROM ledger_entries
    GROUP BY transaction_id
    HAVING COUNT(*) % 2 != 0
  `;

  if (unbalanced.length > 0) {
    await this.alertService.critical(
      'TRANSACTIONS DESEQUILIBREES',
      `${unbalanced.length} transactions avec un nombre impair d'ecritures`
    );
  }

  // Invariant 3 : reconciliation avec les jobs scheduled
  const staleJobs = await prisma.scheduledJob.count({
    where: {
      status: { in: ['queued', 'processing'] },
      updatedAt: { lt: sub(new Date(), { hours: 4 }) },
    },
  });

  if (staleJobs > 0) {
    await this.alertService.warning(
      'JOBS STALE DETECTES',
      `${staleJobs} jobs en statut queued/processing depuis > 4h`
    );
  }
}
```

---

## 7. Contexte Maurice : cyclones et pannes

### 7.1 Saison cyclonique

La saison cyclonique a Maurice s'etend de **novembre a avril**. Le systeme d'alerte cyclonique mauricien comporte 4 classes :

| Classe | Signification | Impact BienBon |
|--------|--------------|----------------|
| **Classe 1** | Cyclone a ~36h de distance. Pas de restriction. | Aucun. Monitorer les bulletins meteo. |
| **Classe 2** | Cyclone a ~24h. Pas de restriction, preparation. | Preparer les notifications. Verifier les backups. |
| **Classe 3** | Cyclone a ~12h. **Fermeture des commerces obligatoire** sous 2h. | **Declencher le workflow cyclone** : annulation des paniers, remboursements, notification. |
| **Classe 4** | Cyclone imminent/frappe. Confinement total. | L'app est en mode pause. Aucune action possible (personne n'a de reseau). |

### 7.2 Gestion automatique des paniers pendant un cyclone

**Question** : les paniers invendus de la journee sont-ils automatiquement annules ?

**Reponse** : **Oui**, selon deux mecanismes :

1. **Workflow cyclone** (declenche manuellement par l'admin a l'annonce de la classe 3) : annulation immediate de tous les paniers du jour et remboursement des reservations.

2. **Expiration naturelle** (job CRON, independant des cyclones) : tout panier dont le creneau de retrait est passe est automatiquement marque `expired`. Les reservations non retirees sont traitees en no-show (l'argent est conserve). Pendant un cyclone, le workflow cyclone est prefere car il annule les paniers AVANT l'expiration du creneau et rembourse les consommateurs (au lieu du no-show qui les debite).

**Scenario type** :

```
Mardi 14h : Alerte cyclone classe 2 annoncee
             -> L'equipe BienBon prepare le workflow
             -> Les partenaires sont avertis de ne pas publier de nouveaux paniers

Mardi 16h : Alerte cyclone classe 3
             -> Admin declenche le workflow cyclone
             -> 45 reservations actives : 30 PA carte (reversal gratuit),
                15 DB mobile money (remboursement)
             -> Tous les paniers du jour passes en statut 'cancelled_cyclone'
             -> Notifications push a tous les consommateurs concernes
             -> Bandeau "Mode cyclone" dans l'app

Mercredi a jeudi : Cyclone sur Maurice
                   -> L'infra tourne normalement a Singapour
                   -> Personne ne peut utiliser l'app (pas d'electricite/reseau)

Vendredi 10h : Levee de l'alerte
               -> Admin leve le mode cyclone
               -> Notification push : "BienBon reprend !"
               -> Les partenaires publient de nouveaux paniers
               -> Reconciliation financiere (verifier les remboursements)
```

### 7.3 Pannes electriques

Le CEB (Central Electricity Board de Maurice) assure un taux de disponibilite elevee mais des coupures localisees surviennent :

| Type de coupure | Duree typique | Impact BienBon |
|----------------|:-------------:|----------------|
| Coupure planifiee (maintenance CEB) | 2-6h | Les commercants concernes n'ont pas d'acces a l'app. Les consommateurs sur batterie peuvent toujours consulter leurs reservations (mode offline ADR-012). |
| Coupure non planifiee (panne technique) | 30 min - 4h | Meme impact. |
| Coupure generalisee (apres cyclone) | 6-48h | L'app est inutilisable pour tous. L'infra n'est pas affectee. |

**Mitigation** : aucune action technique specifique. L'app fonctionne en mode offline pour les flux Tier 1 (QR code, reservations en cache). Les commercants disposant d'un groupe electrogene ou d'Internet mobile peuvent continuer a operer.

### 7.4 Panne Internet (cable sous-marin)

Maurice depend de 3 cables sous-marins (SAFE, LION, T3). Une coupure totale des 3 cables est extremement improbable. Une coupure partielle degrade la latence mais ne coupe pas Internet.

**Historique** : en 2024, le cable SAFE a subi une panne. Le trafic a ete reroute via LION et T3, avec une degradation de latence mais pas de coupure totale.

**Impact sur BienBon** : en cas de coupure d'un cable, la latence vers Singapour augmente mais le service reste accessible. Si les 3 cables sont coupes (catastrophe), le scenario est identique a S7 (panne generalisee) -- l'infra tourne mais les utilisateurs ne peuvent pas l'atteindre.

---

## 8. Estimation des couts DR

### 8.1 Couts par phase

#### Phase 1 : Lancement (< 100 utilisateurs)

| Element DR | Solution | Cout/mois |
|-----------|----------|:---------:|
| Backup DB supplementaire (dump hebdomadaire) | Cloudflare R2 free tier | **0 USD** |
| Monitoring uptime | UptimeRobot free tier (50 monitors) | **0 USD** |
| Error tracking | Sentry free tier | **0 USD** |
| Vault secrets | Bitwarden free (equipe < 2) ou Teams (4 USD/utilisateur) | **0-16 USD** |
| PITR Supabase | **Non** (Plan Pro = daily backup, RPO 24h) | 0 USD (inclus dans les 25 USD Supabase Pro) |
| Region secondaire / hot standby | **Non** (budget insuffisant) | 0 USD |
| Provider de fallback pre-configure | **Non** (procedure documentee, pas de standby permanent) | 0 USD |
| **TOTAL DR additionnel** | | **0-16 USD/mois** |

**Cout DR Phase 1 en % du budget infra total** : 0-40% (16/40 USD). Acceptable.

#### Phase 2 : Croissance (~1000 utilisateurs, volume financier > Rs 500K/mois)

| Element DR | Solution | Cout/mois |
|-----------|----------|:---------:|
| Backup DB supplementaire | Cloudflare R2 (toujours dans le free tier si < 10 GB) | **0 USD** |
| PITR Supabase | **Migration vers plan Team** (599 USD/mois) -- mais cette migration est justifiee par d'autres besoins (read replicas, support prioritaire, pas uniquement le DR) | **+574 USD** (delta Pro -> Team) |
| Ou : PITR via WAL-G vers R2 | Alternative : configurer WAL-G pour streamer les WAL vers R2, permettant un PITR sans le plan Team | **~5 USD/mois** (R2 storage) |
| Vault secrets | Bitwarden Teams (4 USD x 4 devs) | **16 USD** |
| **TOTAL DR additionnel (option A : Team)** | | **~590 USD/mois** |
| **TOTAL DR additionnel (option B : WAL-G)** | | **~21 USD/mois** |

**Recommandation Phase 2** : commencer par l'option B (WAL-G vers R2). Le plan Team Supabase a 599 USD/mois est un saut de prix brutal pour une startup. Le PITR "maison" via WAL-G offre le meme RPO (quelques minutes) pour une fraction du cout.

#### Phase 3 : Maturite (~10 000 utilisateurs)

| Element DR | Solution | Cout/mois |
|-----------|----------|:---------:|
| Supabase Team ou PostgreSQL manage HA | Plan Team ou AWS RDS Multi-AZ | **100-599 USD** |
| Redis avec persistance AOF + backup | Redis Cloud ou self-hosted avec backup | **5-20 USD** |
| Provider de fallback pre-configure | Render/Fly.io en standby tiede (deploye mais scaled to zero) | **5-10 USD** |
| Vault secrets | 1Password Business (8 USD x 5 devs) | **40 USD** |
| Game Days (temps equipe, 4x par an) | 4 x 4h x 2 devs x 40 USD/h | **~107 USD** (amortis/mois) |
| **TOTAL DR additionnel** | | **~260-780 USD/mois** |

### 8.2 Analyse cout vs risque

| Scenario | Perte estimee par incident | Probabilite annuelle | Perte annuelle attendue | Cout DR pour mitiger |
|----------|:--------------------------:|:--------------------:|:-----------------------:|:-------------------:|
| Perte DB complete (pas de backup) | Rs 2-10M (toutes les donnees) | 1% | Rs 20-100K | ~0 USD (dump R2 gratuit) |
| Perte 24h de transactions (RPO daily) | Rs 50-200K (transactions du jour) | 5% | Rs 2.5-10K | ~5 USD/mois (WAL-G) |
| Panne prolongee > 4h (pas de fallback) | Rs 10-50K (paniers perdus + reputation) | 10% | Rs 1-5K | ~0 USD (procedure documentee) |
| Ledger corrompu non detecte | Rs 100K-1M (erreurs de payout) | 2% | Rs 2-20K | ~0 USD (job CRON gratuit) |

**Conclusion** : la strategie DR a cout quasi nul (Phase 1) couvre 90% des risques. Les investissements supplementaires (PITR, region secondaire) ne sont justifies qu'a partir d'un volume financier significatif.

---

## Recapitulatif des decisions

| # | Decision | Phase | Cout additionnel |
|---|----------|:-----:|:----------------:|
| D1 | Dump SQL hebdomadaire vers Cloudflare R2 | Phase 1 | 0 USD |
| D2 | Persistance des jobs critiques en DB (table `scheduled_jobs`) + reconciliation CRON | Phase 1 | 0 USD |
| D3 | Idempotence de toutes les operations financieres (idempotency keys) | Phase 1 | 0 USD |
| D4 | Job CRON quotidien de verification de l'integrite du ledger | Phase 1 | 0 USD |
| D5 | Procedures de reprise documentees (runbooks) pour chaque scenario | Phase 1 | 0 USD |
| D6 | Workflow cyclone (annulation en masse, remboursements automatiques) | Phase 1 | 0 USD |
| D7 | AOF activee sur Redis Railway | Phase 1 | 0 USD |
| D8 | Backup des secrets dans un vault (Bitwarden) | Phase 1 | 0-16 USD/mois |
| D9 | Game Days trimestriels (restauration DB, Redis crash) | Phase 1 | Temps equipe |
| D10 | PITR via WAL-G vers R2 (quand volume financier > Rs 500K/mois) | Phase 2 | ~5 USD/mois |
| D11 | Provider de fallback pre-configure (Render ou Fly.io en standby) | Phase 3 | ~5-10 USD/mois |
| D12 | Migration vers PostgreSQL HA (Supabase Team ou RDS Multi-AZ) | Phase 3 | ~100-599 USD/mois |

---

## Consequences

### Positives

1. **Cout quasi nul en Phase 1** : la strategie DR repose sur des outils gratuits (R2 free tier, UptimeRobot, jobs CRON internes) et des bonnes pratiques d'architecture (idempotence, persistance des jobs critiques). Le surcout est de 0-16 USD/mois.

2. **Integrite financiere garantie** : le monitoring automatique du ledger (invariants verifies quotidiennement) et l'idempotence des operations financieres previennent les inconsistances silencieuses.

3. **Resilience cyclonique** : le workflow d'annulation en masse et de remboursement automatique protege les consommateurs et preserve la reputation de BienBon pendant les evenements meteo.

4. **Procedures executables par toute l'equipe** : les runbooks sont concus pour etre suivis par n'importe quel developpeur, pas seulement un SRE specialise.

5. **Scaling progressif** : le plan DR evolue avec le business. Pas d'investissement premature en infrastructure HA.

### Negatives

1. **RPO de 24h en Phase 1** : avec le plan Supabase Pro (daily backup), une panne avec corruption de la DB peut entrainer la perte de jusqu'a 24h de donnees. Le dump hebdomadaire R2 ne couvre que les 7 derniers jours. Mitigation : les transactions financieres sont reconciliables via les rapports Peach Payments.

2. **RTO de 2-4h pour les pannes majeures** : le basculement vers un provider alternatif est manuel et prend ~50 min minimum. Avec le diagnostic et la reconciliation, le RTO reel est de 2-4h. C'est acceptable pour le SLA cible de 99.5%.

3. **Pas de failover automatique** : tout basculement est manuel. Un dev doit etre disponible et reactif. Mitigation : rotation d'astreinte hebdomadaire, alertes sur mobile (UptimeRobot + Sentry).

4. **Dependance a Peach Payments sans fallback** : en cas de panne prolongee de Peach, aucune alternative de paiement n'est disponible. Le "mode retrait manuel" est un mode degrade extreme. Mitigation : SLA contractuel avec Peach, evaluation annuelle.

5. **Game Days = temps equipe** : 4-6 demi-journees par an consacrees aux tests de reprise. C'est un investissement non negligeable pour une equipe de 2-5 devs, mais c'est le prix de la confiance dans le plan DR.

---

## Risques residuels

| Risque | Probabilite | Impact | Acceptation |
|--------|:-----------:|:------:|-------------|
| Perte de 24h de donnees (avant PITR Phase 2) | Faible | Eleve | Accepte. Les transactions financieres sont reconciliables. Le dump hebdomadaire R2 couvre le pire cas. |
| Dev on-call injoignable pendant une panne | Faible | Moyen | Accepte. Mitigation : 2 personnes minimum ont les acces et connaissent les procedures. |
| Panne simultanee Supabase + Railway | Tres faible | Critique | Accepte. Probabilite negligeable (providers differents, regions differentes sur AWS). |
| Cyclone + panne infra simultanee | Quasi nulle | Critique | Accepte. L'infra est a Singapour, les cyclones sont a Maurice. |
| Peach Payments down > 24h | Tres faible | Eleve | Accepte. Escalation contractuelle. Mode retrait manuel en dernier recours. |

---

## References

### Supabase
- [Supabase Backup & Restore](https://supabase.com/docs/guides/platform/backups) -- Supabase Docs
- [Supabase Point-in-Time Recovery](https://supabase.com/docs/guides/platform/backups#point-in-time-recovery) -- Supabase Docs
- [Supabase Pricing](https://supabase.com/pricing) -- Supabase

### Railway
- [Railway Healthchecks](https://docs.railway.com/reference/healthchecks) -- Railway Docs
- [Railway Redis](https://docs.railway.com/guides/redis) -- Railway Docs

### Cloudflare
- [Cloudflare R2 Pricing](https://developers.cloudflare.com/r2/pricing/) -- Cloudflare Docs
- [Cloudflare Status](https://www.cloudflarestatus.com/) -- Cloudflare

### Cyclones a Maurice
- [Mauritius Meteorological Services](http://metservice.intnet.mu/) -- Station meteorologique de Vacoas
- [Cyclone Warning System Mauritius](https://en.wikipedia.org/wiki/Mauritius_Cyclone_Warning_System) -- Wikipedia

### Cables sous-marins
- [T3 Subsea Fiber Cable](https://subtelforum.com/t3-subsea-fiber-cable-lands-in-mauritius/) -- SubTel Forum
- [SAFE Cable System](https://www.submarinenetworks.com/en/systems/asia-europe-africa/safe) -- Submarine Networks

### BullMQ
- [BullMQ Best Practices](https://docs.bullmq.io/guide/going-to-production) -- BullMQ Docs
- [BullMQ Retries](https://docs.bullmq.io/guide/retrying-failing-jobs) -- BullMQ Docs

### Disaster Recovery (general)
- [AWS Well-Architected - Reliability Pillar](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/) -- AWS
- [Google SRE Book - Chapter 26: Data Integrity](https://sre.google/sre-book/data-integrity/) -- Google
