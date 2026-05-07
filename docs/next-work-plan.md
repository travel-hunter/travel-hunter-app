# Travel Hunter 다음 작업 우선순위

## 기준

- DB-backed-only 원칙을 유지한다.
- Runtime mock mode는 다시 추가하지 않는다.
- 기능 변경 시 API 계약, frontend type, backend schema/test를 함께 갱신한다.
- 실제 secret/env 값은 repo에 기록하지 않는다.

## 완료된 최근 작업

- 일정 장소 추가/수정/삭제.
- 마이페이지 프로필 편집.
- AI 추천 결과를 일정 타임라인에 추가.
- 초대 role 저장과 viewer/editor 편집 권한 enforcement.
- 마감 알림 설정, 연락처 저장, 대상 계산, scheduler, SOLAPI adapter, retry, webhook 추적.
- 버튼 audit 기반 수정:
  - 비밀번호 재설정 flow.
  - Kakao/Google OAuth flow.
  - 정책 링크 복사.
  - 필요 서류 static checklist.
  - 친구 초대 링크 활성화 문구.
  - AI 추천 기준 sheet.
- 일단체크인 벤치마크 분석 문서화.
- Production sourcemap 비공개 명시.
- PWA manifest/meta 1차 적용.

## 다음 우선순위

| 우선순위 | 작업 | 성공 기준 |
|---:|---|---|
| 1 | Web Share API 공유 fallback | 정책/초대 링크 공유가 share API, clipboard, legacy copy 순서로 동작 |
| 2 | Password reset SMTP staging smoke | SMTP env를 주입해 reset email 발송, 링크 진입, password confirm을 외부 URL 기준으로 확인 |
| 3 | Kakao/Google OAuth staging smoke | provider console redirect URI와 env 값을 맞추고 실제 social login callback/refresh를 확인 |
| 4 | Cloudflare Tunnel staging smoke | 외부 HTTPS URL에서 `/api/health`, 로그인, 정책/일정 핵심 흐름 확인 |
| 5 | PWA service worker/offline 전략 검토 | offline 캐싱 도입 여부와 update 전략을 별도 설계로 결정 |

## Fast Lane

```powershell
cd frontend
npm run typecheck
npm test

cd ..\backend
python -m pytest
```

Migration이 바뀌면 추가로 실행한다.

```powershell
cd backend
alembic upgrade head --sql
```

## Release Gate

```powershell
cd frontend
npm run build
npm run test:e2e

cd ..
docker compose -f compose.yaml config
docker compose --env-file deploy/.env.staging.example -f compose.vps.yaml config
docker compose --env-file deploy/.env.tunnel.example -f compose.tunnel.yaml config
```
