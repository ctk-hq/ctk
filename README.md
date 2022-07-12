# Container ToolKit

![Alt text](/screenshots/ui.png?raw=true "UI")

## Local setup and development

On a Mac/Linux/Windows you need Docker, Docker Compose installed. Optionally GCC to run make commands for convenience, or just run the commands from the Makefile by hand.

To get the tool working locally,  just run:

```shell script
$ make local_setup
$ make run_server
$ cd services/frontend && npm run start
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