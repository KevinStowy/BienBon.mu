---
name: create-media-upload
description: Ajoute un pipeline d'upload média (compression, signed URL, validation)
argument-hint: <context> [store-photo|basket-photo|user-avatar|claim-evidence]
---

# Create Media Upload

Ajoute un pipeline d'upload média pour `$ARGUMENTS` (ADR-031).

## Étape 1 — Endpoint de pré-signature

```typescript
@Post('upload-url')
@UseGuards(JwtAuthGuard)
@ApiOperation({ summary: 'Get signed upload URL' })
async getUploadUrl(@Body() dto: UploadUrlRequestDto): Promise<UploadUrlResponseDto> {
  // Valider le type de fichier
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(dto.contentType)) {
    throw new BadRequestException('Unsupported file type');
  }

  // Valider la taille (max 5MB)
  if (dto.contentLength > 5 * 1024 * 1024) {
    throw new BadRequestException('File too large (max 5MB)');
  }

  // Générer signed URL Supabase Storage
  const path = `<context>/${userId}/${uuidv7()}.${ext}`;
  const { data, error } = await supabase.storage
    .from('media')
    .createSignedUploadUrl(path);

  return { uploadUrl: data.signedUrl, publicUrl: `${STORAGE_URL}/media/${path}` };
}
```

## Étape 2 — Traitement post-upload (BullMQ)

```typescript
// Job déclenché après l'upload
@Processor('media:process')
export class MediaProcessorWorker extends WorkerHost {
  async process(job: Job<{ path: string; context: string }>) {
    const { path, context } = job.data;

    // 1. Télécharger le fichier
    const file = await supabase.storage.from('media').download(path);

    // 2. Valider (pas de malware, dimensions OK)
    await this.validateImage(file);

    // 3. Comprimer et redimensionner
    const variants = await this.createVariants(file, context);
    // thumbnail: 150x150, medium: 600x600, large: 1200x1200

    // 4. Convertir en WebP
    for (const variant of variants) {
      await supabase.storage.from('media').upload(variant.path, variant.buffer, {
        contentType: 'image/webp',
      });
    }

    // 5. Mettre à jour l'entité avec les URLs
    await this.updateEntity(job.data);
  }
}
```

## Étape 3 — Flutter upload

```dart
Future<String> uploadMedia(File file, String context) async {
  // 1. Demander signed URL
  final urlResponse = await api.getUploadUrl(
    contentType: lookupMimeType(file.path)!,
    contentLength: file.lengthSync(),
    context: context,
  );

  // 2. Upload direct vers Supabase Storage
  await dio.put(
    urlResponse.uploadUrl,
    data: file.openRead(),
    options: Options(headers: {'Content-Type': lookupMimeType(file.path)}),
  );

  return urlResponse.publicUrl;
}
```

## Tailles par contexte

| Contexte | Max size | Variants |
|----------|----------|----------|
| store-photo | 5MB | thumb 150x150, medium 600x400, large 1200x800 |
| basket-photo | 5MB | thumb 150x150, medium 600x600 |
| user-avatar | 2MB | thumb 80x80, medium 200x200 |
| claim-evidence | 10MB | medium 800x800 |

## Validation

- [ ] Types de fichiers validés (JPEG, PNG, WebP)
- [ ] Taille max vérifiée
- [ ] Signed URL avec expiration
- [ ] Compression et conversion WebP
- [ ] Variants générées
- [ ] Tests passent
