FROM node:24-alpine
RUN apk add --no-cache su-exec
WORKDIR /app
COPY package.json ./
COPY src ./src
COPY public ./public
COPY scripts/build.mjs ./scripts/build.mjs
COPY deploy/entrypoint.sh /usr/local/bin/mew-entrypoint
RUN node scripts/build.mjs && mkdir -p /data && chown node:node /data
ENV HOST=0.0.0.0 PORT=3000 MEW_DB_PATH=/data/mew.sqlite
# Persistent /data is attached by the hosting service configuration.
EXPOSE 3000
ENTRYPOINT ["sh", "/usr/local/bin/mew-entrypoint"]
CMD ["node", "src/server/server.mjs"]
