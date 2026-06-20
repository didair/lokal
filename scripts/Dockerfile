# Dockerfile
FROM node:20-alpine

WORKDIR /lokal

COPY package.json ./
COPY package-lock.json ./

RUN npm install --ignore-scripts

COPY . .

RUN rm -rf .next && npm run build

COPY scripts/entrypoint.sh /lokal/scripts/entrypoint.sh
RUN chmod +x /lokal/scripts/entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/lokal/scripts/entrypoint.sh"]
CMD ["npm", "start"]
