FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

FROM node:22-alpine AS builder
WORKDIR /app
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SHINEAPP_DEMO_LOGIN
ARG NEXT_PUBLIC_SHINEAPP_DEMO_USERNAME
ARG NEXT_PUBLIC_SHINEAPP_TOKEN_TTL_DAYS
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SHINEAPP_DEMO_LOGIN=$NEXT_PUBLIC_SHINEAPP_DEMO_LOGIN
ENV NEXT_PUBLIC_SHINEAPP_DEMO_USERNAME=$NEXT_PUBLIC_SHINEAPP_DEMO_USERNAME
ENV NEXT_PUBLIC_SHINEAPP_TOKEN_TTL_DAYS=$NEXT_PUBLIC_SHINEAPP_TOKEN_TTL_DAYS
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
