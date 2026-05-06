# Travel Hunter 다음 기능 구현 우선순위

## 기준

- 배포, Jenkins, Figma 후속 작업은 기능 우선순위에서 제외한다.
- 현재 MVP는 DB-backed-only 흐름이다.
- 다음 기능은 화면에 UI는 있지만 실제 저장/동작이 부족한 영역부터 구현한다.

## 완료된 최근 기능

1. 일정 상세 장소 추가/수정/삭제
   - `/trips/:id`에서 장소 추가 sheet를 열 수 있다.
   - `trip_places`에 장소가 저장된다.
   - 장소 수정/삭제 후 최신 `Trip` 응답으로 타임라인을 갱신한다.
   - 새로고침 후에도 DB에 저장된 장소가 유지된다.
2. 마이페이지 프로필 편집 화면화
   - `/mypage` 편집 버튼이 프로필 편집 sheet를 연다.
   - 지역, 여행 스타일, 예산을 draft로 수정한 뒤 `PATCH /api/me/profile`로 저장한다.
   - 저장 성공 후 마이페이지 프로필 요약을 갱신한다.
3. AI 추천 결과를 일정에 실제 추가
   - `/ai-results` 추천 항목을 선택하면 기존 장소 추가 API를 재사용해 일정 타임라인에 저장한다.
   - 추천 `meta`의 `Day N` 또는 `N일차` 값을 기준으로 저장 일차를 정하고, 없으면 1일차에 저장한다.
   - 저장 성공 후 `/trips/{tripId}` 상세로 이동해 추가된 장소를 확인할 수 있다.
4. 초대 링크 권한 설정 저장
   - `/friend-invite?tripId=...`에서 `viewer/editor` 권한을 선택할 수 있다.
   - 선택 권한은 `trip_invites.role`에 저장된다.
   - 초대 수락 시 신규 `trip_members.role`에 invite role이 반영된다.
5. 마감 알림 설정 저장
   - `/mypage`에서 정책 마감 알림 전체 켜기/끄기를 토글할 수 있다.
   - 설정은 `user_notification_settings.deadline_enabled`에 사용자별로 저장된다.
   - 실제 push/email 발송은 후속 작업으로 둔다.
6. 초대 권한 enforcement
   - `Trip.currentUserRole`로 현재 사용자의 `owner/editor/viewer` 권한을 반환한다.
   - `viewer`는 일정 조회만 가능하고 장소 추가/수정/삭제 UI가 숨겨진다.
   - 접근 가능한 `viewer`의 장소 편집 API 요청은 `403 Trip edit permission required`를 반환한다.

## 다음 우선순위

| 우선순위 | 작업 | 성공 기준 |
|---:|---|---|
| 1 | 알림 발송 기반 설계 | 저장된 마감 알림 설정을 실제 push/email 발송 스케줄러와 연결하는 방식을 확정한다. |
| 2 | 소셜 로그인 OAuth | staging URL과 provider secret이 확정되면 Kakao 또는 Google부터 연결한다. |
| 3 | Cloudflare Tunnel staging 배포 재개 | 기능 패스가 멈추거나 release staging으로 복귀할 때 실제 외부 URL smoke를 진행한다. |

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
- 실제 지도 API, 장소 검색 API, 이동 시간 계산은 별도 작업으로 둔다.
- API shape가 바뀌면 `docs/mvp-api-contract.md`, frontend type, backend schema를 같이 갱신한다.
