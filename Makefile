ORGANIZATION = corpulent
CONTAINER = ctk-server
VERSION = 0.1.0

.PHONY : validate build pull up down down_clean reset run backend_dev shell_server shell_nginx local_setup local_build

validate :
	docker-compose config

build : validate
	docker-compose build

pull :
	docker-compose pull

up :
	docker-compose up -d

up_local :
	docker-compose up -d --no-build

down :
	docker-compose down

down_clean : down
	-docker volume rm ctk_postgres_data
	-docker volume rm ctk_django_static

reset : down
	make up

dev_server :
	docker exec -ti $(CONTAINER) python /home/server/manage.py runserver 0.0.0.0:9001

shell_server:
	docker exec -it ${CONTAINER} bash

frontend_build:
	@ cd ./services/frontend/src && npm install && npm run build

local_server_init:
	docker exec -it ${CONTAINER} python /home/server/manage.py makemigrations \
	&& docker exec -it ${CONTAINER} python /home/server/manage.py migrate \
	&& docker exec -it ${CONTAINER} python /home/server/manage.py collectstatic --noinput
