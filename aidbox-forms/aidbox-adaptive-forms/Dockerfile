FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY tsconfig.json ./
COPY src ./src

RUN npm install -D typescript @types/node && \
    npm run build && \
    npm prune --production

CMD ["node", "dist/main.js"]
