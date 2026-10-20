#!/bin/bash
# Git worktree management for kundli-app
# Usage: ./scripts/wt.sh {new|list|rm|sync} [name]

set -e

# Resolve from the main checkout so the script works from any folder or worktree
ROOT="$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")"
WT_DIR="$ROOT/kundli-wt"
BASE="master"

case "$1" in
  new)
    if [ -z "$2" ]; then
      echo "Usage: $0 new <name>"
      exit 1
    fi
    git -C "$ROOT" worktree add "$WT_DIR/$2" -b "feat/$2" "$BASE"
    echo "Created worktree: $WT_DIR/$2 (branch: feat/$2)"
    ;;
  list)
    git worktree list
    ;;
  rm)
    if [ -z "$2" ]; then
      echo "Usage: $0 rm <name>"
      exit 1
    fi
    git -C "$ROOT" worktree remove "$WT_DIR/$2"
    echo "Removed worktree: $WT_DIR/$2"
    ;;
  sync)
    if [ -z "$2" ]; then
      echo "Usage: $0 sync <name>"
      exit 1
    fi
    WT="$WT_DIR/$2"
    if [ ! -d "$WT" ]; then
      echo "Worktree not found: $WT"
      exit 1
    fi
    git -C "$WT" rebase "$BASE"
    echo "Synced worktree $2 with $BASE"
    ;;
  *)
    echo "Usage: $0 {new|list|rm|sync} [name]"
    exit 1
    ;;
esac
