
FROM node:24-alpine AS build
WORKDIR /app

# URL backendu wstrzykiwany w czasie builda (Vite wypieka VITE_* na stałe w bundle).
# W CD: docker build --build-arg VITE_API_URL=https://api.example.com/ ...
ARG VITE_API_URL=http://localhost:8000/
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build


FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

RUN echo 'server { listen 80; location / { root /usr/share/nginx/html; index index.html; try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]