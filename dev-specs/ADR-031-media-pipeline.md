# ADR-031 : Pipeline media -- upload, stockage, delivery et securite des images et documents

| Champ         | Valeur                                                      |
|---------------|-------------------------------------------------------------|
| **Statut**    | Propose                                                     |
| **Date**      | 2026-02-27                                                  |
| **Auteur**    | Equipe architecture BienBon.mu                              |
| **Decideurs** | Equipe technique BienBon                                    |
| **Scope**     | Upload, compression, stockage, CDN delivery, thumbnails, securite media, performance images |
| **Prereqs**   | ADR-001 (stack backend), ADR-004 (API REST), ADR-020 (infra / Supabase Storage / Cloudflare CDN), ADR-022 (securite OWASP) |

---

## 1. Contexte

BienBon.mu est une marketplace mobile de paniers anti-gaspi a l'ile Maurice. Les images sont au coeur de l'experience utilisateur : photos de paniers, vitrines de commerces, avatars, et documents d'onboarding partenaire. Le pipeline media doit gerer le cycle complet -- de la capture sur un smartphone partenaire a l'affichage instantane sur l'app consumer.

### 1.1 Contraintes specifiques

| Contrainte | Impact |
|-----------|--------|
| **Reseau a Maurice** | 3G/4G variable (10-50 Mbps mobile), optimiser pour le bas debit |
| **Budget startup** | Supabase Storage gratuit jusqu'a 1 GB, minimiser les couts de stockage et de bande passante |
| **Mobile-first** | 2 apps Flutter (consumer + partner), uploads depuis des smartphones a cameras variees |
| **Securite documents** | Les justificatifs partenaire (patente, certificat d'hygiene) sont des documents sensibles -- acces restreint |
| **Latence CDN** | Cloudflare PoP en Afrique du Sud (Johannesburg, Cape Town), ~40-60 ms depuis Maurice (cf. ADR-020) |
| **Equipe petite** | 2-5 devs, pas de pipeline de traitement d'images complexe a operer |

### 1.2 Types de medias dans le projet

| Type de media | Acteur | Volume par entite | Format attendu | Sensibilite |
|--------------|--------|-------------------|----------------|-------------|
| **Photos de paniers** | Partenaire (upload) | 1-5 photos par panier | JPEG/WebP | Publique |
| **Photo de profil utilisateur** | Consumer + Partenaire | 1 photo | JPEG/WebP | Publique |
| **Logo de boutique** | Partenaire | 1 logo | PNG/JPEG/WebP | Publique |
| **Photos de boutique** | Partenaire | 3-5 photos | JPEG/WebP | Publique |
| **Justificatifs partenaire** | Partenaire (inscription) | 2-5 documents (patente, certificat d'hygiene, BRN) | JPEG/PNG/PDF | **Prive / sensible** |
| **Photos de preuve** | Consumer ou Partenaire (disputes/reclamations) | 1-3 photos | JPEG/WebP | **Prive / sensible** |
| **Images marketing** | Admin | Variable | PNG/JPEG/WebP/SVG | Publique |

### 1.3 Volume estime

| Phase | Partenaires | Paniers/jour | Images stockees (cumul) | Stockage estime |
|-------|-------------|-------------|-------------------------|-----------------|
| **Lancement** (< 100 users) | 10-20 | 20-50 | ~500-2 000 | 200 MB - 1 GB |
| **Croissance** (1 000 users) | 50-100 | 100-300 | ~5 000-20 000 | 2-8 GB |
| **Maturite** (10 000 users) | 200-500 | 500-1 500 | ~50 000-150 000 | 20-60 GB |

---

## 2. Pipeline d'upload

### 2.1 Architecture du flux

```
 Smartphone (Flutter)                 Supabase Storage           NestJS Backend
 +-----------------------+            +------------------+       +------------------+
 | 1. Capture/selection  |            |                  |       |                  |
 |    de l'image         |            |                  |       |                  |
 |                       |            |                  |       |                  |
 | 2. Compression client |            |                  |       |                  |
 |    - Resize 1200px    |            |                  |       |                  |
 |    - JPEG 80%         |            |                  |       |                  |
 |    - Strip EXIF       |            |                  |       |                  |
 |                       |  3. Request|signed URL        |       |                  |
 |                       |----------->|                  |<------|  Genere signed   |
 |                       |            |                  |       |  upload URL      |
 |                       |  4. Upload |direct (PUT)      |       |                  |
 |                       |----------->|  S3-compatible   |       |                  |
 |                       |            |                  |       |                  |
 |                       |            |  5. Webhook/     |       |                  |
 |                       |            |     trigger      |------>|  6. Validation   |
 |                       |            |                  |       |     - MIME check |
 |                       |            |                  |       |     - Taille     |
 |                       |            |                  |       |     - Antimalware|
 |                       |            |                  |       |                  |
 |                       |            |                  |       |  7. Thumbnails   |
 |                       |            |                  |       |     (BullMQ job) |
 |                       |            |                  |       |     - 150x150    |
 |                       |            |                  |       |     - 400x300    |
 |                       |            |                  |       |     - 800x600    |
 |                       |            |                  |       |                  |
 |                       |            |                  |       |  8. Blurhash     |
 |                       |            |                  |       |     generation   |
 |                       |            |                  |       |     -> DB        |
 +-----------------------+            +------------------+       +------------------+
```

### 2.2 Etape 1 -- Compression cote client (Flutter)

La compression cote client est essentielle pour reduire la bande passante et le temps d'upload, surtout sur les reseaux mobiles mauriciens.

**Package recommande :** `flutter_image_compress` (basee sur libjpeg-turbo/libwebp natifs).

**Parametres de compression :**

| Parametre | Valeur | Justification |
|-----------|--------|---------------|
| **Dimension max** | 1200px (plus grand cote) | Suffisant pour l'affichage detail mobile (800x600) + marge pour les thumbnails. Les ecrans mobiles font max ~430px de large (iPhone 14 Pro). |
| **Qualite JPEG** | 80% | Bon compromis taille/qualite. Au-dela de 85%, le gain visuel est imperceptible. En dessous de 70%, les artefacts sont visibles sur les photos de nourriture. |
| **Format de sortie** | WebP si supporte, sinon JPEG | WebP offre ~25-35% de reduction de taille par rapport a JPEG a qualite equivalente. Support Android natif, iOS 14+. |
| **Strip EXIF** | Oui (systematique) | **Privacy** : supprime les coordonnees GPS, le modele de telephone, la date de prise de vue. Voir section 6 (securite). |

**Taille resultante estimee :**

| Image originale (smartphone 12 MP) | Apres compression | Reduction |
|-------------------------------------|-------------------|-----------|
| 3-6 MB (JPEG haute qualite, 4000x3000) | 150-400 KB (WebP 1200px 80%) | ~90% |
| 3-6 MB (JPEG haute qualite, 4000x3000) | 200-500 KB (JPEG 1200px 80%) | ~88% |

**Implementation Flutter :**

```dart
import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;

class ImageCompressor {
  static const int maxDimension = 1200;
  static const int quality = 80;

  /// Compresse une image avant upload.
  /// Retourne le fichier compresse (WebP si supporte, JPEG sinon).
  static Future<XFile?> compress(XFile sourceFile) async {
    final dir = await getTemporaryDirectory();
    final targetPath = p.join(
      dir.path,
      '${DateTime.now().millisecondsSinceEpoch}.webp',
    );

    final result = await FlutterImageCompress.compressAndGetFile(
      sourceFile.path,
      targetPath,
      quality: quality,
      minWidth: maxDimension,
      minHeight: maxDimension,
      format: CompressFormat.webp, // Fallback JPEG si WebP non supporte
      keepExif: false, // SECURITE : strip EXIF (GPS, device info)
    );

    return result;
  }
}
```

### 2.3 Etape 2 -- Upload via signed URL Supabase Storage

L'upload se fait **directement depuis Flutter vers Supabase Storage**, sans transiter par le backend NestJS. Cela evite de surcharger le backend et tire parti du protocole S3 optimise de Supabase.

**Flux :**

1. Flutter appelle l'API NestJS : `POST /api/v1/media/upload-url`
2. NestJS verifie l'authentification, les quotas, et genere un signed upload URL via le SDK Supabase admin
3. NestJS retourne le signed URL (valide 5 minutes) + le chemin de stockage
4. Flutter upload le fichier directement vers Supabase Storage via le signed URL (PUT HTTP)

**Implementation NestJS (generation du signed URL) :**

```typescript
// media.service.ts

import { Injectable, BadRequestException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

interface UploadUrlRequest {
  bucket: 'baskets' | 'profiles' | 'stores' | 'documents' | 'marketing';
  contentType: string;
  fileExtension: string;
  entityId: string; // basketId, storeId, userId, etc.
}

interface UploadUrlResponse {
  signedUrl: string;
  path: string;        // Chemin relatif dans le bucket
  expiresAt: string;   // ISO 8601
}

@Injectable()
export class MediaService {
  private supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  private readonly ALLOWED_IMAGE_TYPES = [
    'image/jpeg', 'image/png', 'image/webp',
  ];
  private readonly ALLOWED_DOC_TYPES = [
    'image/jpeg', 'image/png', 'application/pdf',
  ];

  async generateUploadUrl(
    userId: string,
    request: UploadUrlRequest,
  ): Promise<UploadUrlResponse> {
    // 1. Valider le content-type
    const allowedTypes = request.bucket === 'documents'
      ? this.ALLOWED_DOC_TYPES
      : this.ALLOWED_IMAGE_TYPES;

    if (!allowedTypes.includes(request.contentType)) {
      throw new BadRequestException(
        `Type de fichier non autorise : ${request.contentType}`,
      );
    }

    // 2. Construire le chemin de stockage
    //    Structure : {entityId}/{timestamp}-{random}.{ext}
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const path = `${request.entityId}/${timestamp}-${random}.${request.fileExtension}`;

    // 3. Generer le signed URL (valide 5 minutes)
    const { data, error } = await this.supabaseAdmin.storage
      .from(request.bucket)
      .createSignedUploadUrl(path, {
        upsert: false,
      });

    if (error) {
      throw new BadRequestException(`Erreur generation URL : ${error.message}`);
    }

    return {
      signedUrl: data.signedUrl,
      path,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    };
  }
}
```

### 2.4 Etape 3 -- Validation cote serveur

Apres l'upload, un job de validation est declenche. Meme si la compression et le filtrage sont faits cote client, on ne peut **jamais faire confiance au client** (cf. ADR-022, A04 Insecure Design).

**Declenchement :** Supabase Storage webhook ou interrogation periodique via un endpoint NestJS appele par Flutter apres l'upload.

**Validations :**

| Verification | Methode | Seuil | Action si echec |
|-------------|---------|-------|-----------------|
| **Type MIME reel** | Magic bytes via `file-type` (Node.js) | Whitelist par bucket (voir ci-dessus) | Suppression du fichier + erreur 400 |
| **Taille max** | `Content-Length` header + verification post-upload | Images : 5 MB, Documents : 10 MB | Suppression du fichier + erreur 413 |
| **Dimensions** | `sharp` metadata | Max 5000x5000 px (protection decompression bomb) | Suppression du fichier + erreur 400 |
| **Scan antimalware** | ClamAV (self-hosted dans Docker) ou ClamScan cloud | Aucun virus detecte | Suppression + alerte admin |

**Implementation du job de validation (BullMQ) :**

```typescript
// media-validation.processor.ts

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import sharp from 'sharp';
import { fileTypeFromBuffer } from 'file-type';

interface MediaValidationJob {
  bucket: string;
  path: string;
  userId: string;
  expectedContentType: string;
  maxSizeBytes: number;
}

@Processor('media-validation')
export class MediaValidationProcessor extends WorkerHost {
  async process(job: Job<MediaValidationJob>): Promise<void> {
    const { bucket, path, userId, expectedContentType, maxSizeBytes } = job.data;

    // 1. Telecharger le fichier depuis Supabase Storage
    const { data, error } = await this.supabaseAdmin.storage
      .from(bucket)
      .download(path);

    if (error || !data) {
      throw new Error(`Impossible de telecharger ${bucket}/${path}`);
    }

    const buffer = Buffer.from(await data.arrayBuffer());

    // 2. Verifier la taille
    if (buffer.length > maxSizeBytes) {
      await this.deleteAndNotify(bucket, path, userId, 'Fichier trop volumineux');
      return;
    }

    // 3. Verifier le type MIME reel (magic bytes, pas l'extension)
    const detectedType = await fileTypeFromBuffer(buffer);
    if (!detectedType || detectedType.mime !== expectedContentType) {
      await this.deleteAndNotify(bucket, path, userId,
        `Type MIME invalide : attendu ${expectedContentType}, detecte ${detectedType?.mime}`);
      return;
    }

    // 4. Verifier les dimensions (images uniquement)
    if (detectedType.mime.startsWith('image/')) {
      const metadata = await sharp(buffer).metadata();
      if ((metadata.width ?? 0) > 5000 || (metadata.height ?? 0) > 5000) {
        await this.deleteAndNotify(bucket, path, userId,
          'Image trop grande (max 5000x5000 px)');
        return;
      }
    }

    // 5. Scan antimalware (ClamAV)
    const isMalware = await this.scanWithClamAV(buffer);
    if (isMalware) {
      await this.deleteAndNotify(bucket, path, userId, 'Malware detecte');
      // Alerte admin immediat
      await this.alertAdmin(bucket, path, userId);
      return;
    }

    // 6. Validation OK -> declencher la generation de thumbnails
    await this.thumbnailQueue.add('generate-thumbnails', {
      bucket,
      path,
      buffer: buffer.toString('base64'),
    });
  }
}
```

### 2.5 Etape 4 -- Generation de variantes (thumbnails)

Les thumbnails sont pre-calcules pour eviter les transformations a la volee (couteux en CPU et en latence). La generation est asynchrone via un job BullMQ, qui n'impacte pas le temps de reponse de l'upload.

**Variantes generees :**

| Variante | Dimensions | Usage | Qualite |
|----------|-----------|-------|---------|
| **thumb** | 150x150 (crop centre) | Avatars, miniatures dans les listes | WebP 75% |
| **card** | 400x300 (crop centre) | Cards de paniers, cards de boutiques | WebP 80% |
| **detail** | 800x600 (fit, fond blanc si ratio different) | Vue detail panier, vue detail boutique | WebP 85% |

**Convention de nommage :**

```
{bucket}/{entityId}/{timestamp}-{random}.webp          <- original (compresse client)
{bucket}/{entityId}/{timestamp}-{random}_thumb.webp     <- 150x150
{bucket}/{entityId}/{timestamp}-{random}_card.webp      <- 400x300
{bucket}/{entityId}/{timestamp}-{random}_detail.webp    <- 800x600
```

**Implementation (sharp dans BullMQ worker) :**

```typescript
// thumbnail-generator.processor.ts

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import sharp from 'sharp';

interface ThumbnailJob {
  bucket: string;
  path: string;
  buffer: string; // base64
}

const VARIANTS = [
  { suffix: '_thumb',  width: 150, height: 150, fit: 'cover' as const,   quality: 75 },
  { suffix: '_card',   width: 400, height: 300, fit: 'cover' as const,   quality: 80 },
  { suffix: '_detail', width: 800, height: 600, fit: 'inside' as const,  quality: 85 },
];

@Processor('thumbnail-generation')
export class ThumbnailGeneratorProcessor extends WorkerHost {
  async process(job: Job<ThumbnailJob>): Promise<void> {
    const { bucket, path, buffer: base64Buffer } = job.data;
    const buffer = Buffer.from(base64Buffer, 'base64');

    const basePath = path.replace(/\.[^.]+$/, ''); // Retirer l'extension

    // Generer le blurhash de l'image originale
    const blurhash = await this.generateBlurhash(buffer);

    // Generer chaque variante
    for (const variant of VARIANTS) {
      const resized = await sharp(buffer)
        .resize(variant.width, variant.height, { fit: variant.fit })
        .webp({ quality: variant.quality })
        .toBuffer();

      const variantPath = `${basePath}${variant.suffix}.webp`;

      await this.supabaseAdmin.storage
        .from(bucket)
        .upload(variantPath, resized, {
          contentType: 'image/webp',
          upsert: true,
        });
    }

    // Sauvegarder le blurhash en base de donnees
    await this.prisma.media.update({
      where: { storagePath: path },
      data: {
        blurhash,
        status: 'READY', // L'image est prete a etre affichee
        variants: {
          thumb: `${basePath}_thumb.webp`,
          card: `${basePath}_card.webp`,
          detail: `${basePath}_detail.webp`,
        },
      },
    });
  }

  private async generateBlurhash(buffer: Buffer): Promise<string> {
    // Resize a une petite taille pour le calcul du blurhash
    const { data, info } = await sharp(buffer)
      .raw()
      .ensureAlpha()
      .resize(32, 32, { fit: 'inside' })
      .toBuffer({ resolveWithObject: true });

    // Utiliser le package 'blurhash' pour encoder
    const { encode } = await import('blurhash');
    return encode(new Uint8ClampedArray(data), info.width, info.height, 4, 3);
  }
}
```

---

## 3. Stockage

### 3.1 Organisation des buckets Supabase Storage

Supabase Storage est S3-compatible. Les fichiers sont organises en buckets thematiques avec des niveaux d'acces distincts.

| Bucket | Visibilite | Contenu | Politique d'acces |
|--------|-----------|---------|-------------------|
| **`baskets`** | Public | Photos de paniers (originaux + variantes) | Lecture : tous. Ecriture : partenaire proprietaire du panier. |
| **`profiles`** | Public | Photos de profil (consumer + partner) | Lecture : tous. Ecriture : l'utilisateur proprietaire. |
| **`stores`** | Public | Logos et photos de boutiques | Lecture : tous. Ecriture : partenaire proprietaire de la boutique. |
| **`documents`** | **Prive** | Justificatifs partenaire (patente, certificat d'hygiene, BRN) | Lecture : le partenaire proprietaire + admins. Ecriture : le partenaire proprietaire. |
| **`disputes`** | **Prive** | Photos de preuve (reclamations) | Lecture : les parties de la dispute + admins. Ecriture : consumer ou partenaire implique. |
| **`marketing`** | Public | Images marketing (site vitrine, notifications) | Lecture : tous. Ecriture : admins uniquement. |

### 3.2 Policies RLS sur les buckets

Supabase Storage utilise des policies RLS sur la table interne `storage.objects` pour controler l'acces.

```sql
-- Bucket 'baskets' : lecture publique, ecriture par le partenaire proprietaire
CREATE POLICY "baskets_public_read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'baskets');

CREATE POLICY "baskets_partner_write" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'baskets'
    AND (storage.foldername(name))[1] IN (
      SELECT b.id::text FROM baskets b
      JOIN stores s ON b.store_id = s.id
      WHERE s.partner_id = auth.uid()
    )
  );

-- Bucket 'profiles' : lecture publique, ecriture par le proprietaire
CREATE POLICY "profiles_public_read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'profiles');

CREATE POLICY "profiles_owner_write" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'profiles'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Bucket 'stores' : lecture publique, ecriture par le partenaire proprietaire
CREATE POLICY "stores_public_read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'stores');

CREATE POLICY "stores_partner_write" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'stores'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM stores WHERE partner_id = auth.uid()
    )
  );

-- Bucket 'documents' : PRIVE -- lecture par le proprietaire et les admins
CREATE POLICY "documents_owner_read" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR is_admin(auth.jwt())
    )
  );

CREATE POLICY "documents_owner_write" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Bucket 'marketing' : lecture publique, ecriture admin uniquement
CREATE POLICY "marketing_public_read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'marketing');

CREATE POLICY "marketing_admin_write" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'marketing'
    AND is_admin(auth.jwt())
  );
```

### 3.3 Structure de chemin dans les buckets

```
baskets/
  {basketId}/
    {timestamp}-{random}.webp           # Original compresse
    {timestamp}-{random}_thumb.webp     # 150x150
    {timestamp}-{random}_card.webp      # 400x300
    {timestamp}-{random}_detail.webp    # 800x600

profiles/
  {userId}/
    avatar.webp                         # Original
    avatar_thumb.webp                   # 150x150

stores/
  {storeId}/
    logo.webp                           # Logo original
    logo_thumb.webp                     # 150x150
    photo-{n}-{timestamp}.webp          # Photos de boutique
    photo-{n}-{timestamp}_card.webp
    photo-{n}-{timestamp}_detail.webp

documents/
  {partnerId}/
    patente-{timestamp}.pdf
    certificat-hygiene-{timestamp}.pdf
    brn-{timestamp}.jpg

disputes/
  {disputeId}/
    proof-{n}-{timestamp}.webp

marketing/
  campaigns/
    {campaignId}-{timestamp}.webp
  banners/
    {bannerId}-{timestamp}.webp
```

### 3.4 Politique de retention

| Type de media | Retention | Justification | Implementation |
|--------------|-----------|---------------|----------------|
| **Photos de paniers** | Indefinie (tant que le panier existe) | Historique des commandes visible par le consumer | Suppression en cascade avec le panier (soft delete) |
| **Photos de profil** | Jusqu'a suppression du compte | RGPD / Data Protection Act | Suppression a la demande (droit a l'oubli) |
| **Photos de boutique** | Indefinie (tant que la boutique existe) | Contenu public marketing | Suppression en cascade avec la boutique |
| **Justificatifs partenaire** | **90 jours apres approbation** | Les documents ne sont necessaires que pendant la verification. Retenir 90 jours pour d'eventuelles contestations. | Job CRON BullMQ hebdomadaire |
| **Photos de preuve (disputes)** | **1 an apres resolution** | Conservation pour d'eventuels recours ou audits | Job CRON BullMQ mensuel |
| **Images marketing** | Indefinie | Contenu gere par l'admin | Suppression manuelle |

**Job de nettoyage (retention) :**

```typescript
// media-cleanup.service.ts

import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class MediaCleanupService {
  @Cron(CronExpression.EVERY_WEEK)
  async cleanupExpiredDocuments(): Promise<void> {
    // Supprimer les justificatifs approuves depuis plus de 90 jours
    const expiredDocs = await this.prisma.partnerDocument.findMany({
      where: {
        status: 'APPROVED',
        approvedAt: {
          lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        },
        storagePath: { not: null },
      },
    });

    for (const doc of expiredDocs) {
      await this.supabaseAdmin.storage
        .from('documents')
        .remove([doc.storagePath]);

      await this.prisma.partnerDocument.update({
        where: { id: doc.id },
        data: { storagePath: null, deletedAt: new Date() },
      });
    }

    this.logger.log(`Nettoyage : ${expiredDocs.length} documents expires supprimes`);
  }

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async cleanupExpiredDisputeProofs(): Promise<void> {
    // Supprimer les photos de preuve des disputes resolues depuis plus d'1 an
    const expiredProofs = await this.prisma.disputeProof.findMany({
      where: {
        dispute: {
          status: 'RESOLVED',
          resolvedAt: {
            lt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
          },
        },
        storagePath: { not: null },
      },
    });

    for (const proof of expiredProofs) {
      await this.supabaseAdmin.storage
        .from('disputes')
        .remove([proof.storagePath]);

      await this.prisma.disputeProof.update({
        where: { id: proof.id },
        data: { storagePath: null, deletedAt: new Date() },
      });
    }

    this.logger.log(`Nettoyage : ${expiredProofs.length} photos de preuve expirees supprimees`);
  }
}
```

---

## 4. CDN et delivery

### 4.1 Architecture de delivery

```
 App Flutter (consumer/partner)
         |
         | HTTPS
         v
 +---------------------------+
 | Cloudflare CDN            |   PoP Johannesburg/Cape Town (~40-60 ms depuis Maurice)
 | (plan Free, cf. ADR-020)  |
 |                           |
 |  Cache hit?               |
 |  +-- Oui --> Retourne     |   Latence : 40-60 ms
 |  |          le contenu    |
 |  |          cache         |
 |  |                        |
 |  +-- Non --> Proxy vers   |   Latence supplementaire : 60-80 ms
 |              Supabase     |
 |              Storage      |
 |              (Singapour)  |
 +---------------------------+
         |
         v
 Supabase Storage
 (ap-southeast-1, Singapour)
```

### 4.2 Strategie de cache Cloudflare

| Type de contenu | Cache-Control header | TTL Cloudflare | Justification |
|----------------|---------------------|----------------|---------------|
| **Images publiques** (paniers, boutiques, profils, marketing) | `public, max-age=2592000, immutable` | 30 jours | Les images sont immutables (nommees par timestamp). Un changement d'image = nouvelle URL. |
| **Thumbnails** | `public, max-age=2592000, immutable` | 30 jours | Idem -- immuables par convention de nommage. |
| **Documents prives** (justificatifs, preuves) | `private, no-store, no-cache` | Pas de cache | Documents sensibles -- ne doivent jamais etre caches sur un CDN partage. |

**Configuration Cloudflare (Page Rules ou Cache Rules) :**

| Regle | Condition | Action |
|-------|-----------|--------|
| Cache images publiques | URL match `media.bienbon.mu/baskets/*`, `media.bienbon.mu/stores/*`, `media.bienbon.mu/profiles/*`, `media.bienbon.mu/marketing/*` | Cache Level: Cache Everything, Edge TTL: 30 days |
| Pas de cache documents | URL match `media.bienbon.mu/documents/*`, `media.bienbon.mu/disputes/*` | Cache Level: Bypass |

### 4.3 Image transformations : pre-calculees vs a la volee

**Decision : thumbnails pre-calcules (via sharp/BullMQ)**

| Option | Avantages | Inconvenients | Cout |
|--------|-----------|---------------|------|
| **Cloudflare Images (a la volee)** | Pas de stockage des variantes, transformations flexibles | 5 USD/mois pour 5 000 images uniques. Latence de transformation au premier appel. | 5-20 USD/mois |
| **Thumbnails pre-calcules (sharp)** | Zero cout de transformation en runtime. Cache CDN maximal. Pas de dependance a Cloudflare Images. | Stockage supplementaire (~3x par image). Temps de generation asynchrone. | 0 USD (sharp gratuit) |

**Justification du choix pre-calcule :**

1. **Budget** : au lancement, le volume est faible. Le stockage supplementaire (~3x) coute moins cher que l'abonnement Cloudflare Images.
2. **Performance** : chaque variante est pre-calculee et cachee sur le CDN. Aucune latence de transformation.
3. **Simplicite** : pas de configuration Cloudflare Images, pas de worker. Sharp tourne dans le meme runtime Node.js que le backend.
4. **Migration possible** : si le volume augmente et que le stockage devient couteux, migrer vers Cloudflare Images ou Cloudflare Workers avec `cf-image-resizing` est faisable sans changer les URLs (redirection).

### 4.4 URLs signees pour les documents prives

Les documents sensibles (justificatifs partenaire, photos de preuve) ne sont **jamais** accessibles via une URL publique. L'acces se fait via des signed URLs a duree de vie courte.

```typescript
// media.service.ts

async getPrivateDocumentUrl(
  userId: string,
  documentPath: string,
  bucket: 'documents' | 'disputes',
): Promise<string> {
  // 1. Verifier que l'utilisateur a le droit d'acceder a ce document
  //    (ownership check ou role admin -- cf. ADR-022, A01)
  await this.checkDocumentAccess(userId, documentPath, bucket);

  // 2. Generer un signed URL valide 15 minutes
  const { data, error } = await this.supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(documentPath, 15 * 60); // 15 minutes

  if (error) {
    throw new BadRequestException(`Erreur acces document : ${error.message}`);
  }

  return data.signedUrl;
}
```

### 4.5 Delivery cote Flutter

**Package recommande :** `cached_network_image` pour le caching local et le chargement progressif.

**Bonnes pratiques Flutter :**

| Technique | Implementation | Impact |
|-----------|---------------|--------|
| **Lazy loading** | `CachedNetworkImage` avec `placeholder` | Les images hors ecran ne sont pas telecharger |
| **Blurhash placeholder** | `FlutterBlurhash` widget comme placeholder | Affichage instantane d'un apercu flou pendant le chargement |
| **Progressive loading** | Charger `_thumb` d'abord, puis `_card` ou `_detail` | Affichage rapide, detail progressif |
| **Prefetch** | Prefetch les `_detail` des 3 premiers items quand l'utilisateur scrolle la liste | Transition liste -> detail sans chargement |
| **Cache disk** | `cached_network_image` cache automatiquement (configurable, defaut 7 jours) | Pas de re-telechargement des images deja vues |

**Implementation Flutter :**

```dart
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter_blurhash/flutter_blurhash.dart';

class BasketCardImage extends StatelessWidget {
  final String imageUrl;     // URL de la variante _card
  final String? blurhash;    // Blurhash stocke en DB, recupere avec les donnees du panier

  const BasketCardImage({
    required this.imageUrl,
    this.blurhash,
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    return CachedNetworkImage(
      imageUrl: imageUrl,
      placeholder: (context, url) => blurhash != null
          ? BlurHash(hash: blurhash!)
          : const Center(child: CircularProgressIndicator()),
      errorWidget: (context, url, error) => const Icon(Icons.broken_image),
      fit: BoxFit.cover,
      fadeInDuration: const Duration(milliseconds: 200),
      // Headers : pas necessaire pour les images publiques
      // Pour les documents prives, le signed URL contient deja l'auth
    );
  }
}
```

---

## 5. Securite

### 5.1 Scan antimalware

**Ref ADR-022, section 2.10 (A10 -- SSRF) et A04 (Insecure Design).**

Les fichiers uploades par les utilisateurs sont un vecteur d'attaque classique. Meme si seuls des images et des PDF sont acceptes, un fichier malveillant peut etre deguise.

**Options evaluees :**

| Option | Cout | Integration | Latence scan |
|--------|------|------------|-------------|
| **ClamAV (self-hosted dans Docker)** | 0 USD (open-source) | Container sidecar, socket Unix ou TCP | 100-500 ms |
| **VirusTotal API** | Gratuit (4 scans/min), 40 USD/mois (premium) | API REST | 1-5 s |
| **Cloudflare R2 + Workers** | Complexe a integrer | -- | -- |

**Decision : ClamAV self-hosted dans un container Docker (Railway)**

- Zero cout, integre au meme projet Railway que le backend
- Scan synchrone via `clamav-client` (Node.js) dans le job BullMQ de validation
- Les signatures antivirus sont mises a jour automatiquement (`freshclam` daemon)
- Suffisant pour detecter les malwares classiques deguises en images/PDF

**Configuration Docker Compose (developpement local) / service Railway :**

```yaml
# docker-compose.yml (dev local)
services:
  clamav:
    image: clamav/clamav:1.4
    ports:
      - "3310:3310"
    volumes:
      - clamav-db:/var/lib/clamav
    healthcheck:
      test: ["CMD", "clamdscan", "--ping", "3"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  clamav-db:
```

### 5.2 Stripping des metadonnees EXIF

**Risque** : les photos prises avec un smartphone contiennent des metadonnees EXIF qui incluent :
- Coordonnees GPS (localisation exacte du partenaire ou du consumer)
- Modele de telephone, version OS
- Date et heure exactes de la prise de vue
- Orientation, parametres de l'appareil photo

Ces informations sont un risque pour la vie privee, en particulier pour les photos de paniers (localisation du commerce) et les justificatifs (localisation du partenaire).

**Strategie de stripping a deux niveaux :**

| Niveau | Ou | Comment | Couverture |
|--------|-----|---------|-----------|
| **Client (Flutter)** | Avant upload | `flutter_image_compress` avec `keepExif: false` | 99% des cas (sauf si le client est modifie) |
| **Serveur (NestJS)** | Job de validation BullMQ | `sharp` avec `.rotate()` (applique l'orientation EXIF puis supprime les metadonnees) | 100% -- filet de securite |

```typescript
// Dans le job de validation, apres les verifications
const cleanedBuffer = await sharp(buffer)
  .rotate() // Applique l'orientation EXIF avant de la supprimer
  .withMetadata({ exif: undefined }) // Supprime toutes les metadonnees EXIF
  .toBuffer();

// Reecrire le fichier nettoye dans Supabase Storage
await this.supabaseAdmin.storage
  .from(bucket)
  .update(path, cleanedBuffer, {
    contentType: detectedType.mime,
    upsert: true,
  });
```

### 5.3 Validation Content-Type

**Ref ADR-022, section 3.4 (File Upload Validation).**

La validation du type de fichier ne doit **jamais** se baser sur l'extension ou le header `Content-Type` envoye par le client (facilement falsifiable). La verification repose sur les **magic bytes** (premiers octets du fichier).

| Format | Magic bytes (hex) | MIME type |
|--------|-------------------|-----------|
| JPEG | `FF D8 FF` | `image/jpeg` |
| PNG | `89 50 4E 47` | `image/png` |
| WebP | `52 49 46 46 ... 57 45 42 50` | `image/webp` |
| PDF | `25 50 44 46` | `application/pdf` |

**Regles par bucket :**

| Bucket | Types autorises | Taille max |
|--------|----------------|-----------|
| `baskets` | JPEG, PNG, WebP | 5 MB |
| `profiles` | JPEG, PNG, WebP | 5 MB |
| `stores` | JPEG, PNG, WebP | 5 MB |
| `documents` | JPEG, PNG, PDF | 10 MB |
| `disputes` | JPEG, PNG, WebP | 5 MB |
| `marketing` | JPEG, PNG, WebP, SVG | 5 MB |

### 5.4 Rate limiting uploads

**Ref ADR-022, section 4.3 (Rate limiting par type d'endpoint).**

| Endpoint | Limite | TTL | Justification |
|----------|--------|-----|---------------|
| `POST /api/v1/media/upload-url` | **10 requetes** | **1 minute** | Prevenir le remplissage du storage. Un partenaire uploade typiquement 1-5 photos par panier, quelques fois par jour. 10/min est genereux. |
| `POST /api/v1/media/upload-url` (bucket `documents`) | **5 requetes** | **5 minutes** | Les justificatifs sont uploades une seule fois lors de l'inscription. |

```typescript
// media.controller.ts

@Controller('media')
export class MediaController {
  @Post('upload-url')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: seconds(60) } })
  async getUploadUrl(
    @CurrentUser() user: AuthUser,
    @Body() dto: GetUploadUrlDto,
  ): Promise<UploadUrlResponse> {
    return this.mediaService.generateUploadUrl(user.id, dto);
  }
}
```

### 5.5 Protection contre les decompression bombs

Une "decompression bomb" est un fichier image volontairement concu pour consommer une quantite enorme de memoire lors du decodage (ex: un PNG de 1x1 px qui decompresse en une image de 100 000 x 100 000 px).

**Mitigations :**

| Mitigation | Implementation |
|-----------|---------------|
| Limite de dimensions | `sharp` verifie `width` et `height` avant traitement (max 5000x5000) |
| Limite de taille fichier | 5 MB images, 10 MB documents -- verifie avant telechargement |
| Limite memoire sharp | `sharp.concurrency(1)` + `sharp.cache(false)` en production pour limiter la consommation memoire |
| Timeout job BullMQ | Timeout de 30 secondes par job de validation/thumbnail |

---

## 6. Performance

### 6.1 Blurhash (placeholder instantane)

Le blurhash est une representation compacte (20-30 caracteres) d'une image floue. Il est stocke en base de donnees avec les metadonnees de l'image et permet un affichage instantane pendant le chargement.

**Schema DB (table `media`) :**

```sql
CREATE TABLE media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(20) NOT NULL,    -- 'basket', 'store', 'profile', 'dispute', 'marketing'
  entity_id UUID NOT NULL,              -- ID de l'entite associee
  bucket VARCHAR(20) NOT NULL,          -- Nom du bucket Supabase
  storage_path TEXT NOT NULL,           -- Chemin dans le bucket (original)
  content_type VARCHAR(50) NOT NULL,    -- MIME type valide
  size_bytes INTEGER NOT NULL,          -- Taille du fichier original
  width INTEGER,                        -- Largeur originale (px)
  height INTEGER,                       -- Hauteur originale (px)
  blurhash VARCHAR(50),                 -- Blurhash encode
  variants JSONB DEFAULT '{}',          -- { "thumb": "...", "card": "...", "detail": "..." }
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, PROCESSING, READY, FAILED, DELETED
  sort_order SMALLINT DEFAULT 0,        -- Ordre d'affichage (pour les photos de paniers/boutiques)
  uploaded_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ                -- Soft delete
);

-- Index pour les requetes de listing
CREATE INDEX idx_media_entity ON media(entity_type, entity_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_media_status ON media(status) WHERE status != 'READY';
```

**Flux d'affichage :**

```
1. API retourne la liste de paniers
   -> Chaque panier inclut : imageUrl (variante _card), blurhash

2. Flutter affiche le blurhash instantanement (decode local, ~1 ms)

3. CachedNetworkImage charge l'image depuis le CDN
   -> Cache hit Cloudflare : 40-60 ms
   -> Cache miss : 120-200 ms

4. L'image remplace le blurhash avec un fade-in de 200 ms
```

### 6.2 Prefetch des images

Quand l'utilisateur consulte la liste des paniers, les images `_detail` des 3-5 premiers paniers sont prefetchees en arriere-plan. Ainsi, quand l'utilisateur tape sur un panier, l'image detail est deja en cache local.

```dart
// basket_list_screen.dart

void _prefetchDetailImages(List<Basket> baskets) {
  for (final basket in baskets.take(5)) {
    if (basket.imageDetailUrl != null) {
      precacheImage(
        CachedNetworkImageProvider(basket.imageDetailUrl!),
        context,
      );
    }
  }
}
```

### 6.3 Optimisation pour le reseau mauricien

Le reseau mobile a Maurice varie entre 3G (~2-5 Mbps) et 4G (~10-50 Mbps). Les optimisations suivantes ciblent le bas debit.

| Technique | Implementation | Impact |
|-----------|---------------|--------|
| **Compression agressive cote client** | WebP 80%, max 1200px | Fichiers de 150-400 KB au lieu de 3-6 MB |
| **Thumbnails pre-calcules** | `_thumb` (150x150, ~5-15 KB), `_card` (400x300, ~20-50 KB) | Chargement rapide des listes |
| **CDN Cloudflare** | Cache 30 jours, PoP Afrique du Sud | Images servies depuis un PoP proche (~40-60 ms) |
| **Lazy loading** | Images hors ecran non chargees | Economie de bande passante |
| **Format WebP** | 25-35% plus leger que JPEG a qualite equivalente | Moins de donnees transferees |
| **Blurhash** | Apercu instantane sans reseau | Perception de rapidite, meme sur 3G |
| **Cache disk Flutter** | `cached_network_image` (7 jours defaut) | Pas de re-telechargement |

**Estimation de bande passante pour une session typique :**

| Action | Donnees transferees (estime) | Temps sur 3G (3 Mbps) | Temps sur 4G (20 Mbps) |
|--------|------------------------------|----------------------|----------------------|
| Charger la liste (10 paniers, `_card`) | 10 x 35 KB = 350 KB | ~1 s | ~0.15 s |
| Ouvrir un detail (1 image `_detail`) | 80 KB | ~0.2 s | ~0.03 s |
| Charger une page boutique (5 photos `_card`) | 5 x 35 KB = 175 KB | ~0.5 s | ~0.07 s |
| Upload 1 photo panier (post-compression) | 300 KB | ~0.8 s | ~0.12 s |

---

## 7. Couts

### 7.1 Supabase Storage pricing

| Composant | Gratuit (plan Free) | Plan Pro (25 USD/mois) | Cout supplementaire |
|-----------|--------------------|-----------------------|---------------------|
| **Stockage** | 1 GB | 100 GB | 0.021 USD/GB/mois |
| **Bande passante** | 2 GB/mois | 200 GB/mois | 0.09 USD/GB |
| **Uploads** | Illimites | Illimites | -- |
| **Image transformations** | Pas inclus (plan Free) | 100 origin images | 5 USD / 1 000 origin images |

> **Note** : BienBon utilise Supabase Pro (25 USD/mois, cf. ADR-020) pour le PostgreSQL manage. Le Storage est inclus dans ce plan.

### 7.2 Estimation par phase

#### Phase 1 -- Lancement (< 100 utilisateurs, 10-20 partenaires)

| Poste | Volume estime | Cout |
|-------|--------------|------|
| Stockage images (originaux + variantes) | 200 MB - 1 GB | **Inclus** dans Supabase Pro (100 GB) |
| Bande passante images | ~5-20 GB/mois | **Inclus** dans Supabase Pro (200 GB/mois). Essentiel : Cloudflare CDN reduit la bande passante Supabase de 60-80% grace au cache. |
| ClamAV (Railway) | 1 container, ~200 MB RAM | ~3-5 USD/mois (usage Railway) |
| sharp (dans le worker BullMQ) | Inclus dans le worker existant | 0 USD supplementaire |
| **Total media** | | **~3-5 USD/mois** (ClamAV uniquement) |

#### Phase 2 -- Croissance (1 000 utilisateurs, 50-100 partenaires)

| Poste | Volume estime | Cout |
|-------|--------------|------|
| Stockage images | 2-8 GB | **Inclus** dans Supabase Pro |
| Bande passante images | ~50-200 GB/mois (avant CDN), ~10-60 GB/mois (apres CDN cache) | **Inclus** dans Supabase Pro. Si depassement : 0.09 USD/GB. |
| ClamAV (Railway) | Meme container | ~3-5 USD/mois |
| **Total media** | | **~3-10 USD/mois** |

#### Phase 3 -- Maturite (10 000 utilisateurs, 200-500 partenaires)

| Poste | Volume estime | Cout |
|-------|--------------|------|
| Stockage images | 20-60 GB | **Inclus** dans Supabase Pro (100 GB). Si depassement : 0.021 USD/GB/mois. |
| Bande passante images | ~500-2 000 GB/mois (avant CDN), ~100-500 GB/mois (apres CDN) | Supabase Pro (200 GB inclus) + supplementaire : 0.09 USD/GB. Cout : 0-27 USD/mois. |
| ClamAV | Meme container | ~3-5 USD/mois |
| Migration Cloudflare Images (optionnel) | Si les thumbnails pre-calcules deviennent trop couteux en stockage | 5-20 USD/mois |
| **Total media** | | **~8-52 USD/mois** |

### 7.3 Optimisations de cout

| Optimisation | Impact | Effort |
|-------------|--------|--------|
| **Cloudflare CDN** (deja prevu, ADR-020) | Reduit la bande passante Supabase de 60-80% | 0 (deja configure) |
| **Compression client aggressive** (WebP 80%, 1200px) | Reduit la taille de stockage de ~90% par rapport aux originaux | Faible (integration Flutter) |
| **Retention documents** (90 jours) | Evite l'accumulation de justificatifs obsoletes | Faible (CRON BullMQ) |
| **Migration vers Cloudflare R2** (si Supabase trop cher en phase 3) | R2 : 0 USD en bande passante egress (gratuit), 0.015 USD/GB/mois en stockage | Moyen (changement de SDK + migration) |

---

## 8. Modele de donnees

### 8.1 Table `media`

Voir la definition SQL complete en section 6.1. Relations avec les entites metier :

```
media.entity_type + media.entity_id  -->  baskets.id / stores.id / users.id / disputes.id
media.uploaded_by                    -->  users.id
```

### 8.2 Etats du media (state machine)

```
  PENDING -----> PROCESSING -----> READY
     |               |
     |               v
     +---------> FAILED
                    |
                    v (apres 7 jours ou manuellement)
                 DELETED
```

| Etat | Description | Duree typique |
|------|-------------|---------------|
| **PENDING** | Fichier uploade dans Supabase Storage, job de validation en attente | < 1 min |
| **PROCESSING** | Validation en cours (MIME, taille, antimalware, thumbnails) | 5-30 s |
| **READY** | Toutes les variantes generees, blurhash calcule. Image prete a afficher. | Etat final |
| **FAILED** | La validation a echoue (mauvais type, malware, etc.). Le fichier est supprime. | Temporaire |
| **DELETED** | Supprime (retention expiree ou demande manuelle) | Etat final |

---

## 9. Plan d'implementation

### Phase 1 -- Fondations (Sprint 1-2)

| Tache | Priorite | Effort |
|-------|----------|--------|
| Creer les buckets Supabase Storage (baskets, profiles, stores, documents, disputes, marketing) | P0 | 0.5j |
| Configurer les policies RLS sur les buckets | P0 | 1j |
| Implementer le `MediaService` (generation signed URLs) | P0 | 1j |
| Implementer le `MediaController` avec rate limiting | P0 | 0.5j |
| Creer la table `media` en DB (migration Prisma) | P0 | 0.5j |
| Implementer la compression cote client Flutter (`ImageCompressor`) | P0 | 1j |
| Implementer l'upload via signed URL dans Flutter | P0 | 1j |

### Phase 2 -- Validation et thumbnails (Sprint 2-3)

| Tache | Priorite | Effort |
|-------|----------|--------|
| Implementer le job BullMQ de validation (`MediaValidationProcessor`) | P0 | 2j |
| Implementer le job BullMQ de generation de thumbnails (`ThumbnailGeneratorProcessor`) | P0 | 1.5j |
| Integrer le blurhash (generation serveur + affichage Flutter) | P1 | 1j |
| Deployer ClamAV sur Railway | P1 | 0.5j |
| Implementer le stripping EXIF cote serveur | P0 | 0.5j |

### Phase 3 -- CDN et performance (Sprint 3-4)

| Tache | Priorite | Effort |
|-------|----------|--------|
| Configurer le custom domain `media.bienbon.mu` sur Cloudflare vers Supabase Storage | P0 | 0.5j |
| Configurer les Cache Rules Cloudflare (public vs prive) | P0 | 0.5j |
| Implementer les signed URLs pour les documents prives | P0 | 1j |
| Implementer le prefetch d'images dans Flutter | P1 | 0.5j |
| Implementer `BasketCardImage` avec blurhash + CachedNetworkImage | P1 | 0.5j |

### Phase 4 -- Nettoyage et retention (Sprint 4-5)

| Tache | Priorite | Effort |
|-------|----------|--------|
| Implementer le job CRON de nettoyage des documents expires | P1 | 1j |
| Implementer le job CRON de nettoyage des preuves de dispute | P1 | 0.5j |
| Tests e2e du pipeline complet (upload -> validation -> thumbnail -> display) | P0 | 2j |
| Monitoring : dashboard Grafana pour les metriques media (uploads/jour, taille moyenne, erreurs) | P2 | 1j |

---

## 10. Consequences

### Positives

1. **Upload rapide** : la compression cote client reduit la taille des fichiers de ~90%, rendant l'upload rapide meme sur les reseaux 3G mauriciens. Un partenaire uploade une photo de panier en < 1 seconde sur 4G.

2. **Affichage instantane** : le blurhash offre un apercu visuel immediat, et les thumbnails pre-calcules + CDN Cloudflare garantissent un chargement en 40-200 ms. L'experience utilisateur est fluide.

3. **Securite des documents sensibles** : les justificatifs partenaire sont dans un bucket prive, accessibles uniquement via signed URLs temporaires, avec scan antimalware et stripping EXIF. Conformite avec les standards OWASP (ADR-022).

4. **Cout maitrise** : au lancement, le pipeline media coute ~3-5 USD/mois (uniquement ClamAV). Le stockage et la bande passante sont inclus dans le plan Supabase Pro existant. Meme en phase de maturite, le cout reste sous 52 USD/mois.

5. **Retention automatique** : les documents sensibles sont automatiquement supprimes apres expiration (90 jours justificatifs, 1 an preuves), conformement au principe de minimisation des donnees (Data Protection Act, ADR-021).

### Negatives

1. **Stockage supplementaire** : les thumbnails pre-calcules triplent le volume de stockage par image. A 60 GB en phase de maturite, cela reste dans les limites du plan Supabase Pro (100 GB), mais une migration vers Cloudflare Images ou R2 pourrait etre necessaire au-dela.

2. **Latence de traitement** : entre l'upload et l'etat `READY` (thumbnails generes, blurhash calcule), il y a un delai de 5-30 secondes. Pendant ce temps, l'image n'est pas affichable dans sa version optimale. Mitigation : afficher l'image originale compressees cote client en attendant.

3. **Complexite du pipeline** : le flux upload -> validation -> thumbnail -> blurhash implique 3 jobs BullMQ asynchrones. Le debugging des echecs de pipeline necessite un monitoring dedie (logs structures, dashboard Grafana).

4. **ClamAV consomme de la RAM** : le container ClamAV necessite ~200-400 MB de RAM pour les signatures antivirus. Sur Railway, cela ajoute ~3-5 USD/mois au cout d'infrastructure.

---

## 11. Risques

| Risque | Probabilite | Impact | Mitigation |
|--------|:-----------:|:------:|------------|
| Supabase Storage atteint la limite de 100 GB (plan Pro) | Faible (phase maturite) | Moyen | Migrer les images publiques vers Cloudflare R2 (0 USD egress, 0.015 USD/GB stockage). |
| ClamAV ne detecte pas un malware recent (zero-day) | Faible | Eleve | ClamAV est une premiere ligne de defense. Les fichiers sont confines dans Supabase Storage (pas d'execution). Les signed URLs limitent l'exposition. |
| Un partenaire uploade un volume massif d'images (abuse) | Faible | Moyen | Rate limiting (10 uploads/min), quota par partenaire (configurable : max 50 images par boutique). Alerte admin si depassement. |
| Le job BullMQ de thumbnails echoue (sharp crash, OOM) | Moyenne | Faible | Retry automatique BullMQ (3 tentatives). L'image originale reste accessible. Le statut `FAILED` declenche une alerte. |
| Les signed URLs de documents sont partagees par un admin malveillant | Faible | Eleve | URLs valides 15 minutes seulement. Audit trail des acces documents (log chaque generation de signed URL). |
| La bande passante Cloudflare gratuite est insuffisante | Tres faible | Faible | Cloudflare Pages/CDN Free n'a pas de limite de bande passante. Seul Supabase a des limites (200 GB/mois Pro). Le cache CDN reduit la charge sur Supabase. |
| Flutter `flutter_image_compress` ne supporte pas un format ou device specifique | Faible | Faible | Fallback JPEG si WebP echoue. La validation serveur accepte JPEG et PNG comme alternatives. |

---

## 12. References

### Supabase Storage

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage) -- Supabase Docs
- [Supabase Storage Signed URLs](https://supabase.com/docs/guides/storage/uploads/signed-urls) -- Supabase Docs
- [Supabase Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control) -- Supabase Docs
- [Supabase Pricing](https://supabase.com/pricing) -- Supabase

### Traitement d'images

- [sharp - High performance Node.js image processing](https://sharp.pixelplumbing.com/) -- sharp
- [Blurhash](https://blurha.sh/) -- Blurhash project
- [flutter_image_compress](https://pub.dev/packages/flutter_image_compress) -- pub.dev
- [cached_network_image](https://pub.dev/packages/cached_network_image) -- pub.dev
- [flutter_blurhash](https://pub.dev/packages/flutter_blurhash) -- pub.dev

### CDN et performance

- [Cloudflare CDN Documentation](https://developers.cloudflare.com/cache/) -- Cloudflare Docs
- [Cloudflare Cache Rules](https://developers.cloudflare.com/cache/how-to/cache-rules/) -- Cloudflare Docs
- [Cloudflare R2 Pricing](https://developers.cloudflare.com/r2/pricing/) -- Cloudflare Docs

### Securite media

- [ClamAV Documentation](https://docs.clamav.net/) -- ClamAV
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html) -- OWASP
- [file-type - Detect the file type of a Buffer](https://github.com/sindresorhus/file-type) -- GitHub

### ADR BienBon liees

- ADR-001 : Stack backend (NestJS + Prisma + Supabase)
- ADR-004 : Strategie API (REST + OpenAPI)
- ADR-020 : Hebergement et infrastructure (Supabase Storage, Cloudflare CDN, Railway)
- ADR-021 : Conformite Data Protection Act (retention, droit a l'oubli)
- ADR-022 : Securite applicative OWASP (file upload validation, rate limiting, antimalware)
