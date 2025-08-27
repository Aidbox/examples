FROM node:20

WORKDIR /app
RUN pnpm install -g corepack && corepack enable
COPY . .
RUN pnpm install --frozen-lockfile && pnpm run build

EXPOSE 4000

CMD [ "node", "build/index.js" ]
