ORGANIZATION = corpulent
CONTAINER = ctk-backend-build
VERSION = 0.1.0

ifneq (,$(wildcard ./.env))
	include .env
	export
endif

.PHONY : build-image

build-image :
	docker build -t $(ORGANIZATION)/$(CONTAINER):$(VERSION) .

deploy :
	docker run --rm --name $(CONTAINER) \
		--env AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID} \
		--env AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY} \
		--env ACTION=${ACTION} \
		--env STAGE=${STAGE} \
		-v ${PWD}/../services/backend/src:/usr/src/src \
		-v ${PWD}/../services/backend/requirements.txt:/usr/src/requirements.txt \
		-v ${PWD}/run.sh:/usr/src/run.sh \
		$(ORGANIZATION)/$(CONTAINER):$(VERSION)

shell :
	docker run -it --rm --name $(CONTAINER) \
		--entrypoint /bin/bash \
		--env AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID} \
		--env AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY} \
		--env ACTION=${ACTION} \
		--env STAGE=${STAGE} \
		-v ${PWD}/../services/backend/src:/usr/src/src \
		-v ${PWD}/../services/backend/requirements.txt:/usr/src/requirements.txt \
		-v ${PWD}/run.sh:/usr/src/run.sh \
		$(ORGANIZATION)/$(CONTAINER):$(VERSION)
