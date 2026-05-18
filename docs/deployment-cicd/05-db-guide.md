# DB 작업 설명서

## 기준

Travel Hunter는 PostgreSQL 16을 사용한다. schema 변경은 Alembic migration으로만 반영한다.

현재 SQL 기준본:

```text
docs/db-schema-v0.3.sql
```

## 로컬 DB

```bash
docker compose -f compose.yaml up -d db
```

접속 정보:

```text
host: 127.0.0.1
port: 55432
database: travelhunter
user: travelhunter
password: travelhunter
```

로컬 `DATABASE_URL`:

```text
postgresql+psycopg://travelhunter:travelhunter@127.0.0.1:55432/travelhunter
```

## Migration 원칙

- Alembic revision을 통해 schema를 변경한다.
- model 변경과 migration 변경은 같은 PR에 포함한다.
- 운영 DB를 수동 SQL로 먼저 고치지 않는다.
- public API shape가 바뀌면 contract와 frontend/backend 타입을 같이 갱신한다.
- rollback이 어려운 변경은 배포 전에 backup 계획을 먼저 작성한다.

## Migration 적용

로컬:

```bash
cd backend
alembic upgrade head
```

서버 Docker Compose:

```bash
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml run --rm backend alembic upgrade head
```

배포 전 SQL preview:

```bash
cd backend
alembic upgrade head --sql
```

## Seed

개발/스테이징 초기 데이터:

```bash
cd backend
python -m app.db.seed
```

Docker Compose:

```bash
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml run --rm backend python -m app.db.seed
```

운영에서 seed를 실행할지 여부는 release checklist에서 명시한다. 운영 데이터가 있는 환경에서는 seed가 idempotent인지 확인한 뒤 실행한다.

## Backup 기준

운영 migration 전에는 DB backup을 남긴다.

예시:

```bash
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml exec db pg_dump -U <postgres-user> <postgres-db> > backup-YYYYMMDD-HHMM.sql
```

backup 파일은 repo에 커밋하지 않는다.

## Secret 관리

다음 값은 repo에 커밋하지 않는다.

- `POSTGRES_PASSWORD`
- `DATABASE_URL`
- DB backup 파일
- 운영 `.env`

Jenkins에서는 credentials 또는 운영 PC의 로컬 env 파일로만 관리한다.

