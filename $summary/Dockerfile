FROM node:20

WORKDIR /app

COPY package*.json ./

RUN npm install
# RUN npm ci --only=production
COPY . .

EXPOSE 4000
CMD [ "node", "--loader", "ts-node/esm", "./src/index.ts" ]