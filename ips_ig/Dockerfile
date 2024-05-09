FROM node:20

WORKDIR /app
RUN corepack enable
COPY package*.json ./
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm run build

EXPOSE 4000

CMD [ "node", "build/index.js" ]
