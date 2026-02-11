# Container Tool Kit

Visually generate docker compose & kubernetes manifests.

![Alt text](https://ctkdev-public.s3.us-east-1.amazonaws.com/logo.svg?raw=true "Logo")

## Local setup and development

On a Mac/Linux/Windows you need Docker, Docker Compose installed. Optionally GCC to run make commands for convenience, or just run the commands from the Makefile by hand.

To get the tool working locally,  just run:

```shell
make up # starts the FastAPI backend and database
cd services/frontend && npm i && npm run start
```

## Docs

- https://github.com/compose-spec/compose-spec/blob/master/spec.md
- https://docs.docker.com/compose/compose-file/
