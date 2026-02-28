---
name: add-notification
description: Crée un template de notification (email Resend / push FCM / in-app)
argument-hint: <NotificationName> [--channel email|push|in-app]
---

# Add Notification

Crée un template de notification `$ARGUMENTS` (ADR-014).

## Types de canaux

### Email (Resend)

Fichier : `src/modules/notification/templates/emails/<notification-name>.tsx`

```typescript
import { Html, Head, Body, Container, Text, Button } from '@react-email/components';

interface <NotificationName>EmailProps {
  userName: string;
  // ... données spécifiques
}

export function <NotificationName>Email({ userName }: <NotificationName>EmailProps) {
  return (
    <Html lang="fr">
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Text>Bonjour {userName},</Text>
          {/* Contenu */}
          <Button href="https://bienbon.mu/..." style={button}>
            Action
          </Button>
        </Container>
      </Body>
    </Html>
  );
}
```

Service d'envoi :
```typescript
await resend.emails.send({
  from: 'BienBon.mu <noreply@bienbon.mu>',
  to: [user.email],
  subject: t('notifications.<name>.subject'),
  react: <NotificationName>Email({ userName: user.name }),
});
```

### Push (FCM)

```typescript
await fcm.send({
  token: user.fcmToken,
  notification: {
    title: t('notifications.<name>.title'),
    body: t('notifications.<name>.body', { /* params */ }),
  },
  data: {
    type: '<notification-name>',
    deepLink: '/path/to/screen',
  },
});
```

### In-app

```typescript
await prisma.notification.create({
  data: {
    userId: user.id,
    type: '<NOTIFICATION_NAME>',
    title: t('notifications.<name>.title'),
    body: t('notifications.<name>.body'),
    data: { /* payload */ },
    readAt: null,
  },
});
```

## Conventions

- Templates email en React Email (JSX)
- Textes internationalisés (3 locales)
- Deep link dans les push notifications
- In-app notifications stockées en DB
- Respecter les préférences utilisateur (opt-out par canal)

## Validation

- [ ] Template créé pour le(s) canal(aux)
- [ ] Textes internationalisés (fr, en, mfe)
- [ ] Deep link configuré (push)
- [ ] Préférences utilisateur respectées
- [ ] Test d'envoi réussi
