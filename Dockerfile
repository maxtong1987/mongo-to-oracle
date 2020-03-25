FROM node:10 

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
RUN npm install --silent --no-cache

COPY . .

RUN npm run pre-build:docker
RUN cat .git-info.json

FROM collinestes/docker-node-oracle:latest

WORKDIR /usr/src/app/

COPY package*.json ./
COPY tsconfig.json ./
COPY ./src ./src
COPY --from=0 /app/.git-info.json .

RUN npm install --silent --no-cache
RUN npm run build
# COPY .git-info.json .git-info.json

CMD ["npm", "start"]