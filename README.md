# Container ToolKit

Visually generate docker compose manifests and deploy apps to AWS ECS (coming soon).

![Alt text](https://ctk-public.s3.amazonaws.com/ui.png?raw=true "UI")

## Local setup and development

On a Mac/Linux/Windows you need Docker, Docker Compose installed. Optionally GCC to run make commands for convenience, or just run the commands from the Makefile by hand.

To get the tool working locally,  just run:

```shell script
make up
make local_server_init
make dev_server
cd services/frontend && npm i && npm run start
```

### Server

```bash
make up
make local_server_init
make dev_server
```

... this command will bring up the backend, the database, sync migrations,

## Project roadmap

- Kubernetes manifest generation.
- ECS deployment.
- K8S deployment.

## Docs

- https://docs.jsplumbtoolkit.com/community/
- https://github.com/compose-spec/compose-spec/blob/master/spec.md
- https://docs.docker.com/compose/compose-file/
