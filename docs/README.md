# 🧳 트레블헌터 (Travel Hunter)

> 국내 여행 지원 정책과 혜택을 한눈에 모아보고, 실제 여행 계획과 연결해주는 국내 여행 플랫폼

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 📌 프로젝트 소개

트레블헌터는 흩어져 있는 국내 여행 할인·지원금 정보를 통합 조회하고,
AI 기반 맞춤 일정 추천으로 실제 여행 계획에 바로 적용할 수 있도록 돕는 플랫폼입니다.

**핵심 가치: "알뜰 스마트 여행"**

## 👥 팀

| 이름 | GitHub | 역할 |
| --- | --- | --- |
| 팀원1 | [@아이디](https://github.com/아이디) | |
| 팀원2 | [@아이디](https://github.com/아이디) | |
| 팀원3 | [@아이디](https://github.com/아이디) | |
| 팀원4 | [@아이디](https://github.com/아이디) | |
| 팀원5 | [@아이디](https://github.com/아이디) | |
| 팀원6 | [@아이디](https://github.com/아이디) | |

## 🛠️ 기술 스택

| 분류 | 기술 |
| --- | --- |
| **Frontend** | React.js, React Native |
| **Backend** | Python, FastAPI |
| **Database** | PostgreSQL (AWS RDS) |
| **Infra** | AWS (VPC, EC2, EKS, RDS, S3, CloudFront) |
| **Container** | Docker, ECR |
| **Orchestration** | Kubernetes (EKS), Argo CD |
| **CI/CD** | GitHub Actions, AWS CodeDeploy |
| **IaC** | Terraform |
| **Monitoring** | Grafana, CloudWatch |
| **AI** | Claude API, OpenAI Codex |
| **협업** | GitHub, Slack, Notion |

## 📂 레포지토리 구조

```
travel-hunter-app/
├── frontend/      # React.js 웹 프론트엔드
├── backend/       # FastAPI 백엔드 API 서버
├── infra/         # Terraform AWS 인프라 코드
├── k8s/           # 쿠버네티스 매니페스트
└── docs/          # 설계 문서 (ERD, API명세서 등)
```

## 🗓️ 프로젝트 일정

| 단계 | 기간 | 내용 |
| --- | --- | --- |
| **0단계** 기획·스터디 | 04/23 ~ 04/30 | Git, Linux, Docker 기초 스터디 + 설계 문서 작성 |
| **1단계** 온프레미스 개발 | 05/01 ~ 05/31 | FastAPI + React 개발, Docker 배포, CI/CD |
| **2단계** 클라우드 마이그레이션 | 06/01 ~ 06/14 | Terraform, AWS 마이그레이션, 보안 강화 |
| **3단계** Kubernetes 전환 | 06/15 ~ 07/15 | EKS, Argo CD GitOps, 모니터링, 부하 테스트 |

## 🌿 브랜치 전략

```
main          # 배포 브랜치 (직접 푸시 금지 🔒, PR + 리뷰 1명 필수)
develop       # 개발 통합 브랜치 (직접 푸시 금지 🔒, PR 필수)
feature/기능명  # 기능 개발 브랜치
fix/버그명      # 버그 수정 브랜치
docs/문서명     # 문서 작업 브랜치
infra/작업명    # 인프라 작업 브랜치
```

## ✍️ 커밋 메시지 규칙

```
type: 작업 내용 요약

예시:
feat: 카카오 소셜 로그인 구현
fix: JWT 토큰 만료 오류 수정
docs: API 명세서 업데이트
infra: Terraform VPC 모듈 추가
ci: GitHub Actions 배포 파이프라인 구성
```

| type | 사용 상황 |
| --- | --- |
| `feat` | 새 기능 추가 |
| `fix` | 버그 수정 |
| `docs` | 문서 수정 |
| `style` | 코드 포맷 변경 |
| `refactor` | 코드 리팩토링 |
| `test` | 테스트 추가·수정 |
| `infra` | 인프라 코드 변경 |
| `ci` | CI/CD 설정 변경 |

## 🤝 기여 방법

[CONTRIBUTING.md](CONTRIBUTING.md) 를 참고해주세요.

## 📜 라이선스

[MIT License](LICENSE)
