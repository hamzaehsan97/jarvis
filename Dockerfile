FROM --platform=linux/amd64 node:18.20.8

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm install pm2 -g

EXPOSE 8080

CMD ["npm", "start"]
