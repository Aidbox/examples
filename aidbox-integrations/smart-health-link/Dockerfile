# Use the official Bun image
FROM oven/bun:1-alpine

# Install curl for the container healthcheck
RUN apk add --no-cache curl

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json bun.lock* ./
RUN bun install

# Copy source
COPY . .

# Run as the non-root user that the Bun image ships with
USER bun

# Expose port
EXPOSE 3000

# Bun runs TypeScript directly — no build step
CMD ["bun", "src/server.ts"]
