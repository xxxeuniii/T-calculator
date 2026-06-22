# Deployment

Production deployment uses Docker Compose on the server. Local Windows development uses `start-all.bat`, which creates and uses `service/backend/.venv` for the Python backend.

## GitHub Secrets

Configure these repository secrets before pushing to `main`:

- `SERVER_HOST`: server IP or domain
- `SERVER_USER`: SSH user
- `SERVER_SSH_KEY`: private SSH key with access to the server
- `SERVER_DEPLOY_PATH`: optional, defaults to `/opt/apps/t-calculator`
- `SERVER_WEB_PORT`: optional, defaults to `80`
- `SERVER_PUBLIC_BASE_URL`: optional, defaults to `http://SERVER_HOST`

## Server Requirements

Install Docker and Docker Compose on the server. The deploy user must be able to run Docker commands.

## Manual Deploy

```bash
docker compose up -d --build
```

The frontend is served at `/t-calculator/`, and Nginx proxies `/api/` to the backend container.
