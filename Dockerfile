FROM node:12.18-alpine AS resume-demo

EXPOSE 80
EXPOSE 443
EXPOSE 6379
EXPOSE 3306

WORKDIR /usr/src/app
COPY ./package.json .
COPY ./package-lock.json .

RUN npm ci && \
    npm remove pm2 && npm remove -g pm2 && \
    npm i @socket.io/pm2 -g && \
    npm audit fix --force && \
    mv node_modules ../ && \
    npm cache clean --force

COPY . .


ARG REST_HOST=https://resume.sati.co.th
ARG REST_USER=demo
ARG REST_PW=rsm
ENV REST_HOST=REST_HOST
ENV REST_USER=REST_USER
ENV REST_PW=REST_PW

CMD ["pm2-runtime", "-i", "max", "app.js"]