FROM node:18-alpine

RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    ffmpeg \
    p7zip

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 3001

CMD ["npm", "start"]
