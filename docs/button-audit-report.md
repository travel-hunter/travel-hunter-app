# Travel Hunter 버튼 Audit 수정 보고서

## 기준

- 실행 모드: DB-backed-only
- 점검 목적: 실제 웹 화면에서 보이는 버튼/링크/CTA 중 `Broken`, `Partial`, `Placeholder`로 분류된 항목을 사용자 흐름 기준으로 수정한다.
- 기준 계정: `test.user@example.com / password123`
- 기존 untracked `docs/requirements.md`는 이번 작업 범위에서 제외한다.

## 수정 완료 항목

| 화면 | 기존 상태 | 수정 결과 | 상태 |
|---|---|---|---|
| `/login` 비밀번호 찾기 | 버튼은 있으나 실제 흐름 없음 | `/forgot-password` 화면과 `POST /api/auth/password-reset/request` 연결 | Fixed |
| `/reset-password?token=...` | 화면 없음 | 새 비밀번호 설정 화면과 `POST /api/auth/password-reset/confirm` 연결 | Fixed |
| `/login` Kakao 로그인 | 테스트 계정 로그인처럼 동작 | `GET /api/auth/oauth/kakao/start` authorization code flow 시작 링크로 변경 | Fixed |
| `/login` Google 로그인 | 테스트 계정 로그인처럼 동작 | `GET /api/auth/oauth/google/start` OpenID Connect flow 시작 링크로 변경 | Fixed |
| OAuth callback | 화면 없음 | `/oauth/callback`에서 refresh cookie 기반 세션 복구 후 원래 redirect로 이동 | Fixed |
| `/policies/{slug}` 공유 | 친구 초대 화면으로 이동해 의미가 어긋남 | 현재 정책 URL을 clipboard에 복사하고 toast 표시 | Fixed |
| `/policies/{slug}` 필요 서류 | 클릭 가능한 button처럼 보이나 동작 없음 | 정적 checklist row로 변경 | Fixed |
| `/friend-invite` 초대 발송 문구 | 실제 외부 발송처럼 보임 | “초대 링크 활성화”, “초대 링크가 준비됐어요” 문구로 정정 | Fixed |
| `/ai-results` 추천 기준 아이콘 | handler 없는 placeholder | 추천 기준 설명 bottom sheet 추가 | Fixed |

## 새 Backend 기능

- `password_reset_tokens` 테이블 추가.
- reset token은 raw 값을 저장하지 않고 SHA-256 hash만 저장한다.
- 비밀번호 재설정 요청은 계정 존재 여부를 노출하지 않고 기본적으로 `{ "requested": true }`를 반환한다.
- SMTP가 설정되지 않은 상태에서 실제 계정의 reset email을 보내야 하면 `503 Email delivery is not configured`로 실패한다.
- reset 성공 시 기존 refresh token을 revoke한다.
- Kakao/Google OAuth start/callback endpoint를 추가했다.
- OAuth state는 HttpOnly cookie로 검증하고, callback 성공 시 refresh cookie를 설정한 뒤 frontend `/oauth/callback`으로 이동한다.

## 새 Frontend 기능

- `/forgot-password`
- `/reset-password?token=...`
- `/oauth/callback`
- 로그인 화면의 비밀번호 찾기, Kakao 로그인, Google 로그인 연결.
- 정책 공유 링크 복사 toast.
- AI 추천 기준 설명 sheet.
- 필요 서류 static checklist.
- 친구 초대 링크 활성화 문구 정리.

## 남은 조건부 동작

- 비밀번호 재설정 email은 SMTP 환경변수가 있어야 실제 발송된다.
- Kakao/Google OAuth는 provider client id/secret/redirect URI가 있어야 실제 로그인된다.
- 친구 초대의 email/SMS/Kakao 외부 발송은 아직 구현하지 않는다. 현재 범위는 초대 링크 생성/권한 저장/수락이다.
- 정책 공유는 Web Share API가 아니라 clipboard 복사만 지원한다.

## 검증 결과

- `cd backend && python -m pytest`: 160 passed.
- `cd frontend && npm test`: 36 passed.
- 추가 검증은 `CHECKLIST.md`의 최신 결과를 따른다.
