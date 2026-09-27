# Build stage
#
# NOTE: the build context is the REPOSITORY ROOT (see docker-compose.yml), not
# this directory. That is what allows nginx/default.conf to be copied in below —
# Docker cannot COPY a path outside its own build context.
#
#   docker build -f frontend/Dockerfile .

FROM node:20-alpine AS builder

WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# Production Nginx stage
FROM nginx:alpine

# The real config, shared with local development. Single source of truth.
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
