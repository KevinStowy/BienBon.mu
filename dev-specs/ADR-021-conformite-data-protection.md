# ADR-021 : Conformite donnees personnelles -- Data Protection Act 2017 et GDPR

## Statut : Proposition

**Date** : 2026-02-27
**Auteur** : Equipe architecture BienBon.mu
**Relecteurs** : A definir (conseil juridique recommande avant mise en production)
**Prerequis** : ADR-001 (stack backend), ADR-003 (schema BDD, soft delete, anonymisation), ADR-005 (paiement), ADR-007 (ledger commissions), ADR-010 (authentification), ADR-014 (notifications), ADR-016 (geolocalisation), ADR-020 (hebergement)

---

## Contexte

BienBon.mu est une marketplace de paniers anti-gaspi a l'ile Maurice. L'application collecte et traite des donnees personnelles de trois categories d'acteurs : consommateurs, partenaires commercants, et administrateurs. L'infrastructure technique implique des transferts de donnees vers plusieurs juridictions (Singapour, USA, Afrique du Sud).

### Pourquoi cette decision est necessaire maintenant

La conformite aux lois sur les donnees personnelles n'est pas un sujet qu'on peut traiter apres le lancement. Le Data Protection Act 2017 de Maurice (DPA 2017) exige l'enregistrement aupres du Data Protection Commissioner **avant** le debut du traitement des donnees. Les sanctions penales (jusqu'a MUR 200 000 d'amende et 5 ans d'emprisonnement) rendent la non-conformite un risque existentiel pour une startup. De plus, les choix d'architecture (schema de base de donnees, politique de retention, processus d'anonymisation) doivent etre integres des la conception.

### Cadre legal applicable

Deux legislations sont potentiellement applicables :

**1. Data Protection Act 2017 de Maurice (DPA 2017)**
- Entree en vigueur : 15 janvier 2018
- S'applique a toute entite traitant des donnees personnelles d'individus a Maurice
- S'applique de maniere extraterritoriale si l'entite utilise des equipements situes a Maurice pour le traitement
- **Obligatoire** pour BienBon : l'entreprise est enregistree a Maurice, les utilisateurs sont a Maurice

**2. Reglement General sur la Protection des Donnees (RGPD/GDPR)**
- S'applique si BienBon cible des personnes dans l'Union Europeenne ou surveille leur comportement
- **Applicabilite pour BienBon** : Maurice est une destination touristique. Des touristes europeens pourraient utiliser l'application. Cependant, BienBon ne cible pas activement le marche europeen (l'app est concue pour les residents mauriciens, les prix sont en MUR, le service est localise). Le GDPR ne s'applique donc **pas directement** au MVP.
- **Bonne nouvelle** : le DPA 2017 est largement inspire du GDPR. Une conformite DPA 2017 assure une conformite de facto a ~90% avec le GDPR. Les divergences principales concernent la portabilite des donnees (absente du DPA 2017) et le montant des amendes.

**Decision** : BienBon se conforme au DPA 2017 comme cadre principal, avec les bonnes pratiques GDPR en supplement (notamment l'export de donnees en tant que feature produit, meme si la portabilite n'est pas exigee par le DPA 2017). Cela positionne BienBon pour une eventuelle expansion ou pour la conformite GDPR si necessaire.

### Comparaison DPA 2017 vs GDPR

| Aspect | DPA 2017 Maurice | GDPR UE |
|--------|------------------|---------|
| Base legale | Loi No. 20 de 2017 | Reglement (UE) 2016/679 |
| Entree en vigueur | 15 janvier 2018 | 25 mai 2018 |
| Enregistrement obligatoire | Oui, aupres du Commissioner | Non (mais registre des traitements obligatoire) |
| DPO obligatoire | Oui, pour tous les controllers/processors | Oui, sous certaines conditions |
| Notification de breach | 72 heures au Commissioner | 72 heures a l'autorite de controle |
| Consentement | Libre, specifique, eclaire, univoque | Libre, specifique, eclaire, univoque |
| Droit a l'effacement | Oui | Oui |
| Droit a la portabilite | **Non** | Oui |
| Transferts internationaux | Adequation ou garanties appropriees | Adequation, clauses contractuelles types, etc. |
| Sanctions | Amende jusqu'a MUR 200 000 + 5 ans prison | Amende jusqu'a 20M EUR ou 4% CA mondial |
| Application extraterritoriale | Limitee (equipement a Maurice) | Large (ciblage ou suivi de residents UE) |
| Donnees sensibles | Inclut : origine, opinions, religion, sante, orientation, genetique, biometrie, infractions | Similaire |
| Pseudonymisation | Definie et encouragee | Definie et encouragee |

Sources :
- [Data Protection Act 2017 - texte integral](https://rm.coe.int/dpa-2017-maurice/168077c5b8)
- [Mondaq - DPA 2017 vs GDPR](https://www.mondaq.com/data-protection/705322/data-protection-data-protection-act-2017-vs-gdpr)
- [DLA Piper - Data Protection Mauritius](https://www.dlapiperdataprotection.com/?t=law&c=MU)
- [Appleby - Data Protection Guide Mauritius 2023](https://www.applebyglobal.com/publications/data-protection-guide-mauritius/)

---

## Questions a trancher

| # | Question |
|---|----------|
| Q1 | Obligations d'enregistrement et DPO |
| Q2 | Transferts internationaux de donnees |
| Q3 | Classification et traitement des donnees sensibles |
| Q4 | Base legale par traitement (consentement vs interet legitime) |
| Q5 | Politique de retention par type de donnees |
| Q6 | Processus d'anonymisation detaille |
| Q7 | Conciliation anonymisation / ledger immutable |
| Q8 | Export de donnees (format et contenu) |
| Q9 | Consentement cookies |
| Q10 | Notification de breach |
| Q11 | Checklist de conformite pre-lancement |

---

## Q1 : Obligations d'enregistrement et DPO

### Enregistrement aupres du Data Protection Office

Le DPA 2017 (Section 30) exige que **tout controller et tout processor** s'enregistre aupres du Data Protection Commissioner **avant** de commencer le traitement de donnees personnelles. L'enregistrement est valable 3 ans et doit etre renouvele 3 mois avant expiration.

Le formulaire d'enregistrement exige de declarer :
- Les types de donnees personnelles traitees
- Les finalites du traitement
- Les mesures de securite mises en place
- Les transferts de donnees hors de Maurice (pays de destination)

**Impact** : le non-enregistrement est une infraction penale (amende jusqu'a MUR 200 000 + 5 ans de prison).

Source : [Data Protection Office - Government of Mauritius](https://dataprotection.govmu.org/SitePages/Index.aspx)

### Data Protection Officer (DPO)

Le DPA 2017 (Section 29) impose la designation d'un DPO a **tout controller et tout processor**. Le DPO :
- Doit avoir une experience professionnelle et une connaissance de la protection des donnees
- Doit exercer ses fonctions de maniere independante (pas d'instructions sur l'exercice de ses fonctions)
- Est le point de contact pour le Data Protection Office et les personnes concernees
- Peut etre externe (consultant, cabinet juridique)
- Peut etre partage entre plusieurs entites d'un meme groupe

Source : [DLA Piper - DPO Mauritius](https://www.dlapiperdataprotection.com/index.html?t=data-protection-officers&c=MU)

### Decision Q1

**Enregistrement** : BienBon DOIT s'enregistrer aupres du Data Protection Commissioner comme controller avant le lancement. Le formulaire doit declarer les transferts vers Singapour (Supabase/Railway), USA (Resend, FCM, Sentry), Afrique du Sud (Peach Payments).

**DPO** : BienBon DOIT designer un DPO. Pour une startup en phase de lancement, la recommandation est de nommer un DPO externe (cabinet juridique mauricien specialise en data protection) pour maitriser les couts tout en assurant la conformite.

**Actions** :

| Action | Responsable | Timing |
|--------|-------------|--------|
| Identifier un cabinet juridique DPO externe | CEO/Fondateur | M-3 avant lancement |
| Preparer le dossier d'enregistrement aupres du DPO | DPO externe | M-2 avant lancement |
| Soumettre l'enregistrement au Data Protection Commissioner | DPO externe | M-1 avant lancement |
| Obtenir le certificat d'enregistrement | DPO externe | Avant lancement |

---

## Q2 : Transferts internationaux de donnees

### Inventaire des transferts

| Service | Donnees transferees | Destination | Finalite |
|---------|-------------------|-------------|----------|
| **Supabase** (BDD + Auth + Storage) | Toutes les donnees personnelles | Singapour (AWS ap-southeast-1) | Stockage principal, authentification |
| **Railway** (backend NestJS) | Toutes les donnees en transit | Singapour | Hebergement applicatif |
| **Cloudflare** (CDN/WAF) | Headers HTTP, IP, requetes | Global (edge nodes) | Performance, securite |
| **Peach Payments** (paiement) | Nom, email, tokens de paiement | Afrique du Sud | Traitement des paiements |
| **Resend** (emails) | Email, prenom, contenu des emails | USA | Envoi d'emails transactionnels et marketing |
| **FCM** (push) | Device token, payload notification | USA (Google) | Envoi de notifications push |
| **Sentry** (monitoring) | Stack traces, metadonnees utilisateur (ID, breadcrumbs) | USA | Monitoring des erreurs |
| **Grafana Cloud** (observabilite) | Metriques, logs applicatifs (potentiellement des IDs) | USA/Europe | Monitoring infrastructure |

### Cadre legal des transferts (DPA 2017, Section 36)

Le DPA 2017 autorise le transfert de donnees hors de Maurice si :
1. Le pays de destination assure un **niveau de protection adequat** ; OU
2. Le controller fournit au Commissioner la **preuve de garanties appropriees** ; OU
3. Le data subject a donne son **consentement explicite** apres avoir ete informe des risques ; OU
4. Le transfert est necessaire pour **l'execution d'un contrat** entre le data subject et le controller ; OU
5. Le transfert est justifie par un **interet legitime imperieux** du controller (non repetitif, nombre limite de data subjects, garanties appropriees).

Un **contrat ecrit** entre le controller et le processor est requis dans tous les cas (Section 36(1)).

Sources :
- [Dentons - Mauritius Data Transfer Provisions](https://www.dentons.com/en/insights/articles/2022/october/14/data-transfer-provisions-and-the-lack-of-data-portability-provisions)
- [Clym - DPA 2017 Mauritius](https://www.clym.io/regulations/data-protection-act-2017%E2%80%8B%E2%80%8B-mauritius)

### Decision Q2

**Strategie de conformite des transferts** :

| Service | Base legale du transfert | Action requise |
|---------|------------------------|----------------|
| **Supabase** | Execution du contrat (hebergement indispensable) + garanties appropriees (SOC 2 Type II, chiffrement at rest/in transit) | Signer le DPA (Data Processing Agreement) de Supabase. Declarer le transfert vers Singapour dans l'enregistrement aupres du Commissioner. |
| **Railway** | Execution du contrat + garanties appropriees | Signer le DPA Railway. Declarer le transfert vers Singapour. |
| **Cloudflare** | Interet legitime (securite) + garanties appropriees | Signer le DPA Cloudflare. |
| **Peach Payments** | Execution du contrat (paiement = coeur du service) | Signer le DPA Peach. Verifier la conformite PCI DSS. Declarer le transfert vers l'Afrique du Sud. |
| **Resend** | Execution du contrat (emails transactionnels) + consentement (emails marketing) | Signer le DPA Resend. Declarer le transfert vers USA. |
| **FCM** | Consentement (le user active les push) + execution du contrat (notifications transactionnelles) | Documenter que seuls les device tokens et payloads (sans donnees personnelles dans le payload) sont transferes. Declarer le transfert vers USA. |
| **Sentry** | Interet legitime (monitoring necessaire au maintien du service) | Configurer le scrubbing des donnees personnelles dans Sentry (anonymiser les IDs, emails, IPs). Signer le DPA Sentry. Declarer le transfert vers USA. |
| **Grafana** | Interet legitime (monitoring) | Configurer le filtrage des PII dans les logs. Signer le DPA Grafana. |

**Minimisation des donnees dans les transferts** :
- **Sentry** : activer `sendDefaultPii: false`, configurer `beforeSend` pour scrubber les emails, noms, telephones des breadcrumbs
- **FCM** : le payload de notification ne doit JAMAIS contenir de donnees personnelles. Envoyer uniquement un `notification_type` + `entity_id`. L'app mobile hydrate le contenu localement
- **Resend** : les emails transactionnels contiennent necessairement le prenom et l'email. C'est conforme (execution du contrat). Les emails marketing necessitent un consentement opt-in
- **Logs applicatifs** : ne jamais logger de donnees personnelles (emails, telephones, noms). Utiliser uniquement les UUIDs

**Registre des sous-traitants** (a inclure dans la politique de confidentialite) :

```
| Sous-traitant   | Pays           | Finalite                    | DPA signe |
|-----------------|----------------|-----------------------------|-----------|
| Supabase Inc.   | Singapour      | Base de donnees, auth, files | [ ]       |
| Railway Corp.   | Singapour      | Hebergement backend          | [ ]       |
| Cloudflare Inc. | Global         | CDN, WAF, DNS                | [ ]       |
| Peach Payments  | Afrique du Sud | Paiements                    | [ ]       |
| Resend Inc.     | USA            | Emails                       | [ ]       |
| Google (FCM)    | USA            | Notifications push           | [ ]       |
| Sentry Inc.     | USA            | Monitoring erreurs           | [ ]       |
| Grafana Labs    | USA/Europe     | Observabilite                | [ ]       |
```

---

## Q3 : Classification et traitement des donnees sensibles

### Definition des donnees sensibles (DPA 2017, Section 2)

Le DPA 2017 definit les "special categories of data" (donnees sensibles) comme les donnees relatives a :
- Origine raciale ou ethnique
- Opinions politiques
- **Croyances religieuses ou philosophiques**
- Appartenance syndicale
- **Sante physique ou mentale**
- Orientation, pratiques ou preferences sexuelles
- Donnees genetiques ou biometriques
- Commission ou allegation d'infraction

Le traitement de ces donnees est **interdit** sauf exceptions : consentement explicite, interet public, necessite medicale, obligation legale.

Source : [DLA Piper - Mauritius Data Protection Laws](https://www.dlapiperdataprotection.com/guide.pdf?c=MU)

### Analyse des donnees BienBon

| Donnee | Sensible ? | Justification | Action |
|--------|-----------|---------------|--------|
| **Preference "Halal"** | **OUI** | Indicateur indirect de croyance religieuse (islam). Le DPA 2017 inclut explicitement les croyances religieuses dans les donnees sensibles. | Consentement explicite requis. Stockage chiffre. |
| **Preference "Vegetarien"** | Non (probablement) | Choix alimentaire, pas necessairement lie a une croyance. Cependant, par precaution, traiter comme donnee sensible. | Traiter comme sensible par precaution. |
| **Preference "Vegan"** | Non (probablement) | Meme raisonnement que vegetarien. | Traiter comme sensible par precaution. |
| **BRN (Business Registration Number)** | Non | Donnee d'entreprise, pas personnelle. Mais document confidentiel a proteger. | Acces restreint (admin uniquement). |
| **Food Dealer's License** | Non | Document reglementaire. Pas une donnee personnelle sensible. | Stockage securise, acces restreint. |
| **Photos de reclamation** | **Potentiellement** | Peuvent contenir des visages (donnee biometrique si traitement de reconnaissance faciale). BienBon n'effectue pas de reconnaissance faciale. | Pas de traitement biometrique. Acces restreint (parties impliquees + admin). Suppression apres resolution + delai. |
| **Tokens de paiement** | Non (DPA) | Donnees tokenisees par Peach Payments. BienBon ne stocke pas de donnees de carte brutes. | Conformite PCI DSS deleguee a Peach. Token stocke de maniere securisee. |
| **Geolocalisation** | Non (en pratique) | ADR-016 : la position exacte n'est JAMAIS envoyee au serveur. Seul le bounding box de la carte est transmis. | Pas de donnee de geolocalisation stockee cote serveur. |
| **Historique de reservations** | Non | Donnees transactionnelles, pas sensibles. | Retention standard. |
| **Avis et notes** | Non | Contenu genere par l'utilisateur, publie volontairement. | Anonymisation a la suppression du compte. |

### Decision Q3

**Les preferences alimentaires sont traitees comme des donnees sensibles** par precaution, meme si seul "Halal" est strictement qualifiable de donnee sensible au sens du DPA 2017. Ce choix simplifie l'implementation (un seul niveau de protection pour toutes les preferences) et protege BienBon juridiquement.

**Consequences techniques** :

1. **Consentement explicite** requis pour le stockage des preferences alimentaires. L'ecran US-C055 (preferences alimentaires) doit inclure un message : "Vos preferences alimentaires peuvent reveler des informations sur vos convictions. En les enregistrant, vous consentez explicitement a leur traitement par BienBon pour filtrer les paniers affiches. Vous pouvez les supprimer a tout moment."

2. **Stockage** : les preferences alimentaires sont stockees dans la table `profiles` en colonne `dietary_preferences` (tableau de tags). Pas de chiffrement supplementaire au-dela du chiffrement at-rest de Supabase (AES-256), car le consentement explicite est la base legale.

3. **Effacement** : a la suppression du compte, les preferences alimentaires sont supprimees (mises a `NULL`) des le debut du delai de grace de 30 jours (pas besoin d'attendre J+30 pour les donnees sensibles).

4. **Photos de reclamation** : acces restreint aux parties impliquees (consommateur, partenaire, admin). Suppression apres resolution de la reclamation + 90 jours (delai pour un eventuel recours).

---

## Q4 : Base legale par traitement

### Bases legales reconnues par le DPA 2017

Le DPA 2017 reconnait les bases legales suivantes (similaires au GDPR) :
1. **Consentement** du data subject
2. **Execution d'un contrat** avec le data subject
3. **Obligation legale** du controller
4. **Interet vital** du data subject ou d'une autre personne
5. **Mission d'interet public** ou exercice de l'autorite publique
6. **Interet legitime** du controller (qui ne prevaut pas sur les droits du data subject)

Source : [Appleby - Data Protection Guide Mauritius](https://www.applebyglobal.com/publications/data-protection-guide-mauritius/)

### Registre des traitements (simplifie)

| # | Traitement | Donnees | Base legale | Justification |
|---|-----------|---------|-------------|---------------|
| T01 | Inscription et creation de compte | Prenom, nom, email, telephone, mot de passe (hash) | **Execution du contrat** | Necessaire pour fournir le service. L'utilisateur ne peut pas utiliser BienBon sans compte. |
| T02 | Authentification et sessions | Email/telephone, tokens JWT, IP, user-agent | **Execution du contrat** | Necessaire pour securiser l'acces au service. |
| T03 | Profil utilisateur | Photo de profil, langue preferee | **Execution du contrat** | Fonctionnalites du service (personnalisation). |
| T04 | Preferences alimentaires | Tags (vegetarien, vegan, halal) | **Consentement explicite** | Donnees potentiellement sensibles (religion). Consentement requis et revocable. |
| T05 | Reservation de paniers | Historique de reservations, statuts | **Execution du contrat** | Coeur du service : reserver et retirer des paniers. |
| T06 | Paiements | Tokens de paiement (Peach), historique transactions | **Execution du contrat** | Necessaire pour le paiement des paniers. |
| T07 | Notifications transactionnelles | Device token FCM, email, prenom | **Execution du contrat** | Confirmation de reservation, rappel de retrait, etc. Indispensable au service. |
| T08 | Notifications marketing | Device token FCM, email, prenom, preferences | **Consentement** (opt-in) | Communications promotionnelles. Le consommateur doit explicitement accepter (US-C056). |
| T09 | Avis et notes | Texte, etoiles, prenom affiche | **Interet legitime** | Les avis publies alimentent la confiance de la marketplace. Le consommateur publie volontairement. |
| T10 | Reclamations | Texte, photos, echanges | **Execution du contrat** | Traitement du litige entre consommateur et partenaire. |
| T11 | Favoris et historique | IDs des partenaires favoris | **Execution du contrat** | Fonctionnalite du service. |
| T12 | Gamification (badges, impact) | Score, paniers sauves, CO2 evite | **Interet legitime** | Engagement et fidelisation. Donnees derivees, pas de nouvelles collectes. |
| T13 | Parrainage | Code parrain, lien de parrainage | **Consentement** (du parrain) + **execution du contrat** (du filleul a l'inscription) | Le parrain partage un code/lien, pas les donnees du filleul. Le filleul s'inscrit de son propre chef. |
| T14 | Audit trail | Actor ID, action, IP, user-agent, changes | **Interet legitime** + **obligation legale** | Securite, detection de fraude, conformite comptable. |
| T15 | Inscription partenaire | Nom responsable, email, telephone, BRN, Food License, IBAN | **Execution du contrat** | Necessaire pour l'onboarding et les reversements. |
| T16 | Monitoring et analytics | IPs (anonymisees), metriques, traces | **Interet legitime** | Maintien en condition operationnelle du service. |
| T17 | Cookies essentiels | Session, CSRF, preferences UI | **Execution du contrat** | Fonctionnement technique du site. Pas de consentement requis. |
| T18 | Cookies analytiques | Identifiants anonymises, pages vues | **Consentement** (opt-in) | Analyse d'utilisation pour ameliorer le service. |
| T19 | Cookies marketing | Identifiants tiers, pixels | **Consentement** (opt-in) | Publicite ciblee (si implementee). |
| T20 | Geolocalisation | Bounding box de la carte (pas de position exacte) | **Execution du contrat** | Affichage des paniers a proximite. Position exacte jamais envoyee au serveur (ADR-016). |

### Decision Q4 : Consentement vs interet legitime

**Regle generale** : utiliser l'**execution du contrat** comme base legale pour tout ce qui est necessaire au fonctionnement du service. Reserver le **consentement** pour :
- Les donnees sensibles (preferences alimentaires)
- Les communications marketing (push + email)
- Les cookies non essentiels (analytics, marketing)

**Notifications marketing** : **opt-in obligatoire**. Le DPA 2017 exige un consentement pour les communications commerciales. L'ecran US-C056 propose deja des toggles pour chaque type de notification. Les notifications marketing doivent etre **desactivees par defaut** (opt-in, pas opt-out).

**Parrainage** : le parrain ne partage **aucune donnee du filleul**. Il partage un code/lien generique. Le filleul s'inscrit de sa propre initiative et accepte les CGU. Pas de probleme de consentement tiers.

---

## Q5 : Politique de retention par type de donnees

### Obligations de retention legales a Maurice

| Source legale | Obligation | Duree |
|--------------|-----------|-------|
| **Companies Act 2001** (Section 194) | Conservation des ecritures comptables | **7 ans** apres la fin de l'exercice comptable |
| **Income Tax Act 1995** (Section 153) | Conservation des registres de paiements employes | **5 ans** |
| **MRA (Mauritius Revenue Authority)** | Conservation des factures fiscalisees | **5 ans** minimum |
| **DPA 2017** (principe de limitation du stockage) | Les donnees ne doivent pas etre conservees plus longtemps que necessaire a la finalite | Duree proportionnee a la finalite |

Sources :
- [PwC Mauritius - Tax Administration](https://taxsummaries.pwc.com/mauritius/corporate/tax-administration)
- [Lloyds Bank Trade - Accounting in Mauritius](https://www.lloydsbanktrade.com/en/market-potential/mauritius/accounting)

### Politique de retention BienBon

| Categorie de donnees | Duree de retention | Justification | Action a expiration |
|---------------------|-------------------|---------------|---------------------|
| **Profil consommateur** (nom, email, telephone, photo, preferences) | Duree du compte + 30 jours de grace | DPA 2017 : droit a l'effacement. Les 30 jours permettent la reactivation (spec US-C054). | Anonymisation irreversible (voir Q6) |
| **Preferences alimentaires** (donnees sensibles) | Duree du compte. Suppression **immediate** a la demande de suppression de compte. | Donnees sensibles : pas de retention au-dela du necessaire. | Hard delete (NULL) |
| **Historique de reservations** | **7 ans** apres la transaction | Obligation comptable (Companies Act 2001). Les reservations sont liees au ledger financier. | Anonymisation du `consumer_id` (voir Q7) |
| **Ledger entries** (ecritures comptables) | **7 ans** apres l'ecriture | Obligation comptable (Companies Act 2001). Ecritures immutables (ADR-007). | Pas de suppression. Anonymisation des references utilisateur (voir Q7). |
| **Avis publies** | Duree du compte + anonymisation | Les avis contribuent a la marketplace. L'anonymisation preserve la valeur sans violer le droit a l'effacement. | Anonymisation : "Utilisateur supprime" + conservation des etoiles et du texte |
| **Reclamations** | Duree de la reclamation + **1 an** (prescription legale) | Valeur legale en cas de litige. | Anonymisation du texte et suppression des photos |
| **Photos de reclamation** | Resolution de la reclamation + **90 jours** | Delai pour un eventuel recours. | Hard delete (Supabase Storage) |
| **Favoris** | Duree du compte | Aucune valeur au-dela du compte. | Hard delete |
| **Badges et score d'impact** | Duree du compte + anonymisation | Les statistiques anonymisees alimentent les metriques globales. | Anonymisation : dissocier du profil |
| **Code de parrainage** | Duree du compte | Le code est lie au profil. | Hard delete |
| **Audit logs** | **2 ans** | Decision ADR-003. Suffisant pour les besoins d'investigation. | Hard delete (purge par batch) |
| **Notifications** | **30 jours** | Decision ADR-003. Les notifications perdent leur valeur apres 30 jours. | Hard delete (purge par batch) |
| **Profil partenaire** (responsable, email, telephone) | Duree du partenariat + **7 ans** | Obligation comptable (les reversements/factures referencent le partenaire). | Anonymisation apres 7 ans post-resiliation |
| **Documents partenaire** (BRN, Food License) | Duree du partenariat + **1 an** | Necessaires pour la conformite reglementaire pendant le partenariat. Plus besoin apres. | Hard delete (Supabase Storage) |
| **IBAN partenaire** | Duree du partenariat + **7 ans** | Obligation comptable (tracer les reversements). | Anonymisation (masquer : `****1234`) |
| **Device tokens FCM** | Duree du compte (ou jusqu'a deconnexion de l'appareil) | Token invalide apres deconnexion. | Hard delete |
| **Cookies consent** | **12 mois** (spec US-T013) | Duree de validite du consentement. | Redemander le consentement |
| **Donnees admin** (nom, email, actions) | Duree de l'emploi + **2 ans** (alignement audit logs) | Tracer les actions admin pour l'audit. | Anonymisation de l'identite, conservation des actions |

### Implementation technique

**Jobs de purge** (BullMQ, ADR-003) :

```typescript
// Jobs planifies quotidiennement (CRON)
const retentionJobs = [
  {
    name: 'purge-notifications',
    cron: '0 3 * * *', // 3h du matin MUT
    action: "DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '30 days'",
  },
  {
    name: 'purge-audit-logs',
    cron: '0 3 * * 0', // Dimanche 3h du matin
    action: "DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '2 years'",
    batchSize: 10000, // Suppression par lots pour eviter le lock
  },
  {
    name: 'anonymize-deleted-profiles',
    cron: '0 4 * * *', // 4h du matin MUT
    action: 'Voir Q6 pour le processus detaille',
  },
  {
    name: 'purge-claim-photos',
    cron: '0 5 * * *', // 5h du matin MUT
    action: "DELETE photos WHERE claim.resolved_at < NOW() - INTERVAL '90 days'",
  },
  {
    name: 'purge-partner-documents',
    cron: '0 5 * * 0', // Dimanche 5h du matin
    action: "DELETE documents WHERE partner.deactivated_at < NOW() - INTERVAL '1 year'",
  },
];
```

---

## Q6 : Processus d'anonymisation detaille

### Flux de suppression de compte consommateur

```
Consommateur clique "Supprimer mon compte"
          │
          ▼
┌─────────────────────────────────────┐
│ Modal de confirmation               │
│ "Votre compte sera desactive        │
│  immediatement. Vous avez 30 jours  │
│  pour le reactiver. Apres ce delai, │
│  vos donnees seront anonymisees de  │
│  maniere irreversible."             │
│                                     │
│ [Annuler]  [Supprimer mon compte]   │
└─────────────────────────────────────┘
          │
          ▼ (confirmation)
┌─────────────────────────────────────┐
│ Saisie du mot de passe              │
│ (ou reauthentification OAuth)       │
│ pour confirmer l'identite           │
└─────────────────────────────────────┘
          │
          ▼ (authentification reussie)
┌─────────────────────────────────────┐
│ Actions IMMEDIATES (J+0) :          │
│ 1. profiles.deleted_at = NOW()      │
│ 2. profiles.dietary_preferences     │
│    = NULL (donnees sensibles)       │
│ 3. Supabase Auth : disable user     │
│    (invalidation de toutes les      │
│    sessions actives)                │
│ 4. Suppression des device tokens    │
│    FCM                              │
│ 5. Suppression des favoris          │
│ 6. Suppression des tokens de        │
│    paiement (Peach Payments API:    │
│    delete card token)               │
│ 7. Annulation des reservations      │
│    pending (si applicable)          │
│ 8. Email de confirmation :          │
│    "Votre compte a ete desactive.   │
│    Vous avez jusqu'au [date J+30]   │
│    pour le reactiver."              │
│ 9. Audit log : account.deletion     │
│    _requested                       │
└─────────────────────────────────────┘
          │
          ▼ (30 jours plus tard)
┌─────────────────────────────────────┐
│ Job BullMQ d'anonymisation (J+30) : │
│ Voir tableau d'anonymisation        │
│ ci-dessous                          │
└─────────────────────────────────────┘
```

### Tableau d'anonymisation champ par champ (profil consommateur)

| Table | Champ | Avant | Apres | Methode |
|-------|-------|-------|-------|---------|
| `profiles` | `first_name` | "Kevin" | "Utilisateur" | Valeur fixe |
| `profiles` | `last_name` | "Dorasamy" | "Supprime" | Valeur fixe |
| `profiles` | `email` | "kevin@example.mu" | `anon_{uuid_hash_8chars}@deleted.bienbon.mu` | Hash tronque, domaine fictif non routable |
| `profiles` | `phone` | "+23057123456" | `NULL` | Mise a NULL |
| `profiles` | `avatar_url` | "https://storage.../avatar.jpg" | `NULL` + suppression du fichier Supabase Storage | Mise a NULL + hard delete fichier |
| `profiles` | `dietary_preferences` | `["halal", "vegetarian"]` | `NULL` | Deja fait a J+0 |
| `profiles` | `referral_code` | "KEVIN42" | `NULL` | Mise a NULL |
| `profiles` | `notification_preferences` | `{...}` | `NULL` | Mise a NULL |
| `profiles` | `language` | "fr" | `NULL` | Mise a NULL |
| `profiles` | `anonymized_at` | `NULL` | `NOW()` | Marqueur d'anonymisation |
| `auth.users` | (entree Supabase Auth) | Donnees completes | **Hard delete** via Supabase Admin API | `supabase.auth.admin.deleteUser(uid)` |
| `reservations` | `consumer_id` | `uuid-1234` | **Conserve** (UUID necessaire pour l'integrite referentielle, mais le profil pointe vers "Utilisateur Supprime") | Pas de modification |
| `reviews` | `author_name` (affiche) | "Kevin D." | "Utilisateur supprime" | Le texte et les etoiles sont conserves. Le nom affiche est remplace. |
| `reviews` | `consumer_id` | `uuid-1234` | **Conserve** | FK vers le profil anonymise |
| `claims` | `consumer_id` | `uuid-1234` | **Conserve** | FK vers le profil anonymise |
| `claims` | Photos attachees | Fichiers Supabase Storage | **Hard delete** (si la reclamation est resolue depuis > 90 jours) | Suppression physique |
| `user_badges` | Toutes les lignes | Badges du user | **Hard delete** | Les statistiques globales sont pre-calculees et ne sont pas affectees |
| `referrals` | `referrer_id` | `uuid-1234` | **Conserve** | FK vers le profil anonymise. Les filleuls gardent leur bonus. |

### Implementation SQL de l'anonymisation

```sql
-- Transaction d'anonymisation (executee par le job BullMQ a J+30)
BEGIN;

-- 1. Anonymiser le profil
UPDATE profiles
SET
  first_name = 'Utilisateur',
  last_name = 'Supprime',
  email = 'anon_' || LEFT(MD5(id::text), 8) || '@deleted.bienbon.mu',
  phone = NULL,
  avatar_url = NULL,
  dietary_preferences = NULL,  -- deja NULL depuis J+0
  referral_code = NULL,
  notification_preferences = NULL,
  language = NULL,
  anonymized_at = NOW()
WHERE deleted_at IS NOT NULL
  AND deleted_at < NOW() - INTERVAL '30 days'
  AND anonymized_at IS NULL;

-- 2. Anonymiser le nom affiche dans les avis
UPDATE reviews
SET display_name = 'Utilisateur supprime'
WHERE consumer_id IN (
  SELECT id FROM profiles
  WHERE anonymized_at IS NOT NULL
  AND anonymized_at = (SELECT MAX(anonymized_at) FROM profiles WHERE anonymized_at IS NOT NULL)
);

-- 3. Supprimer les badges
DELETE FROM user_badges
WHERE user_id IN (
  SELECT id FROM profiles
  WHERE anonymized_at IS NOT NULL
  AND anonymized_at = (SELECT MAX(anonymized_at) FROM profiles WHERE anonymized_at IS NOT NULL)
);

-- 4. Audit log
INSERT INTO audit_logs (actor_type, action, entity_type, entity_id, metadata)
SELECT 'system', 'profile.anonymized', 'profile', id, '{"reason": "account_deletion_30d"}'
FROM profiles
WHERE anonymized_at IS NOT NULL
AND anonymized_at = (SELECT MAX(anonymized_at) FROM profiles WHERE anonymized_at IS NOT NULL);

COMMIT;
```

**Nota** : dans le service NestJS, le job itere sur chaque profil eligible individuellement (et non en batch comme illustre ci-dessus) pour gerer les erreurs unitairement et supprimer les fichiers Supabase Storage un par un.

```typescript
// anonymization.job.ts (BullMQ processor)
@Processor('anonymization')
export class AnonymizationProcessor {
  async process(job: Job) {
    const profiles = await this.prisma.profile.findMany({
      where: {
        deletedAt: { lt: subDays(new Date(), 30) },
        anonymizedAt: null,
      },
    });

    for (const profile of profiles) {
      await this.prisma.$transaction(async (tx) => {
        // 1. Supprimer l'avatar de Supabase Storage
        if (profile.avatarUrl) {
          await this.supabaseAdmin.storage
            .from('avatars')
            .remove([extractPath(profile.avatarUrl)]);
        }

        // 2. Supprimer les photos de reclamation resolues > 90j
        await this.deleteResolvedClaimPhotos(tx, profile.id);

        // 3. Anonymiser le profil
        await tx.profile.update({
          where: { id: profile.id },
          data: {
            firstName: 'Utilisateur',
            lastName: 'Supprime',
            email: `anon_${hashTrunc(profile.id)}@deleted.bienbon.mu`,
            phone: null,
            avatarUrl: null,
            dietaryPreferences: null,
            referralCode: null,
            notificationPreferences: null,
            language: null,
            anonymizedAt: new Date(),
          },
        });

        // 4. Anonymiser les avis
        await tx.review.updateMany({
          where: { consumerId: profile.id },
          data: { displayName: 'Utilisateur supprime' },
        });

        // 5. Supprimer les badges
        await tx.userBadge.deleteMany({
          where: { userId: profile.id },
        });

        // 6. Supprimer le user Supabase Auth
        await this.supabaseAdmin.auth.admin.deleteUser(profile.id);

        // 7. Audit log
        await tx.auditLog.create({
          data: {
            actorType: 'system',
            action: 'profile.anonymized',
            entityType: 'profile',
            entityId: profile.id,
            metadata: { reason: 'account_deletion_30d' },
          },
        });
      });
    }
  }
}
```

### Reactivation de compte (J+0 a J+30)

Pendant le delai de grace de 30 jours, le consommateur peut reactiver son compte :
1. Il se connecte avec ses identifiants (email/telephone + mot de passe, ou OAuth)
2. L'app detecte `deleted_at IS NOT NULL AND anonymized_at IS NULL`
3. Un ecran propose la reactivation : "Votre compte est en cours de suppression. Souhaitez-vous le reactiver ?"
4. Si oui : `deleted_at = NULL`, Supabase Auth : re-enable user, restauration des sessions
5. **NB** : les preferences alimentaires, favoris, et tokens de paiement supprimes a J+0 ne sont **pas** restaures. Le consommateur doit les re-saisir. C'est un compromis accepte entre protection des donnees sensibles et experience utilisateur.
6. Audit log : `profile.reactivated`

---

## Q7 : Conciliation anonymisation / ledger immutable

### Le probleme

Le ledger financier (ADR-007) est **immutable** : les ecritures ne sont jamais modifiees ni supprimees. Les corrections se font par ecriture compensatoire. Or, les ecritures du ledger referencent des entites (partenaires, reservations) qui sont elles-memes liees a des consommateurs.

La chaine de reference est :
```
ledger_entries.reference_id → reservations.id → reservations.consumer_id → profiles.id
```

### Solution : dissociation par couches

Le ledger lui-meme ne contient **pas** de donnees personnelles directement. Il contient :
- `account_id` : reference au compte du ledger (ex: `PARTNER_PAYABLE:uuid-partner`)
- `reference_type` + `reference_id` : reference a la reservation (`reservation:uuid-reservation`)
- `amount`, `type`, `description`, `created_at`

La description du ledger peut contenir "Reservation #R-2026-001234" mais **pas** le nom du consommateur.

**Decision** : le ledger n'est **pas** modifie lors de l'anonymisation. La reference `reservation_id` pointe vers une reservation dont le `consumer_id` pointe vers un profil anonymise. C'est conforme car :

1. Les ecritures comptables sont conservees 7 ans (obligation legale, Companies Act 2001)
2. Le profil est anonymise, donc la resolution `consumer_id → profil` retourne "Utilisateur Supprime"
3. L'integrite referentielle est preservee (les FK ne sont pas cassees)
4. Pour un auditeur externe, les montants et les flux sont intacts, mais l'identite du consommateur est irreversiblement perdue

```
AVANT anonymisation :
  ledger_entry → reservation #R-001234 → consumer "Kevin Dorasamy" (kevin@example.mu)

APRES anonymisation :
  ledger_entry → reservation #R-001234 → consumer "Utilisateur Supprime" (anon_a1b2c3d4@deleted.bienbon.mu)
```

**Pour le partenaire** : meme logique. Le compte `PARTNER_PAYABLE:uuid` reste dans le ledger avec son solde a zero. Le profil partenaire est anonymise mais le compte comptable persiste.

### Conformite

Cette approche est conforme au DPA 2017 car :
- Le droit a l'effacement n'est **pas absolu**. Le DPA 2017 prevoit une exception pour le respect d'une obligation legale (retention comptable).
- L'anonymisation rend les donnees irreversiblement non-identifiantes. Les ecritures comptables ne contiennent plus de donnees personnelles une fois le profil anonymise.
- C'est l'approche recommandee par l'ICO (UK) et la CNIL (France) pour concilier droit a l'effacement et obligations comptables.

---

## Q8 : Export de donnees

### Cadre legal

Le DPA 2017 accorde le droit d'acces (Section 41) : le data subject peut demander au controller de lui fournir une copie de ses donnees personnelles. Le DPA 2017 ne prevoit **pas** de droit a la portabilite (contrairement au GDPR, Article 20).

Neanmoins, les specs BienBon (US-C054, ecran "Mes donnees") prevoient une fonctionnalite d'export. C'est une bonne pratique qui anticipe le GDPR et ameliore la confiance des utilisateurs.

### Decision Q8

**Format** : **JSON** comme format principal, avec possibilite d'ajouter un PDF lisible par un humain en phase 2.

**Justification** :
- JSON est le format standard du GDPR pour la portabilite
- JSON est lisible par des outils techniques et facilement convertible en CSV/PDF
- Un PDF "humain-friendly" est un nice-to-have mais pas critique pour le MVP

**Contenu de l'export** :

```json
{
  "export_date": "2026-03-15T10:30:00Z",
  "format_version": "1.0",
  "user": {
    "id": "uuid-1234",
    "first_name": "Kevin",
    "last_name": "Dorasamy",
    "email": "kevin@example.mu",
    "phone": "+23057123456",
    "language": "fr",
    "created_at": "2026-01-15T08:00:00Z"
  },
  "dietary_preferences": ["halal", "vegetarian"],
  "notification_preferences": {
    "favorites_push": true,
    "favorites_email": true,
    "reminders_push": true,
    "marketing_push": false,
    "marketing_email": false
  },
  "reservations": [
    {
      "id": "uuid-res-001",
      "basket_title": "Panier Surprise Patisserie",
      "partner_name": "Boulangerie du Port",
      "status": "picked_up",
      "amount_paid": 150,
      "currency": "MUR",
      "pickup_date": "2026-02-10",
      "pickup_slot": "17:00-18:00",
      "created_at": "2026-02-10T08:30:00Z"
    }
  ],
  "reviews": [
    {
      "id": "uuid-rev-001",
      "partner_name": "Boulangerie du Port",
      "rating": 5,
      "text": "Excellent panier, tres genereux !",
      "created_at": "2026-02-10T20:00:00Z"
    }
  ],
  "claims": [
    {
      "id": "uuid-claim-001",
      "reservation_id": "uuid-res-002",
      "status": "resolved",
      "created_at": "2026-02-12T10:00:00Z"
    }
  ],
  "favorites": [
    {
      "partner_name": "Boulangerie du Port",
      "added_at": "2026-01-20T14:00:00Z"
    }
  ],
  "badges": [
    {
      "badge_name": "Premier panier",
      "earned_at": "2026-02-10T18:00:00Z"
    }
  ],
  "impact": {
    "baskets_saved": 12,
    "co2_avoided_kg": 18.5,
    "money_saved_mur": 1800
  },
  "consent_records": [
    {
      "type": "terms_of_service",
      "version": "1.0",
      "consented_at": "2026-01-15T08:00:00Z"
    },
    {
      "type": "privacy_policy",
      "version": "1.0",
      "consented_at": "2026-01-15T08:00:00Z"
    },
    {
      "type": "dietary_preferences",
      "consented_at": "2026-01-15T08:05:00Z"
    },
    {
      "type": "marketing_notifications",
      "consented_at": null,
      "note": "Non consent"
    }
  ]
}
```

**Donnees EXCLUES de l'export** (securite) :
- Mot de passe (hash)
- Tokens de paiement (Peach)
- Tokens JWT / sessions
- Device tokens FCM
- Audit logs (donnees internes, pas personnelles au sens strict)

**Implementation** :

```typescript
// data-export.service.ts
@Injectable()
export class DataExportService {
  async exportUserData(userId: string): Promise<UserDataExport> {
    const [profile, reservations, reviews, claims, favorites, badges, consents] =
      await Promise.all([
        this.prisma.profile.findUniqueOrThrow({ where: { id: userId } }),
        this.prisma.reservation.findMany({
          where: { consumerId: userId },
          include: { basket: { include: { commerce: true } } },
        }),
        this.prisma.review.findMany({ where: { consumerId: userId } }),
        this.prisma.claim.findMany({
          where: { consumerId: userId },
          select: { id: true, reservationId: true, status: true, createdAt: true },
          // Pas les photos ni les messages internes
        }),
        this.prisma.favorite.findMany({ where: { userId } }),
        this.prisma.userBadge.findMany({ where: { userId } }),
        this.prisma.consentRecord.findMany({ where: { userId } }),
      ]);

    return this.formatExport(profile, reservations, reviews, claims, favorites, badges, consents);
  }
}
```

**Delai de reponse** : le DPA 2017 ne fixe pas de delai explicite pour le droit d'acces, mais par analogie avec le GDPR (30 jours), BienBon s'engage a fournir l'export **sous 48 heures** (generation automatique, pas de traitement manuel).

**Securite de l'export** : l'export est genere cote serveur et mis a disposition via un lien signe temporaire (Supabase Storage, expiration 24h). Un email est envoye au consommateur avec le lien de telechargement.

---

## Q9 : Consentement cookies

### Cadre legal

Le DPA 2017, dans le prolongement de la directive ePrivacy europeenne, exige le consentement de l'utilisateur pour les cookies non essentiels. Les specs (US-T013, US-W012) decrivent deja la banniere et le panel de preferences.

### Decision Q9

**Architecture du consentement** :

```
┌─────────────────────────────────────────────────────────────┐
│                  CATEGORISATION DES COOKIES                  │
├──────────────────┬─────────────┬────────────────────────────┤
│ Categorie        │ Consentement│ Exemples                   │
├──────────────────┼─────────────┼────────────────────────────┤
│ Essentiels       │ Non requis  │ Session Supabase Auth,     │
│                  │ (toujours   │ CSRF token, preferences    │
│                  │  actifs)    │ langue, cookie consent     │
│                  │             │ choice                     │
├──────────────────┼─────────────┼────────────────────────────┤
│ Analytiques      │ Opt-in      │ Analytics (si implementes),│
│                  │             │ metriques de performance   │
├──────────────────┼─────────────┼────────────────────────────┤
│ Marketing        │ Opt-in      │ Pixels publicitaires,      │
│                  │             │ tracking cross-site        │
│                  │             │ (pas prevu au MVP)         │
└──────────────────┴─────────────┴────────────────────────────┘
```

**Stockage du consentement** :

| Aspect | Decision |
|--------|----------|
| Ou stocker le choix ? | Cookie `bienbon_consent` (JSON encode) cote client + table `consent_records` cote serveur pour les utilisateurs connectes |
| Format du cookie | `{ essential: true, analytics: false, marketing: false, version: "1.0", timestamp: "2026-02-27T10:00:00Z" }` |
| Duree | 12 mois (spec US-T013) |
| Synchronisation site vitrine / webapp | Via le meme domaine (`.bienbon.mu`). Le cookie est partage. Pour un utilisateur connecte, le consentement est synchronise via la BDD. |
| Re-consentement | Apres 12 mois ou si la politique de cookies change (version bump) |
| Preuve de consentement | Table `consent_records` avec `user_id`, `type`, `choice`, `ip`, `user_agent`, `timestamp` |

**Implementation recommandee** : utiliser une librairie legere cote client (par exemple `vanilla-cookieconsent` ou equivalent React) plutot qu'un service tiers payant. L'UI est deja specifiee dans les mockups (US-T013).

---

## Q10 : Notification de breach

### Obligations (DPA 2017, Section 38)

1. **Notification au Commissioner** : dans les **72 heures** apres avoir eu connaissance du breach
2. **Notification aux data subjects** : "sans delai indu" si le breach est susceptible d'engendrer un risque eleve pour leurs droits et libertes
3. **Le processor** doit notifier le controller "sans delai indu"

Source : [DLA Piper - Breach Notification Mauritius](https://www.dlapiperdataprotection.com/index.html?t=breach-notification&c=MU)

### Decision Q10

**Plan de reponse aux incidents** :

```
┌───────────────────────────────────────────────────────────────┐
│                   BREACH RESPONSE PLAN                         │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  T+0 : Detection du breach                                   │
│  ├── Sentry alert, rapport utilisateur, notification          │
│  │   sous-traitant, ou audit interne                         │
│  ▼                                                            │
│  T+1h : Evaluation initiale                                  │
│  ├── Qui est impacte ? Combien de personnes ?                │
│  ├── Quelles donnees sont concernees ?                       │
│  ├── Le breach est-il contenu ?                              │
│  ├── Qui doit etre notifie en interne ? (CTO, DPO, CEO)     │
│  ▼                                                            │
│  T+4h : Containment                                          │
│  ├── Isoler le systeme compromis                             │
│  ├── Revoquer les acces compromis                            │
│  ├── Preserver les preuves (logs, snapshots)                 │
│  ▼                                                            │
│  T+24h : Analyse d'impact                                    │
│  ├── Classification : risque eleve / risque modere / faible  │
│  ├── Nombre exact de personnes concernees                    │
│  ├── Type de donnees exposees                                │
│  ├── Risque de prejudice pour les personnes                  │
│  ▼                                                            │
│  T+48h : Preparation de la notification                      │
│  ├── Redaction de la notification au Commissioner            │
│  ├── Redaction de la notification aux data subjects          │
│  │   (si risque eleve)                                       │
│  ▼                                                            │
│  T+72h MAX : Notification au Data Protection Commissioner    │
│  ├── Formulaire officiel du Data Protection Office           │
│  ├── Contenu : nature du breach, categories de donnees,      │
│  │   nombre de personnes, mesures prises, contact DPO        │
│  ▼                                                            │
│  T+72h+ : Notification aux data subjects (si risque eleve)  │
│  ├── Email individuel dans la langue de l'utilisateur        │
│  ├── Contenu : nature du breach, consequences potentielles,  │
│  │   mesures prises, recommendations (changer mot de passe), │
│  │   contact DPO                                             │
│  ▼                                                            │
│  T+7j : Post-mortem                                          │
│  ├── Root cause analysis                                     │
│  ├── Actions correctives                                     │
│  ├── Mise a jour des procedures de securite                  │
│  └── Rapport final archive                                   │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

**Implementation technique** :
- Un endpoint interne `/admin/breach-report` permet de documenter un incident
- Les notifications aux data subjects utilisent le canal email (Resend) avec un template dedie
- Le DPO externe est notifie automatiquement par email des qu'un incident est cree
- Tous les incidents sont traces dans `audit_logs` avec `action = 'breach.*'`

---

## Q11 : Privacy policy -- grandes lignes

La politique de confidentialite de BienBon doit etre redigee en **francais** (langue principale) et **anglais**, accessible depuis :
- L'ecran d'inscription (lien dans la checkbox CGU)
- Le profil utilisateur (section "Politique de confidentialite")
- Le site vitrine (footer)

### Structure recommandee

1. **Identite du responsable de traitement** : BienBon (nom legal), adresse a Maurice, email de contact
2. **Coordonnees du DPO** : nom/cabinet, email, telephone
3. **Donnees collectees** : liste par categorie (profil, reservations, paiements, preferences, etc.)
4. **Finalites et bases legales** : tableau du registre des traitements (Q4)
5. **Durees de conservation** : tableau de la politique de retention (Q5)
6. **Destinataires et sous-traitants** : registre des sous-traitants (Q2)
7. **Transferts internationaux** : pays, garanties, DPAs signes
8. **Droits des personnes** : acces, rectification, effacement, opposition, limitation. Mention explicite de l'absence de portabilite au sens du DPA 2017 (mais export de donnees disponible).
9. **Cookies et traceurs** : categories, finalites, duree, gestion des preferences
10. **Securite** : mesures techniques (chiffrement, HTTPS, RLS, audit trail) et organisationnelles
11. **Notification de breach** : engagement de notification sous 72h au Commissioner et aux personnes concernees
12. **Modifications de la politique** : notification par email en cas de changement substantiel
13. **Reclamations** : droit de saisir le Data Protection Commissioner de Maurice

---

## Resume des decisions

| # | Question | Decision | Justification |
|---|----------|----------|---------------|
| Q1 | Enregistrement et DPO | Enregistrement obligatoire aupres du Commissioner + DPO externe (cabinet juridique) | Obligation legale DPA 2017, sanctions penales en cas de non-conformite |
| Q2 | Transferts internationaux | Conformite via DPAs signes avec chaque sous-traitant + declaration dans l'enregistrement + minimisation des PII dans les transferts | DPA 2017 Section 36 -- garanties appropriees |
| Q3 | Donnees sensibles | Preferences alimentaires traitees comme sensibles (consentement explicite). Suppression immediate a J+0. | DPA 2017 -- "halal" = indicateur religieux indirect |
| Q4 | Base legale | Execution du contrat pour le coeur du service. Consentement explicite pour : donnees sensibles, marketing, cookies non essentiels. | DPA 2017 -- principe de proportionnalite |
| Q5 | Retention | Profil : duree du compte + 30j. Ledger : 7 ans. Audit : 2 ans. Notifications : 30j. Documents partenaire : partenariat + 1 an. | Companies Act 2001, MRA, DPA 2017 |
| Q6 | Anonymisation | Anonymisation irreversible a J+30 (valeurs fictives, hash, NULL). Donnees sensibles supprimees a J+0. | DPA 2017 -- droit a l'effacement, best practice GDPR |
| Q7 | Ledger vs anonymisation | Le ledger n'est pas modifie. Les FK pointent vers des profils anonymises. | Obligation comptable (7 ans) + donnees deja anonymisees = plus de donnees personnelles |
| Q8 | Export de donnees | JSON automatique, disponible sous 48h, lien signe temporaire | Bonne pratique GDPR (portabilite), confiance utilisateur |
| Q9 | Cookies | 3 categories (essentiels, analytics, marketing). Opt-in pour non essentiels. Stockage 12 mois. | DPA 2017 + ePrivacy |
| Q10 | Breach notification | Plan de reponse structure, notification Commissioner < 72h | DPA 2017 Section 38 |

---

## Checklist de conformite pre-lancement

### Obligations legales

- [ ] **Enregistrement** aupres du Data Protection Commissioner (formulaire + fee)
- [ ] **Designation d'un DPO** (cabinet externe identifie et mandate)
- [ ] **Politique de confidentialite** redigee (FR + EN), accessible dans l'app et le site vitrine
- [ ] **CGU** redigees, incluant les clauses de traitement des donnees
- [ ] **DPAs signes** avec chaque sous-traitant (Supabase, Railway, Cloudflare, Peach, Resend, Google/FCM, Sentry, Grafana)
- [ ] **Registre des traitements** documente et a jour

### Implementation technique

- [ ] **Consentement CGU** : checkbox obligatoire a l'inscription, horodatage en base
- [ ] **Consentement donnees sensibles** : ecran de preferences alimentaires avec message de consentement explicite
- [ ] **Consentement marketing** : notifications marketing en opt-in (desactivees par defaut)
- [ ] **Banniere de cookies** : implementee sur webapp et site vitrine, avec 3 categories
- [ ] **Export de donnees** : endpoint `/api/me/export` + generation JSON + envoi par email
- [ ] **Suppression de compte** : flux complet (modal, reauthentification, desactivation immediate, email de confirmation)
- [ ] **Job d'anonymisation J+30** : BullMQ cron job, teste avec des donnees de test
- [ ] **Reactivation de compte** : flux de reactivation pendant les 30 jours de grace
- [ ] **Purge des notifications** : job CRON 30 jours
- [ ] **Purge des audit logs** : job CRON 2 ans
- [ ] **Purge des photos de reclamation** : job CRON 90 jours post-resolution
- [ ] **Sentry PII scrubbing** : `sendDefaultPii: false`, `beforeSend` configure
- [ ] **FCM payload** : aucune donnee personnelle dans les payloads push
- [ ] **Logs applicatifs** : aucune donnee personnelle dans les logs (emails, telephones, noms)
- [ ] **Geolocalisation** : confirmation que la position exacte n'est jamais envoyee au serveur (ADR-016)
- [ ] **Chiffrement at rest** : Supabase (AES-256) active
- [ ] **Chiffrement in transit** : HTTPS partout (Cloudflare SSL), connections BDD chiffrees
- [ ] **RLS Supabase** : policies en place pour isoler les donnees entre utilisateurs
- [ ] **Documents partenaire** : acces restreint aux admins uniquement (Supabase Storage policies)

### Processus organisationnels

- [ ] **Procedure de reponse aux breaches** documentee et connue de l'equipe
- [ ] **Contact du Data Protection Office** identifie et accessible
- [ ] **Formation** de l'equipe de developpement aux bonnes pratiques de protection des donnees
- [ ] **Revue annuelle** de la politique de confidentialite planifiee
- [ ] **Audit de conformite** planifie a M+6 post-lancement

---

## Consequences

### Positives

1. **Conformite legale** : BienBon respecte le DPA 2017 des le lancement, evitant les sanctions penales (jusqu'a MUR 200 000 + 5 ans) et les dommages reputationnels.
2. **Confiance utilisateur** : une politique de confidentialite claire, un export de donnees disponible, et un processus de suppression transparent renforcent la confiance dans un marche ou la protection des donnees est un sujet croissant.
3. **Preparation GDPR** : les choix d'architecture (export JSON, consentement explicite pour les donnees sensibles, anonymisation irreversible) positionnent BienBon pour une conformite GDPR si l'entreprise s'etend a d'autres marches.
4. **Architecture propre** : la separation entre donnees operationnelles et donnees archivees, la politique de retention par entite (ADR-003), et le ledger immutable (ADR-007) forment un systeme coherent ou la conformite est un sous-produit de bons choix architecturaux.

### Negatives

1. **Cout initial** : la designation d'un DPO externe et l'enregistrement aupres du Commissioner representent un cout pour une startup en demarrage. Estime a MUR 50 000 - 150 000/an pour un DPO externe.
2. **Complexite du job d'anonymisation** : le processus d'anonymisation en cascade (profil + avis + badges + storage + auth) est complexe a tester exhaustivement. Un bug pourrait laisser des donnees non anonymisees ou casser des FK.
3. **Perte de donnees a la reactivation** : le choix de supprimer les donnees sensibles et les favoris immediatement (J+0) degrade l'experience de reactivation. Un utilisateur qui se ravise dans les 30 jours devra re-saisir ses preferences.
4. **DPAs avec les sous-traitants** : certains sous-traitants (Google/FCM, Sentry) peuvent avoir des DPAs standards qui ne sont pas entierement adaptes au DPA 2017 mauricien. Un examen juridique est necessaire.

### Risques

| Risque | Probabilite | Impact | Mitigation |
|--------|-------------|--------|------------|
| Non-enregistrement aupres du Commissioner par oubli | Moyenne | Critique (infraction penale) | Ajouter a la checklist de lancement. DPO externe responsable. |
| Bug dans le job d'anonymisation laissant des donnees personnelles | Moyenne | Eleve | Tests automatises avec fixtures. Monitoring du job (alertes si echec). Audit mensuel. |
| Breach de donnees chez un sous-traitant (Supabase, Resend) | Faible | Eleve | DPAs signes, monitoring Sentry, plan de reponse aux breaches. |
| Touriste europeen invoquant le GDPR | Faible | Moyen | La conformite DPA 2017 couvre ~90% du GDPR. L'export de donnees et le droit a l'effacement sont implementes. |
| Evolution du DPA 2017 (amendements) | Faible | Moyen | Veille juridique par le DPO externe. Revue annuelle de la politique. |

---

## References

### Textes legaux
- [Data Protection Act 2017 - texte integral (Council of Europe)](https://rm.coe.int/dpa-2017-maurice/168077c5b8)
- [Data Protection Act 2017 - site officiel du gouvernement mauricien](https://dataprotection.govmu.org/Pages/The%20Law/Data-Protection-Act-2017.aspx)
- [Guide introductif du Data Protection Office (PDF)](https://dataprotection.govmu.org/Pages/Downloads/Publications%20and%20Guidelines/Guidelines.pdf)
- [Companies Act 2001 - site officiel](https://companies.govmu.org/Pages/Legislations/Companies-Act-2001.aspx)

### Analyses juridiques
- [Mondaq - DPA 2017 vs GDPR](https://www.mondaq.com/data-protection/705322/data-protection-data-protection-act-2017-vs-gdpr)
- [DLA Piper - Data Protection Laws of the World: Mauritius](https://www.dlapiperdataprotection.com/?t=law&c=MU)
- [Appleby - Data Protection Guide 2023: Mauritius](https://www.applebyglobal.com/publications/data-protection-guide-mauritius/)
- [Appleby - GDPR and Data Protection Law in Mauritius](https://www.applebyglobal.com/publications/gdpr-and-data-protection-law-in-mauritius/)
- [Dentons - Mauritius Data Transfer Provisions](https://www.dentons.com/en/insights/articles/2022/october/14/data-transfer-provisions-and-the-lack-of-data-portability-provisions)
- [Global Legal Post - Mauritius Data Protection Law Guide](https://www.globallegalpost.com/lawoverborders/data-protection-law-guide-1072382791/mauritius-1530183321)
- [Clym - DPA 2017 Mauritius](https://www.clym.io/regulations/data-protection-act-2017%E2%80%8B%E2%80%8B-mauritius)
- [CaseGuard - Privacy Legislation in Mauritius](https://caseguard.com/articles/privacy-legislation-and-personal-data-law-in-mauritius/)

### Fiscalite et comptabilite
- [PwC - Mauritius Tax Administration](https://taxsummaries.pwc.com/mauritius/corporate/tax-administration)
- [Lloyds Bank Trade - Accounting in Mauritius](https://www.lloydsbanktrade.com/en/market-potential/mauritius/accounting)
- [MRA - Income Tax Act 1995 (consolide)](https://www.mra.mu/download/ITAConsolidated.pdf)

### ADRs internes
- ADR-003 : Schema de base de donnees (soft delete, anonymisation, audit trail)
- ADR-005 : Architecture de paiement (tokenisation Peach Payments)
- ADR-007 : Ledger commissions (immutabilite des ecritures)
- ADR-010 : Strategie d'authentification (Supabase Auth)
- ADR-014 : Notifications multicanal (FCM, Resend)
- ADR-016 : Geolocalisation (position jamais envoyee au serveur)
- ADR-020 : Hebergement infrastructure (Railway Singapour, Cloudflare)

---

## Avertissement

**Cette ADR ne constitue pas un avis juridique.** Les analyses et recommandations sont basees sur la lecture du DPA 2017 et des guides publies par le Data Protection Office de Maurice, mais n'ont pas ete validees par un juriste mauricien. **Un conseil juridique specialise en protection des donnees a Maurice est indispensable avant le lancement**, notamment pour :
- La redaction de la politique de confidentialite et des CGU
- La designation formelle du DPO
- La preparation du dossier d'enregistrement aupres du Commissioner
- La revue des DPAs avec les sous-traitants
- La classification definitive des preferences alimentaires comme donnees sensibles
