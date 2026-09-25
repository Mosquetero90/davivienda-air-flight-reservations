# Stage 1: Build Angular application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root manifests and workspace configs
COPY package.json package-lock.json ./
COPY shared ./shared
COPY backend/package.json ./backend/package.json
COPY frontend ./frontend

# Install dependencies and build shared + frontend
RUN npm ci --ignore-scripts
RUN npm run build:shared
RUN npm run build --workspace=frontend

# Stage 2: Serve with Nginx
FROM nginx:alpine AS runner

COPY --from=builder /app/frontend/dist/frontend/browser /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
