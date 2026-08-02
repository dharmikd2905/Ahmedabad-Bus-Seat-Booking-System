FROM node:20-alpine

# sqlite3 needs python3 + make + g++ to compile native bindings
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 5000

CMD ["node", "src/server.js"]
