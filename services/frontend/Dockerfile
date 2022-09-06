FROM node:16 as build

WORKDIR /build
COPY ./services/frontend/ .
RUN npm install
RUN npm run build

FROM nginx:stable-alpine
COPY --from=build /build/build /usr/share/nginx/html
COPY --from=build /build/configs/nginx/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
