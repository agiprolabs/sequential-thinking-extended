FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY tsconfig.json ./
COPY src ./src

# Build
RUN npm run build

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

# Install wget for healthcheck
RUN apk add --no-cache wget

# Copy package files and install production deps only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built files
COPY --from=builder /app/dist ./dist

# Create data directory for persistence
RUN mkdir -p /data && chown node:node /data

# Environment defaults
ENV NODE_ENV=production
ENV DATA_PATH=/data
ENV TRANSPORT_MODE=http
ENV PORT=3000
ENV HOST=0.0.0.0

# Expose HTTP port (used when TRANSPORT_MODE=http)
EXPOSE 3000

# Run as non-root
USER node

ENTRYPOINT ["node", "dist/index.js"]
