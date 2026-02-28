---
name: add-deep-link
description: Configure Universal Links iOS + App Links Android pour une route
argument-hint: <path>
---

# Add Deep Link

Configure le deep linking pour la route `$ARGUMENTS` (ADR-030).

## Étape 1 — iOS Universal Links

Fichier : `ios/Runner/Runner.entitlements`
```xml
<key>com.apple.developer.associated-domains</key>
<array>
  <string>applinks:bienbon.mu</string>
</array>
```

Le fichier `apple-app-site-association` (hébergé sur bienbon.mu/.well-known/) :
```json
{
  "applinks": {
    "apps": [],
    "details": [{
      "appID": "<TEAM_ID>.mu.bienbon.consumer",
      "paths": ["<path>", "<path>/*"]
    }]
  }
}
```

## Étape 2 — Android App Links

Fichier : `android/app/src/main/AndroidManifest.xml`
```xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="https" android:host="bienbon.mu" android:pathPrefix="<path>" />
</intent-filter>
```

Fichier `assetlinks.json` (hébergé sur bienbon.mu/.well-known/) :
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "mu.bienbon.consumer",
    "sha256_cert_fingerprints": ["<SHA256>"]
  }
}]
```

## Étape 3 — GoRouter handling

La route doit être définie dans GoRouter avec le même path. GoRouter gère automatiquement les deep links entrants.

```dart
GoRoute(
  path: '<path>',
  builder: (context, state) => const TargetScreen(),
),
```

## Étape 4 — Tester

- Tester sur simulateur : `xcrun simctl openurl booted "https://bienbon.mu<path>"`
- Tester sur émulateur Android : `adb shell am start -a android.intent.action.VIEW -d "https://bienbon.mu<path>"`

## Validation

- [ ] Entitlements iOS configurés
- [ ] AndroidManifest intent-filter ajouté
- [ ] Route GoRouter correspondante existe
- [ ] Deep link testé sur simulateur/émulateur
