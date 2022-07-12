# Container ToolKit

![Alt text](/screenshots/ui.png?raw=true "UI")

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
python -m venv .env
source .env/bin/activate
python -m pip install -r services/backend/requirements.txt
python -m pip  install black

make dev_server
```

... this command will bring up the backend, the database, sync migrations,

## Project roadmap

- Complete react rewrite.
- Ongoing improvements and features for docker compose yaml generation.
- Kubernetes manifest generation.
- Deployment to user's ECS, K8S, GS accounts.

## Docs

- https://docs.jsplumbtoolkit.com/community/
- https://github.com/compose-spec/compose-spec/blob/master/spec.md
- https://docs.docker.com/compose/compose-file/