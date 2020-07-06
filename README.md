# Nuxx Visual Docker Composer

## Local setup

On a Mac/Linux/Windows you need Docker, Docker Compose installed. Optionally GCC to run make commands for convenience, or just run the commands from the Makefile by hand.

To get the tool working locally,  just run:

```shell script
$ docker-compose local_setup
```

... this command will bring up the backend, the database, sync migrations, and build and serve the Angular app in an Nginx container (for working locally with the tool).  For production, you can build and deploy your own images or use mine as a base.

## Local development

- You can run the backend in dev mode with `make backend_dev`.
- For developing the frontend run `cd ./src/composer && npm run start`.  It will expect the backend connection on http://localhost:9001/api, but you can change this to your liking in src/composer/src/environment/environment.ts.

## Project roadmap

- Ongoing improvements and features for docker compose yaml generation.
- Kubernetes yaml generation.
- Application stack deployments directly from the web tool and CLI.
- Nuxx CLI.

For anynone interested on trying out deployments, and the CLI,  please message me on Slack.  These features need some more work and testing.
