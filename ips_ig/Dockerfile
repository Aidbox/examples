FROM node:20

WORKDIR /app
RUN corepack enable
COPY . .
COPY ./src/data.json ./src/data.json
RUN pnpm install --frozen-lockfile
RUN pnpm run build

EXPOSE 4000

CMD [ "node", "build/index.js" ]
