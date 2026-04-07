FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS install
RUN apt-get update && apt-get install -y curl
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile || bun install

# Production stage
FROM base AS release
RUN apt-get update && apt-get install -y curl
COPY --from=install /app/node_modules node_modules
COPY src ./src
COPY package.json .
COPY tsconfig.json .

USER bun

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["bun", "run", "src/index.ts"]
