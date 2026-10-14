FROM node:22-trixie-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY src/lib/acquisition ./src/lib/acquisition
COPY renderer ./renderer
RUN npm run renderer:build

FROM node:22-trixie-slim
RUN apt-get update \
 && apt-get upgrade -y \
 && apt-get install -y --no-install-recommends chromium fonts-liberation fonts-noto-core fonts-noto-cjk fonts-noto-color-emoji ca-certificates tini \
 && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production CHROME_PATH=/usr/bin/chromium PORT=8080 UV_THREADPOOL_SIZE=8
RUN useradd --create-home --uid 10001 --shell /usr/sbin/nologin renderer
WORKDIR /srv/renderer
COPY --from=build /app/renderer/dist/server.cjs ./server.cjs
COPY renderer/entrypoint.sh ./entrypoint.sh
EXPOSE 8080
ENTRYPOINT ["tini", "--"]
CMD ["/srv/renderer/entrypoint.sh"]
