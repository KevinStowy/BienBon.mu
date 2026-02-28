---
name: review-security
description: Checklist sécurité OWASP Top 10 adaptée au code (ADR-022)
argument-hint: [file-or-module-path]
---

# Review Security

Audit sécurité OWASP pour `$ARGUMENTS` (ADR-022).

## Checklist OWASP

### A01 — Broken Access Control
- Endpoints protégés par JwtAuthGuard
- RBAC vérifié (@Roles)
- Ownership checks (user accède à SES ressources)
- Pas d'IDOR

### A02 — Cryptographic Failures
- Pas de secrets dans le code
- Algo crypto standards (pas de custom crypto)
- TLS partout

### A03 — Injection
- Pas de raw SQL (Prisma paramétré)
- Pas de eval(), new Function()
- Input sanitization

### A04 — Insecure Design
- Rate limiting sur auth/paiement
- Validation serveur (ne pas faire confiance au client)

### A05 — Security Misconfiguration
- Headers sécurité (CSP, X-Frame-Options)
- Debug mode off en prod
- Stack traces non exposées

### A06 — Vulnerable Components
- Pas de packages fantômes (hallucination IA)
- npm audit clean

### A07 — Authentication Failures
- JWT avec expiration
- Refresh token rotation

### A08 — Data Integrity
- Webhooks vérifiés HMAC
- Anti-replay

### A09 — Logging
- Events sécurité loggés
- Pas de PII dans les logs

### A10 — SSRF
- URLs user validées
- Pas de requêtes vers IPs internes

## PCI DSS (ADR-006)
- Aucune donnée carte stockée
- Pas de log de numéro de carte/CVV

## Format du rapport

Sévérités : 🔴 Critical | 🟠 High | 🟡 Medium | 🔵 Low

```
## Security Audit — <scope>
### Findings
- **[SEC-001]** 🔴 fichier:ligne — Vulnérabilité (OWASP A0X) → Remédiation
### Verdict : ✅ Secure | ⚠️ Remediation needed | ❌ Block
```
