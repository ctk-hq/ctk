CURRENT_DIR=$(shell pwd)

ORG_NAME=omhq
IMAGE=ctk-server
IMAGE_TAG=0.0.1

.PHONY: all
all: build push

.PHONY: build
build:
	DOCKER_BUILDKIT=1 docker build --platform=linux/amd64 -t $(ORG_NAME)/$(IMAGE):$(IMAGE_TAG) -f $(CURRENT_DIR)/Dockerfile .

.PHONY: push
push:
	docker push $(ORG_NAME)/$(IMAGE):$(IMAGE_TAG)
