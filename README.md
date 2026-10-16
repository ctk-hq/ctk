<p align="center">
  <picture>
    <!-- Shows a dark/black version of the logo if the user is in Light Mode -->
    <source media="(prefers-color-scheme: light)" srcset="https://github.com">
    <!-- Shows your current light version of the logo if the user is in Dark Mode -->
    <source media="(prefers-color-scheme: dark)" srcset="https://github.com/user-attachments/assets/9a41025e-79ad-4137-bf32-4d75af5d6b3c">
    <!-- Fallback image -->
    <img width="250" height="70" alt="logo" src="https://github.com/user-attachments/assets/eeee004c-4ca1-4e26-9521-1fdf3ac4f3a2" />
  </picture>
</p>

<h1 align="center">Container Tool Kit</h1>

Generate Docker Compose and Kubernetes manifests visually, or let an AI agent do
the building.

Describe your stack in plain language. An LLM with browser access can use CTK to
create services, networks, and volumes, arrange the architecture, review the
generated manifests, and iterate on improvements. You can inspect and edit the
same project at any point, without wiring every component by hand.

Agents interact through the browser, or direct MCP, and can use their own Docker
and Kubernetes tooling to validate the output.

## Local setup and development

The frontend builder runs without Docker or the backend. Docker and Docker
Compose are needed for the backend stack; the Makefile provides optional
convenience commands.

To run the visual manifest builder locally:

```shell
cd services/frontend
npm ci
npm run dev
```
