# Travel Hunter 향후 배포 확장 메모

## 현재 기준

- 현재 MVP release candidate는 Docker Compose 기반 staging-ready 구성을 기준으로 한다.
- 실행과 인수인계 기준은 `docs/release-candidate-handoff.md`를 따른다.
- Docker VPS staging smoke가 끝나기 전까지 Terraform, Kubernetes, Argo CD 설정 파일은 만들지 않는다.

## 후속 배포 방향 후보

### 1단계: Docker Compose staging

- 현재 기준이다.
- frontend, backend, PostgreSQL을 compose로 실행한다.
- domain, HTTPS, secret, 운영 DB 값이 정해지면 compose 기반 staging을 먼저 검증한다.

### 2단계: AWS 인프라 확장

- Terraform 기반 인프라 코드는 이 단계에서 추가한다.
- 후보 리소스:
  - VPC
  - EC2 또는 ECS
  - RDS PostgreSQL
  - S3/CloudFront
  - Secrets Manager 또는 SSM Parameter Store

### 3단계: EKS/GitOps 전환

- Kubernetes manifest와 Argo CD 설정은 EKS 전환이 실제 우선순위가 되었을 때 추가한다.
- 후보 구성:
  - EKS
  - Argo CD
  - HPA
  - Ingress/ALB Controller
  - External Secrets

## 정리 결정

- 기존 `infra/README.md`와 `k8s/README.md`는 실제 코드 없이 미래 계획만 담고 있었으므로 이 문서로 흡수했다.
- 루트에는 현재 실행 가능한 구조인 `frontend`, `backend`, `docs`, `.agent`, `.github`, `compose.yaml` 중심만 남긴다.
