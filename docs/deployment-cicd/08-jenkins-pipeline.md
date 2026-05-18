# Jenkins Pipeline 설명서

## 역할

Jenkins는 다음 단계에서 개발 PC에 설치할 CD 도구다. 현재 GitHub Actions가 PR/푸시 검증용 CI를 담당하며, Jenkinsfile과 배포 스크립트가 추가되기 전까지 실제 서버 배포는 수동 runbook을 따른다.

목표 흐름:

```text
GitHub push/merge
-> Jenkins checkout
-> test/build
-> SSH to target server
-> git pull or checkout
-> docker compose build
-> migration
-> docker compose up -d
-> smoke test
```

## Jenkins 설치 위치

권장:

```text
개발 PC
```

운영 PC에는 Jenkins를 두지 않는다. 운영 PC는 앱 컨테이너, DB, Caddy, Cloudflare Tunnel만 실행한다.

## 필요한 Jenkins credentials

Jenkins credentials에만 저장한다.

- `github-deploy-key`: GitHub repo checkout key.
- `prod-ssh-key`: 운영 PC SSH key.
- `dev-ssh-key`: 개발 서버 SSH key.
- `prod-env-file` 또는 운영 PC 로컬 `deploy/.env.prod`.
- `dev-env-file` 또는 개발 PC 로컬 `deploy/.env.dev`.

secret 값을 Jenkinsfile, README, PR 본문에 직접 쓰지 않는다.

## Branch별 목표 동작

`develop` push:

- frontend typecheck/test.
- backend pytest.
- docker compose build.
- 개발 서버 배포.
- 개발 domain smoke test.

`main` push:

- frontend typecheck/test/build.
- backend pytest.
- docker compose config/build.
- 운영 PC SSH 배포.
- Alembic migration.
- 운영 domain smoke test.

## Jenkinsfile 검증 초안

이 문서는 pipeline 기준을 설명한다. 실제 `Jenkinsfile`과 배포 스크립트 추가는 다음 단계에서 별도 작업으로 진행한다.

아래 초안은 test/build 검증까지만 실행 가능한 형태다. 배포 stage는 없는 파일을 호출하지 않도록 의도적으로 제외했다.

```groovy
pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Frontend') {
      steps {
        dir('frontend') {
          sh 'npm ci'
          sh 'npm run typecheck'
          sh 'npm test'
          sh 'npm run build'
        }
      }
    }

    stage('Backend') {
      steps {
        dir('backend') {
          sh 'python -m pip install --upgrade pip'
          sh 'python -m pip install -r requirements.txt'
          sh 'python -m pytest'
        }
      }
    }

    stage('Compose Check') {
      steps {
        sh 'docker compose -f compose.yaml config'
      }
    }
  }
}
```

실제 CD 구현 시에는 별도 배포 스크립트를 추가하고 SSH target, env file, compose file, branch를 명확히 분기한다. 스크립트가 생기기 전에는 Jenkinsfile에서 배포 stage를 추가하지 않는다.

## 운영 PC 배포 명령 기준

운영 PC에서 Jenkins가 실행할 명령의 기준 형태:

```bash
cd /srv/travel-hunter-app
git fetch origin
git checkout main
git pull origin main
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml config
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml build
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml up -d db
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml run --rm backend alembic upgrade head
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml up -d
curl -fsS https://<prod-domain>/api/health
```

## 실패 시 기준

- test 실패: 배포하지 않는다.
- compose config 실패: env 누락 또는 compose 오류를 먼저 수정한다.
- migration 실패: app container를 새 버전으로 올리지 않는다.
- smoke test 실패: 직전 정상 commit으로 rollback한다.

Rollback 기준은 `09-release-checklist.md`를 따른다.
