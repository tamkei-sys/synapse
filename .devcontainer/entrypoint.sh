#!/usr/bin/env bash
# Dev container entrypoint.
#
# Named volumes (pnpm-store, node-modules) come up owned by root the first
# time they're created — Docker can't infer the desired uid because the path
# under the bind mount is empty. This script runs as root, chowns those
# mountpoints to the `node` user, and then drops privileges to run the
# requested command.
set -euo pipefail

# `node` uid in the base image is 1000.
NODE_UID="$(id -u node)"
NODE_GID="$(id -g node)"

for path in /home/node/.local /workspace/node_modules; do
  if [ -d "$path" ] && [ "$(stat -c %u "$path")" != "$NODE_UID" ]; then
    chown -R "${NODE_UID}:${NODE_GID}" "$path"
  fi
done

# If no command was passed, default to sleeping (devcontainer pattern).
if [ "$#" -eq 0 ]; then
  set -- sleep infinity
fi

exec runuser -u node -- "$@"
