BACKEND_CONTAINER_NAME = nuxx-api
NGINX_CONTAINER_NAME = nuxx-nginx

.PHONY : validate build pull up down down_clean reset run backend_dev shell_backend shell_nginx local_setup local_build

validate :
	docker-compose config

build : validate
	docker-compose build

pull :
	docker-compose pull

up :
	@ docker-compose up -d

down :
	docker-compose down

down_clean : down
	-docker volume rm nuxx_postgres_data
	-docker volume rm nuxx_django_static

reset : down
	make up

run : validate
	docker-compose run $(BACKEND_CONTAINER_NAME) -c "cd /home/app/ && python manage.py runserver 0.0.0.0:9001"

dev_backend :
	docker exec -ti $(BACKEND_CONTAINER_NAME) python /home/app/manage.py runserver 0.0.0.0:9001

shell_backend:
	docker exec -it ${BACKEND_CONTAINER_NAME} bash

shell_nginx:
	docker exec -it ${NGINX_CONTAINER_NAME} bash

local_build:
	@ cd ./src/composer && npm install && npm run build_local

local_setup: local_build up
	@ echo "Waiting for PostgreSQL..." \
	&& sleep 5 \
	&& docker exec -it ${BACKEND_CONTAINER_NAME} python /home/app/manage.py makemigrations \
	&& docker exec -it ${BACKEND_CONTAINER_NAME} python /home/app/manage.py migrate \
	&& docker exec -it ${BACKEND_CONTAINER_NAME} python /home/app/manage.py collectstatic --noinput
