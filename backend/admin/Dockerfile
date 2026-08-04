FROM nginx:alpine

COPY admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY admin/index.html admin/app.js admin/styles.css /usr/share/nginx/html/

EXPOSE 80
