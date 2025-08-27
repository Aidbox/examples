# Use Node.js official image
FROM node:18-alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S healthcards -u 1001

# Change ownership of the app directory
RUN chown -R healthcards:nodejs /app

# Switch to non-root user
USER healthcards

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]