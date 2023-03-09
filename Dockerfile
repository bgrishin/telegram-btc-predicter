FROM node:alpine
WORKDIR ./
COPY package.json ./
COPY package-lock.json ./
COPY ./ ./
RUN npm i
RUN npm start
