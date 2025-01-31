# Build stage
FROM node:20-alpine as build

WORKDIR /app

# Aumentar a memória disponível para o Node.js
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Definir variáveis de ambiente para o build
ARG VITE_SUPABASE_URL=https://studio.gbppolitico.com
ARG VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzM2MzkxNjAwLAogICJleHAiOiAxODk0MTU4MDAwCn0.6Djbu2O_EC7CNlJRKRmPMrCDw2hKdyn4oF5EWzWS2cA

ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}

# Copy package files first to leverage Docker cache
COPY package*.json ./

# Install dependencies with cache
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:stable-alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy the build output
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost/ || exit 1

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
