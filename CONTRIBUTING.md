# 🤝 트레블헌터 앱 기여 가이드

> 이 문서는 `travel-hunter-app` 레포에 처음 기여하는 팀원을 위한 안내서입니다.
> 스터디 레포(`travel-hunter-study`)의 PR 흐름을 먼저 익히고 오세요!

---

## 📌 목차

1. [브랜치 전략](#1-브랜치-전략)
2. [커밋 메시지 규칙](#2-커밋-메시지-규칙)
3. [기여 흐름](#3-기여-흐름)
4. [PR 규칙](#4-pr-규칙)
5. [자주 하는 실수](#5-자주-하는-실수)

---

## 1. 브랜치 전략

```
main          # 최종 배포 브랜치 🔒 (PR + 리뷰 1명 필수)
develop       # 개발 통합 브랜치 🔒 (PR 필수)
feature/기능명  # 기능 개발
fix/버그명      # 버그 수정
docs/문서명     # 문서 작업
infra/작업명    # 인프라 작업
```

### 브랜치 흐름

```
feature/기능명
      ↓ PR
develop (통합 테스트)
      ↓ PR + 리뷰 1명
main (배포)
```

> ⚠️ **main, develop에 직접 푸시 금지!**
> 반드시 PR을 통해서만 머지할 수 있어요.

---

## 2. 커밋 메시지 규칙

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

---

## 3. 기여 흐름

### 새 기능 개발할 때

**① develop 기준으로 새 브랜치 생성**

GitHub 웹에서:
- 브랜치 드롭다운 클릭 (`develop ▼`)
- 브랜치 이름 입력: `feature/기능명`
- **"Create branch: feature/기능명 from develop"** 클릭

> ⚠️ 반드시 `develop` 기준으로 만들어야 해요!
> `main` 기준으로 만들면 다른 팀원 작업이 빠진 채로 시작돼요.

브랜치 이름 예시:
```
feature/kakao-login
feature/travel-policy-api
fix/jwt-token-expiry
docs/api-spec-update
infra/terraform-vpc
```

**② 작업 후 커밋**

커밋 메시지 규칙 지켜서 커밋!

**③ develop으로 PR 생성**

- base: `develop` ← 꼭 확인!
- compare: `feature/기능명`

**④ PR 머지 → 브랜치 삭제**

**⑤ develop → main PR은 팀장이 관리**

> 배포 준비가 됐을 때 팀장이 develop → main PR을 생성하고,
> 팀원 1명 이상의 리뷰 후 머지합니다.

---

## 4. PR 규칙

### PR 제목
```
type: 작업 내용 요약

예시:
feat: 카카오 소셜 로그인 구현
fix: JWT 토큰 만료 오류 수정
```

### PR 본문 템플릿
```markdown
## 📌 변경 내용
- 

## 🔍 변경 이유
- 

## ✅ 체크리스트
- [ ] 코드 동작 확인
- [ ] 관련 문서 업데이트
- [ ] 불필요한 코드·주석 제거

## 📸 스크린샷 (UI 변경 시)

```

### PR 규칙 요약

| 브랜치 | 리뷰어 | 머지 방식 |
| --- | --- | --- |
| `feature` → `develop` | 없어도 OK | Create a merge commit |
| `develop` → `main` | **1명 필수** | Create a merge commit |

---

## 5. 자주 하는 실수

| 실수 | 해결 방법 |
| --- | --- |
| main 기준으로 브랜치 만들었어요 | 브랜치 삭제 후 develop 기준으로 다시 생성 |
| develop에 직접 푸시하려 했어요 | PR로만 머지 가능, 새 브랜치에서 작업 |
| PR base를 main으로 했어요 | PR 편집에서 base를 develop으로 변경 |
| 브랜치 삭제를 깜빡했어요 | 레포 → branches → 🗑️ 클릭 |
| 커밋 메시지 규칙 안 지켰어요 | 다음 커밋부터 지키면 OK |

---

*last updated: 2026-04-23*
