set shell := ["bash", "-eu", "-o", "pipefail", "-c"]

default:
    @just --list

install:
    pnpm install

dev:
    pnpm dev

build:
    pnpm build

preview:
    pnpm preview

lint:
    pnpm lint

lint-tickets:
    pnpm lint:tickets

format:
    pnpm format

typecheck:
    pnpm typecheck

test-unit:
    pnpm test:unit

test-e2e:
    pnpm test:e2e

test:
    pnpm test

verify:
    pnpm verify

explore-ui:
    pnpm explore:ui

hooks-install:
    pre-commit install --hook-type pre-commit --hook-type pre-push

hooks-run:
    pre-commit run --all-files

agent-new name:
    mkdir -p .agent/commands
    printf '%s\n' '#!/usr/bin/env bash' 'set -euo pipefail' > ".agent/commands/{{name}}.sh"
    chmod +x ".agent/commands/{{name}}.sh"

agent-run name:
    "./.agent/commands/{{name}}.sh"
