FROM node:24-alpine
WORKDIR /app
COPY . .
RUN mkdir -p /data && chown node:node /data
ENV HOST=0.0.0.0 PORT=3000 ASSURANCE_DB_PATH=/data/assurance.sqlite
VOLUME ["/data"]
EXPOSE 3000
USER node
CMD ["node", "src/server/server.mjs"]
