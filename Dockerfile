FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Comando para mantener el contenedor encendido sin hacer nada
CMD ["tail", "-f", "/dev/null"]
