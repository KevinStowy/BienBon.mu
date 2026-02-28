#!/bin/bash
# Usage: ./scripts/launch-worker.sh alpha
#    ou: ./scripts/launch-worker.sh beta
#
# Lance Claude Code en mode autonome avec un worker ID.
# Le worker lit ROADMAP.yaml et exécute les tâches automatiquement.

set -euo pipefail

WORKER_ID="${1:?Usage: $0 <alpha|beta>}"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [[ "$WORKER_ID" != "alpha" && "$WORKER_ID" != "beta" ]]; then
  echo "❌ Worker ID doit être 'alpha' ou 'beta'"
  exit 1
fi

echo "🚀 Lancement du worker $WORKER_ID pour BienBon.mu"
echo "   Projet : $PROJECT_DIR"
echo ""

# 1. Écrire le worker ID
echo "$WORKER_ID" > "$PROJECT_DIR/.claude/worker-id"
echo "✅ Worker ID : $WORKER_ID"

# 2. Synchroniser
cd "$PROJECT_DIR"
git pull origin main 2>/dev/null || echo "⚠️  Pas de remote (pas grave pour le premier lancement)"

# 3. Lancer Claude Code
echo ""
echo "📋 Claude va lire ROADMAP.yaml et bosser de manière autonome."
echo "   Il te contactera quand il a besoin de toi (clés API, comptes, etc.)"
echo "   Notifications dans : /tmp/bienbon-claude-notifications.log"
echo ""
echo "---"
echo ""

claude -p "BOSSE. Tu es le worker $WORKER_ID. Lis ROADMAP.yaml et exécute la prochaine tâche disponible. Quand tu as fini une tâche, passe à la suivante. Ne t'arrête que si tu as besoin d'un humain ou si tout est fait." \
  --allowedTools "Read,Write,Edit,Glob,Grep,Bash,Task,WebSearch,WebFetch"
