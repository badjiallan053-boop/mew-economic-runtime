#!/bin/sh
set -eu
# Mounted Railway volumes may initially be root-owned. Drop privileges after setup.
mkdir -p /data
chown -R node:node /data
exec su-exec node:node "$@"
