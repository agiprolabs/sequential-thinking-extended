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

# Copy package files and install production deps only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built files
COPY --from=builder /app/dist ./dist

# Create data directory for persistence
RUN mkdir -p /data && chown node:node /data

# Environment
ENV NODE_ENV=production
ENV DATA_PATH=/data

# Run as non-root
USER node

ENTRYPOINT ["node", "dist/index.js"]

