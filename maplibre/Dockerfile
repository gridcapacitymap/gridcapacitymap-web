# build stage
FROM node:16 as node_builder

ARG APP_VERSION
ARG APP_COMMIT
ARG VITE_DEFAULT_NETWORK_ID

ENV VITE_APP_VERSION $APP_VERSION
ENV VITE_APP_COMMIT $APP_COMMIT

ENV VITE_DEFAULT_NETWORK_ID $VITE_DEFAULT_NETWORK_ID

WORKDIR /usr/src/app
COPY . /usr/src/app

RUN yarn && yarn build

# production stage
FROM nginx:stable

COPY --from=node_builder /usr/src/app/configs/nginx/ /etc/nginx/
COPY --from=node_builder /usr/src/app/dist /usr/share/nginx/html
