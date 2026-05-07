# Travel Hunter 다음 기능 구현 우선순위

## 기준

- 배포, Jenkins, Figma 후속 작업은 기능 우선순위에서 제외한다.
- MVP는 DB-backed-only 흐름이다.
- 최근 기능 패스는 장소 편집, 마이페이지 프로필 편집, AI 추천 일정 추가, 초대 권한 저장/enforcement, 마감 알림 설정 저장, 알림 연락처 저장, 마감 알림 대상 계산 service, FastAPI 내부 scheduler, SOLAPI Kakao AlimTalk provider adapter, 알림 retry 정책까지 완료했다.

## 다음 우선순위

| 우선순위 | 작업 | 성공 기준 |
|---:|---|---|
| 1 | SOLAPI 웹훅 배송 상태 추적 | provider 최종 배송 결과를 `notification_deliveries`에 반영한다. |
| 2 | 소셜 로그인 OAuth | staging URL과 provider secret 확정 후 Kakao 또는 Google부터 연결한다. |
| 3 | Cloudflare Tunnel staging 배포 재개 | 기능 패스가 멈추거나 release staging으로 복귀할 때 외부 URL smoke를 진행한다. |

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

## 주의사항

- Runtime mock mode를 다시 추가하지 않는다.
- `trips.slug`를 추가하지 않는다.
- 마감 알림 1차 대상은 저장 정책(`user_saved_policies`)으로 제한한다.
- 실제 카카오 알림톡 발송은 비즈니스 채널, 승인 템플릿, provider secret 준비 후 진행한다.
- API shape가 바뀌면 `docs/mvp-api-contract.md`, frontend type, backend schema를 함께 갱신한다.
