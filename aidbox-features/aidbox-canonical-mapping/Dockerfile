FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS install
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile || bun install

# Production stage
FROM base AS release
COPY --from=install /app/node_modules node_modules
COPY src ./src
COPY package.json .

# Entry point (can be overridden via build arg)
ARG ENTRY_POINT=src/facade/index.ts
ENV ENTRY_POINT=$ENTRY_POINT

# Run as non-root user
USER bun

EXPOSE 3000

CMD ["sh", "-c", "bun run $ENTRY_POINT"]
