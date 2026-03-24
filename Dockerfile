# Stage 1: Build React app
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY index.html vite.config.js ./
COPY src ./src
RUN npm run build

# Stage 2: Node server (API + static files)
FROM node:20-alpine
WORKDIR /app
COPY backend/package.json ./
RUN npm install
COPY backend/*.js ./
COPY --from=build /app/dist ./public
EXPOSE 3001
CMD ["node", "server.js"]
