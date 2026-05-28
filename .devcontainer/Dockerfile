# Dev container image for SYNAPSE.
#
# Layers:
#   1. Microsoft's javascript-node 22 base — non-root `node` user, git, sudo
#   2. Project tools: pnpm (via corepack), Playwright deps (chromium only),
#      psql client for ad-hoc DB checks
#
# The image is *only* used by the devcontainer. Production runtime images
# (apps/sync, …) get their own Dockerfile next to their package.json.

FROM mcr.microsoft.com/devcontainers/javascript-node:1-22-bookworm

# Layer cache: install OS-level deps once.
RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        postgresql-client \
        # Playwright chromium runtime deps
        libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 \
        libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 \
        libcairo2 libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Enable corepack so the project's `packageManager` field drives pnpm version.
RUN corepack enable && corepack prepare pnpm@11.1.2 --activate

# Workdir matches the bind-mount from docker-compose.yml
WORKDIR /workspace

# `node` user is already present (uid 1000) in the base image — preserve it.
USER node
