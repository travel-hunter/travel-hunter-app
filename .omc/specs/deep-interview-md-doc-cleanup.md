# Deep Interview Spec: 프로젝트 .md 문서 정리 및 삭제

## Metadata
- Interview ID: di-md-cleanup-20260604
- Rounds: 6
- Final Ambiguity Score: 7.95%
- Type: brownfield
- Generated: 2026-06-04
- Threshold: 0.08
- Threshold Source: ./.claude/settings.json
- Initial Context Summarized: no
- Status: PASSED

## Clarity Breakdown
| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Goal Clarity | 0.93 | 0.35 | 0.326 |
| Constraint Clarity | 0.92 | 0.25 | 0.230 |
| Success Criteria | 0.92 | 0.25 | 0.230 |
| Context Clarity | 0.90 | 0.15 | 0.135 |
| **Total Clarity** | | | **0.921** |
| **Ambiguity** | | | **0.079** |

## Topology
| Component | Status | Description | Coverage / Deferral Note |
|-----------|--------|-------------|--------------------------|
| omx-cleanup | active | `.omx/`(76 md, 71 untracked) + `.omc/` AI 워크플로우 산출물 | 커밋후 disk 완전삭제 + gitignore (R1,R4,R5) |
| docs-curation | active | `docs/`(21 tracked) 현행 유지/낡은 것 삭제 | 직접참조 규칙으로 keep/delete (R2,R3) |
| root-functional-docs | active | README/CONTRIBUTING/PLANS/CHECKLIST/AGENTS.md/.agent/skills | 진입점·SKILL 예외 유지, 직접참조만 keep (R3) |
| recurrence-prevention | active | AI 산출물 재발 방지 | `.omx/` `.omc/` gitignore 등록 (R5) |

## Goal
프로젝트 전반에 흩어진 `.md` 문서를 다음 규칙으로 정리한다: **(1)** 현재 상태를 git에 커밋해 복구 지점을 만든 뒤, **(2)** AGENTS.md/README가 **직접 참조**하는 문서와 진입점/시스템 문서(AGENTS.md, README.md, CONTRIBUTING.md, `.agent/skills/*/SKILL.md`)만 유지하고 나머지 고아·시점성 문서는 **disk에서 완전 삭제**하며, **(3)** `.omx/`·`.omc/`를 `.gitignore`에 등록해 AI 산출물 재발을 막는다. 실행 전 구체적 keep/delete 목록을 **1회 사용자 승인** 받는다.

## Constraints
- **안전장치(필수):** 어떤 삭제든 그 전에 현재 working tree 전체를 git에 커밋한다. 따라서 모든 삭제는 git 이력에서 복구 가능해야 한다.
- **삭제 의미:** gitignore만이 아니라 disk에서 실제 제거한다 (단 git 이력엔 보존).
- **유지 규칙(직접참조):** AGENTS.md/README가 경로/이름으로 직접 가리키는 문서만 유지. 다른 문서를 거쳐 전이적으로만 연결된 문서는 삭제.
- **진입점 예외(절대유지):** AGENTS.md(×4), README.md, CONTRIBUTING.md, `.agent/skills/*/SKILL.md`(×5)는 무엇에도 참조되지 않아도 유지.
- **제외 대상(건드리지 않음):** `backend/.venv/**`, `node_modules/**`, `.github/**`, `.git/**`.
- **dry-run 게이트:** 규칙 적용 결과 keep/delete 목록을 사용자에게 제시하고 승인 후에만 삭제 실행. 코드/CI가 경로로 참조하는 문서는 이 목록 검토 단계에서 식별·구제한다.

## Non-Goals
- AI 산출물을 로컬에 보존하는 것 (사용자는 disk 완전삭제를 선택).
- 문서 내용 재작성·통합·리라이트 (이번 작업은 정리/삭제이지 내용 개편이 아님).
- `.gitignore` 외의 툴(OMC/OMX) 설정 변경.
- 코드/CI 참조 문서를 사전에 전수 정의하는 것 (dry-run 목록 검토로 대체).

## Acceptance Criteria
- [ ] 삭제 실행 전, 현재 working tree 전체가 단일 커밋으로 git 이력에 기록되어 있다.
- [ ] 규칙(직접참조 + 진입점 예외)을 적용한 keep/delete 파일 목록이 생성되어 사용자 승인을 받았다.
- [ ] 승인된 delete 목록의 파일이 disk에서 제거되었다.
- [ ] `.omx/`(76개)와 `.omc/` 산출물이 정리되고, 두 경로가 `.gitignore`에 등록되어 있다.
- [ ] 유지 대상(진입점 + 직접참조 문서)은 모두 그대로 존재한다.
- [ ] `git ls-files`에 `.omx/`·`.omc/` 추적 파일이 더 이상 없다.
- [ ] 정리 후 빌드/테스트(frontend·backend)가 깨지지 않는다 (코드/CI 참조 문서 누락 없음 확인).
- [ ] 삭제된 모든 것이 직전 안전 커밋에서 복구 가능하다.

## Assumptions Exposed & Resolved
| Assumption | Challenge | Resolution |
|------------|-----------|------------|
| 그냥 지우면 된다 | .omx 71개가 untracked → 영구소실 (R1) | 커밋후 삭제로 복구지점 확보 |
| "삭제 가능"이 자명하다 | 판별 규칙 없음 (R2) | AGENTS.md/README 참조 기준 |
| "참조"의 뜻이 자명하다 | AGENTS.md 자체·SKILL.md 처리 (R3) | 직접참조만 유지 + 진입점 예외 |
| 최대한 삭제 = disk 소멸 | gitignore로 repo만 정리 vs disk 삭제 (R4 Contrarian) | disk 완전삭제 선택 (git 복구 가능) |
| 일회성 정리면 끝 | AI 툴이 또 쌓음 (R5) | .omx/.omc gitignore 등록 |
| 모든 엣지를 사전 정의해야 함 | 복잡도 과다 (R6 Simplifier) | dry-run 목록 1회 승인으로 단순화 |

## Technical Context (brownfield)
- 총 `.md`(서드파티 제외) 약 60개. 분포: `.omx/`=76(추적 5/미추적 71), `docs/`=20(추적 21, 일부 이미 worktree에서 M/D), `.agent/skills/`=5(SKILL.md), AGENTS.md×4, 루트 README/CONTRIBUTING/PLANS/CHECKLIST.
- `.omc/`는 `.md` 없음(state 디렉터리, 이 인터뷰 state 포함, untracked).
- `.superpowers/`는 이미 `.gitignore` 232줄에 등록됨; 실제 내용은 추적되는 `docs/superpowers/`에 있고 worktree에서 이미 삭제 진행 중.
- 제외: `backend/.venv/**`(8 md, 서드파티), `.github/**`, `node_modules/**`.
- 실행 1단계 = 규칙 적용 dry-run 목록 생성(read-only grep로 AGENTS.md/README 참조 스캔).

## Ontology (Key Entities)
| Entity | Type | Fields | Relationships |
|--------|------|--------|---------------|
| AI 워크플로우 산출물 | core domain | path, tracked?, age | `.omx/`·`.omc/`에 존재, gitignore 대상 |
| 프로젝트 문서 | core domain | path, referenced?, type(상시/시점성) | AGENTS.md/README가 참조 |
| 기능성 문서 | supporting | AGENTS.md, README, CONTRIBUTING, SKILL.md | 진입점 예외 유지 |
| 참조 그래프 | core domain | source, target, direct? | 유지/삭제 판정의 근거 |
| git 커밋(안전장치) | external system | commit hash | 삭제 전 복구지점 |
| .gitignore 정책 | supporting | patterns | `.omx/`·`.omc/` 추가 |
| dry-run 승인 목록 | supporting | keep[], delete[] | 사용자 승인 게이트 |

## Ontology Convergence
| Round | Entity Count | New | Changed | Stable | Stability Ratio |
|-------|-------------|-----|---------|--------|----------------|
| 1 | 5 | 5 | - | - | N/A |
| 2 | 6 | 1 | 0 | 5 | 83% |
| 3 | 6 | 0 | 0 | 6 | 100% |
| 4 | 6 | 0 | 0 | 6 | 100% |
| 5 | 7 | 1 | 0 | 6 | 100% |
| 6 | 7 | 0 | 0 | 7 | 100% |

## Interview Transcript
<details>
<summary>Full Q&A (6 rounds)</summary>

### Round 1 — omx-cleanup / Constraints
**Q:** 삭제 안전장치를 어떻게 가져갈까요? (.omx 71개 untracked)
**A:** 커밋 후 삭제 (git 이력 보존 → 복구 가능)
**Ambiguity:** 47% (Goal 0.45, Constraints 0.65, Criteria 0.35, Context 0.80)

### Round 2 — docs-curation / Goal
**Q:** 유지 vs 삭제 판별 규칙은?
**A:** AGENTS.md/README 참조 기준 — 참조되는 문서만 유지, 고아 삭제
**Ambiguity:** 32%

### Round 3 — root-functional-docs / Goal
**Q:** "참조됨=유지"의 범위(진입점/SKILL 보호 포함)?
**A:** 직접 참조만 유지 + 진입점/SKILL 예외 유지, 전이참조는 삭제
**Ambiguity:** 19%

### Round 4 — omx-cleanup / Goal [Contrarian]
**Q:** disk에서 없앨까, repo에서만 뺄까(gitignore)?
**A:** disk에서도 완전 삭제 (커밋후삭제로 git 복구 가능)
**Ambiguity:** 14.5%

### Round 5 — recurrence-prevention / Goal
**Q:** 재발 방지 정책은?
**A:** .omx/ .omc/ 를 .gitignore에 등록
**Ambiguity:** 11.4%

### Round 6 — Success Criteria [Simplifier]
**Q:** 실행 전 keep/delete 목록 1회 승인 방식이 괜찮은가?
**A:** dry-run 목록 1회 승인
**Ambiguity:** 7.95% → PASSED
</details>
