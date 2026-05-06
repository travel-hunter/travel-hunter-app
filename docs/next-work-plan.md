# Travel Hunter 다음 기능 구현 우선순위

## 기준

- 배포, Jenkins, Figma 후속 작업은 이 기능 우선순위에서 제외한다.
- 현재 MVP는 DB-backed-only 흐름이다.
- 다음 기능은 화면에 버튼/영역은 있지만 실제 동작이 부족한 기능부터 구현한다.

## 완료된 최근 기능

1. 일정 상세 장소 추가/수정/삭제
   - `/trips/:id`에서 장소 추가 sheet를 열 수 있다.
   - `trip_places`에 장소가 저장된다.
   - 장소 수정/삭제 후 최신 `Trip` 응답으로 타임라인을 갱신한다.
   - 새로고침 후에도 DB에 저장된 장소가 유지된다.
2. 마이페이지 프로필 편집 화면화
   - `/mypage`의 편집 버튼이 프로필 편집 sheet를 연다.
   - 지역, 여행 스타일, 예산을 draft로 수정한 뒤 `PATCH /api/me/profile`로 저장한다.
   - 저장 성공 후 마이페이지 프로필 요약을 갱신한다.
3. AI 추천 결과를 일정에 실제 추가
   - `/ai-results`의 추천 항목을 선택하면 기존 장소 추가 API를 재사용해 일정 타임라인에 저장한다.
   - 추천 `meta`의 `Day N` 또는 `N일차` 값을 기준으로 저장 일차를 정하고, 없으면 1일차에 저장한다.
   - 저장 성공 후 `/trips/{tripId}` 상세로 이동해 추가된 장소를 확인할 수 있다.

## 다음 우선순위

| 우선순위 | 작업 | 성공 기준 |
|---:|---|---|
| 1 | 초대 링크 권한 설정 저장 | 초대 권한 UI의 `viewer/editor` 선택을 저장하고, 초대 수락 후 `trip_members.role`에 반영한다. |
| 2 | 마감 알림 설정 저장 | 마이페이지 알림 설정을 DB에 저장한다. 실제 push/email 발송은 후속 작업으로 둔다. |
| 3 | 소셜 로그인 OAuth | staging URL과 provider secret이 확정되면 Kakao 또는 Google부터 연결한다. |
| 4 | Cloudflare Tunnel staging 배포 재개 | 기능 패스가 멈추거나 release staging으로 복귀할 때 실제 외부 URL smoke를 진행한다. |

## Fast Lane

```powershell
cd frontend
npm run typecheck
npm test

cd ..\backend
python -m pytest
```

## 주의사항

- runtime mock mode를 다시 추가하지 않는다.
- `trips.slug`를 추가하지 않는다.
- 실제 지도 API, 장소 검색 API, 이동 시간 계산은 별도 작업으로 둔다.
- API shape가 바뀌면 `docs/mvp-api-contract.md`, frontend type, backend schema를 같이 갱신한다.
