# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY backend/package*.json ./
COPY backend/prisma ./prisma/

RUN npm ci

COPY backend/ ./

RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# openssl is required by Prisma's query engine on alpine
RUN apk add --no-cache openssl

COPY backend/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY backend/prisma ./prisma/
RUN npx prisma generate

COPY --from=builder /app/dist ./dist

# Local disk upload dir (legacy document endpoints only — supplier invoices
# are stored in Supabase Storage, not here).
RUN mkdir -p /app/uploads /app/logs

EXPOSE 5000

# Apply pending migrations, then serve. Migrations run via `directUrl` on the
# first boot and are a no-op once the schema is current.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
