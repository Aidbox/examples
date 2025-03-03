FROM node:18 AS builder

ARG VITE_API_BASE_URL
ARG VITE_SMARTAPP_SUBSCRIPTIONS_API

# Set environment variables during the build process
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_SMARTAPP_SUBSCRIPTIONS_API=$VITE_SMARTAPP_SUBSCRIPTIONS_API

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN npm run build

CMD ["npm", "run", "preview"]