FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

FROM node:24-alpine

WORKDIR /app

COPY --from=build /app/dist /app/dist
COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
COPY entrypoint.sh ./entrypoint.sh

ENV NODE_ENV=production
RUN npm ci && npx prisma generate && chmod +x entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["./entrypoint.sh"]
