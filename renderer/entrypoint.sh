#!/bin/sh
set -u

data="${SKYLINE_RENDERER_DATA:-/data}"
api="${SKYLINE_PLATFORM_SOCKET:-/.fly/api}"

if [ -d "$data" ]; then chown -R renderer:renderer "$data" 2>/dev/null; fi
if [ -S "$api" ]; then chmod 600 "$api" 2>/dev/null; chown root:root "$api" 2>/dev/null; fi

env -u SKYLINE_RENDERER_CORDON_TOKEN setpriv --reuid=renderer --regid=renderer --init-groups --no-new-privs --inh-caps=-all --bounding-set=-all \
  node --max-old-space-size=384 /srv/renderer/server.cjs &
child=$!
trap 'kill -TERM "$child" 2>/dev/null' TERM INT

status=0
while kill -0 "$child" 2>/dev/null; do
  wait "$child"
  status=$?
done

if [ "$status" -eq 75 ]; then
  node /srv/renderer/server.cjs --cordon
  exit 0
fi
exit "$status"
