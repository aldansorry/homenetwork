FROM node:20-alpine AS base

RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    ffmpeg \
    p7zip

WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN npm install

# Development image: nodemon + bind mount source
FROM deps AS dev
ENV NODE_ENV=development
COPY . .
CMD ["npm", "run", "dev"]

# Production image
FROM deps AS production
ENV NODE_ENV=production
RUN npm prune --omit=dev
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
