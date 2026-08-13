# trade-tool project boundary

- This repository is an independent project. All backend code for trade-tool must live under `service/` in this repository.
- All trade-tool API routes, database access, migrations, Docker configuration, and deployment workflows must be implemented in this repository.
- Never add, modify, or depend on backend code in sibling repositories such as `E:\Demo\trade-agent` for trade-tool features.
- The production database may be a remote PostgreSQL instance, but it must be accessed only through `trade-tool/service` APIs.
- Production service credentials belong only in `/opt/apps/trade-tool/service/.env`; never read credentials or environment files from another project.
- Local frontend development on port 8081 must call the deployed `trade-tool` API directly and must not require a local backend process.
- Browser storage (`localStorage`, `sessionStorage`, IndexedDB) must not be used as the source of truth for attendance or calculator history. Those records are cloud-only.
