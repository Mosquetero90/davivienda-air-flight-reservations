# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root manifests and workspace configs
COPY package.json package-lock.json ./
COPY shared ./shared
COPY frontend/package.json ./frontend/package.json
COPY backend ./backend

# Install all dependencies and build shared + backend
RUN npm ci --ignore-scripts
RUN npm run build:shared
RUN npm run build --workspace=backend

# Stage 2: Runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY --from=builder /app/shared/dist ./shared/dist
COPY backend/package.json ./backend/
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/node_modules ./backend/node_modules

EXPOSE 3000

CMD ["node", "backend/dist/main"]
