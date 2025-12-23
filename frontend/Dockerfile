# Base deps layer (reused by dev & build)
FROM node:20-alpine AS deps
WORKDIR /app
ENV PATH=/app/node_modules/.bin:$PATH
COPY package*.json ./
RUN npm install

# Development image: run Vite with hot reload (mount source code)
FROM deps AS dev
ENV NODE_ENV=development
COPY . .
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

# Production build
FROM deps AS build
ENV NODE_ENV=production
COPY . .
RUN npm run build

# Nginx base with config (used by both dev + prod)
FROM nginx:alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Final production server
FROM runtime AS prod
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
