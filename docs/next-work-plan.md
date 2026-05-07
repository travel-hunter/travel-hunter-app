# Travel Hunter 다음 기능 구현 우선순위

## 기준

- 배포, Jenkins, Figma 후속 작업은 기능 우선순위에서 제외한다.
- 현재 MVP는 DB-backed-only 흐름이다.
- 최근 기능 패스는 장소 편집, 마이페이지 프로필 편집, AI 추천 일정 추가, 초대 권한 저장/enforcement, 마감 알림 설정 저장, 알림 연락처 저장 기반까지 완료했다.

## 완료된 최근 기능

1. 일정 상세 장소 추가/수정/삭제
   - `/trips/:id`에서 `trip_places` 기반 장소 CRUD를 지원한다.
2. 마이페이지 프로필 편집
   - `/mypage`에서 `PATCH /api/me/profile`로 지역/스타일/예산을 저장한다.
3. AI 추천 결과 일정 추가
   - `/ai-results` 추천 항목을 기존 장소 추가 API로 일정 타임라인에 저장한다.
4. 초대 링크 권한 저장과 enforcement
   - `/friend-invite?tripId=...`에서 `viewer/editor`를 저장한다.
   - `Trip.currentUserRole`로 현재 사용자 권한을 반환한다.
   - `viewer`는 조회만 가능하고 장소 편집 요청은 `403 Trip edit permission required`를 반환한다.
5. 마감 알림 설정 저장
   - `/mypage`에서 정책 마감 알림 전체 켜기/끄기를 저장한다.
6. 마감 알림 발송 기반 설계
   - `docs/notification-delivery-plan.md`에 카카오 알림톡, FastAPI 내부 scheduler, D-7/D-1 대상 계산, 발송 이력 저장 방향을 확정했다.
7. 마감 알림 발송 구현 준비
   - `/mypage`에서 카카오 알림톡 연락처를 저장한다.
   - `users.phone_number`, `users.phone_verified_at`, `notification_deliveries` 기반을 추가한다.

## 다음 우선순위

| 우선순위 | 작업 | 성공 기준 |
|---:|---|---|
| 1 | 마감 알림 대상 계산 service | 저장 정책 기준 D-7/D-1 대상, 사용자 알림 설정, 연락처 검증 여부, 기존 delivery 중복 여부를 DB-backed service로 계산한다. |
| 2 | FastAPI 내부 scheduler 구현 | `NOTIFICATION_SCHEDULER_ENABLED=true`일 때 하루 한 번 대상 계산과 dry-run 발송 이력 생성을 실행한다. |
| 3 | 카카오 알림톡 provider 연결 | 승인된 템플릿과 secret이 준비되면 real provider adapter를 연결한다. |
| 4 | 소셜 로그인 OAuth | staging URL과 provider secret이 확정되면 Kakao 또는 Google부터 연결한다. |
| 5 | Cloudflare Tunnel staging 배포 재개 | 기능 패스가 멈추거나 release staging으로 복귀할 때 실제 외부 URL smoke를 진행한다. |

## Fast Lane

```powershell
cd frontend
npm run typecheck
npm test

cd ..\backend
python -m pytest
```

Migration이 변경되면 추가로 실행한다.

```powershell
cd backend
alembic upgrade head --sql
```

## 주의사항

- Runtime mock mode를 다시 추가하지 않는다.
- `trips.slug`를 추가하지 않는다.
- 마감 알림 1차 대상은 저장 정책(`user_saved_policies`)으로 제한한다.
- 카카오 알림톡 실제 발송은 비즈니스 채널, 템플릿 승인, provider secret이 준비된 뒤 진행한다.
- API shape가 바뀌면 `docs/mvp-api-contract.md`, frontend type, backend schema를 함께 갱신한다.
