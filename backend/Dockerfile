FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

FROM node:24-alpine

WORKDIR /app

COPY --from=build /app/dist /app/dist
COPY package*.json ./

ENV NODE_ENV=production
RUN npm ci

EXPOSE 8000

CMD ["npm", "start"]
