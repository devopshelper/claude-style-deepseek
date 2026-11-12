#!/usr/bin/env sh
# Claude Style for DeepSeek Harness - installer (macOS / Linux).
#
#   ./install.sh                       install into the "web" profile from GitHub
#   ./install.sh --profile desktop     install into the desktop profile
#   ./install.sh --local               install this working copy instead of GitHub
#   ./install.sh --dry-run             print the command, run nothing
#
# The installer runs one `dsh plugin` command. It never edits a profile by hand.
set -eu

PROFILE="${PROFILE:-web}"
SPEC="${SPEC:-github:devopshelper/claude-style-deepseek}"
LOCAL=0
DRY_RUN=0

usage() {
  cat <<'EOF'
Usage: ./install.sh [--profile <name>] [--local] [--dry-run]

  --profile <name>   profile to install into (default: web, or $PROFILE)
  --local            install this checkout instead of the GitHub package
  --dry-run          print the command, run nothing
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --profile)
      [ $# -ge 2 ] || { echo "install.sh: --profile needs a name" >&2; exit 2; }
      PROFILE="$2"
      shift 2
      ;;
    --profile=*)
      PROFILE="${1#*=}"
      shift
      ;;
    --local)
      LOCAL=1
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "install.sh: unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if ! command -v dsh >/dev/null 2>&1; then
  echo "install.sh: dsh is not on PATH. Install DeepSeek Harness first." >&2
  exit 1
fi

if [ "$LOCAL" -eq 1 ]; then
  TARGET=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
else
  TARGET="$SPEC"
fi

if [ "$DRY_RUN" -eq 1 ]; then
  echo "dsh plugin --profile $PROFILE add $TARGET"
  exit 0
fi

echo "Installing Claude Style into the '$PROFILE' profile..."
if ! dsh plugin --profile "$PROFILE" add "$TARGET"; then
  echo "install.sh: dsh plugin add failed. Nothing was enabled." >&2
  exit 1
fi

cat <<EOF

Installed.
  1. Refresh the app window (Ctrl+R).
  2. Settings -> Plugins -> Claude Style toggles the palette and the transcript skin.
  3. Restart DeepSeek Harness once if the theme does not appear after the refresh.

Remove it later with: dsh plugin --profile $PROFILE remove claude-style-deepseek
EOF
