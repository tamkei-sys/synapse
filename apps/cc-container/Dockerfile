# SYNAPSE cc-container sandbox (PBI-19).
#
# This image runs the headless Claude Code CLI (`cc`) inside a single
# Cloudflare Container instance, attached to the SYNAPSE MCP server.
#
# Lifecycle (see entrypoint.sh):
#   1. Image boots → reads env: SESSION_ID, MCP_URL, MCP_TOKEN, TASK_JSON
#   2. Posts SESSION_STARTED back to SYNAPSE API
#   3. Invokes `cc` with explicit allowedTools (no --dangerously-skip-permissions)
#   4. Stream cc output → SYNAPSE API as `cc.event`
#   5. On exit → POST SESSION_ENDED with status + (optional) PR URL
#
# Security (CLAUDE.md §6):
#   - User credentials never mounted (~/.aws, ~/.ssh, ~/.gcloud, ~/.kube)
#   - Workspace tokens are short-lived bearer tokens via MCP
#   - allowedTools must be an explicit allowlist
#   - Budget cap is enforced by the API before this container starts
#
# Note: this image is the *scaffold*. Real cc CLI binary install is left
# as TODO until the cc release channel + license model is settled.

FROM node:22-bookworm-slim AS base

# 最小限のシステムパッケージ。git は cc が PR を出すために必要。
# curl は API へのコールバック用。jq でレスポンスを軽くパース。
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
       git \
       ca-certificates \
       curl \
       jq \
       openssh-client \
  && rm -rf /var/lib/apt/lists/*

# 非 root ユーザーで cc を動かす。$HOME 配下に書ける必要があるので /home/cc を使う。
RUN useradd --create-home --shell /bin/bash cc

WORKDIR /workspace

# TODO: ここで cc CLI を install する。リリース方法が確定したら差し替える:
#   ARG CC_VERSION=0.x.x
#   RUN curl -fsSL https://example.com/cc-${CC_VERSION}.tar.gz | tar -xz -C /usr/local/bin
#
# それまでは entrypoint からのモックレスポンスで動作確認だけする。

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER cc

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
