-- =====================================================
-- Travel Hunter DB Schema v0.3
-- 한국폴리텍대학교 클라우드 컴퓨팅과
-- =====================================================
-- 작성일: 2026-05-04
-- DB    : PostgreSQL 15
-- 목적  : ERD v0.3 권장안 확정본
--
-- v0.2 -> v0.3 주요 변경 사항
--   1) policies.slug 추가, trips.slug는 추가하지 않음
--   2) trip_invites 테이블 추가
--   3) users 통합 구조 유지, gender 추가
--   4) 사용자 관심 지역 컬럼은 preferred_regions 사용
--   5) 일정 하위 테이블은 trip_* 단수 prefix로 통일
-- =====================================================


-- ─────────────────────────────────────────────────────
-- 사용자 (users)
-- ─────────────────────────────────────────────────────
CREATE TABLE users (
    id                    BIGSERIAL    PRIMARY KEY,
    email                 VARCHAR(255) UNIQUE NOT NULL,
    password_hash         VARCHAR(255),                         -- 소셜 로그인 시 NULL
    nickname              VARCHAR(50)  NOT NULL,
    birth_date            DATE,
    gender                VARCHAR(10),
    region                VARCHAR(50),
    preferred_regions     VARCHAR(255),
    residence_area        VARCHAR(50),
    onboarding_completed  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at            TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMP    NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────
-- JWT Refresh Token 저장소 (auth_refresh_tokens)
-- ─────────────────────────────────────────────────────
CREATE TABLE auth_refresh_tokens (
    id                    BIGSERIAL    PRIMARY KEY,
    user_id               BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash    VARCHAR(255) NOT NULL,
    created_at            TIMESTAMP    NOT NULL DEFAULT NOW(),
    expires_at            TIMESTAMP    NOT NULL,
    revoked_at            TIMESTAMP
);
CREATE INDEX idx_auth_refresh_tokens_user_id ON auth_refresh_tokens(user_id);


-- ─────────────────────────────────────────────────────
-- 소셜 계정 (social_accounts)
-- ─────────────────────────────────────────────────────
CREATE TABLE social_accounts (
    id                    BIGSERIAL    PRIMARY KEY,
    user_id               BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider              VARCHAR(20)  NOT NULL,                 -- kakao / google / ...
    provider_id           VARCHAR(100) NOT NULL,
    provider_nickname     VARCHAR(100),
    created_at            TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE (provider, provider_id)
);


-- ─────────────────────────────────────────────────────
-- 여행 지원 정책 (policies)
-- ─────────────────────────────────────────────────────
CREATE TABLE policies (
    id                    BIGSERIAL    PRIMARY KEY,
    slug                  VARCHAR(160) UNIQUE,
    title                 VARCHAR(200) NOT NULL,
    organization          VARCHAR(100),
    policy_type           VARCHAR(30),                          -- discount / subsidy / reward
    description           TEXT,
    benefit_amount        INT,
    benefit_detail        TEXT,
    target_condition      TEXT,
    region                VARCHAR(50)  NOT NULL,
    start_date            DATE,
    end_date              DATE,
    official_url          VARCHAR(500),
    policy_comment        VARCHAR(300),                         -- API DTO에서는 summary
    policy_period         VARCHAR(100),                         -- API DTO에서는 period
    created_at            TIMESTAMP    NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_policies_slug ON policies(slug);


-- ─────────────────────────────────────────────────────
-- 정책별 필요 서류 (policy_documents)
-- ─────────────────────────────────────────────────────
CREATE TABLE policy_documents (
    id                    BIGSERIAL    PRIMARY KEY,
    policy_id             BIGINT       NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    document_name         VARCHAR(100) NOT NULL,
    description           VARCHAR(255),
    is_required           BOOLEAN      NOT NULL DEFAULT TRUE
);


-- ─────────────────────────────────────────────────────
-- 여행 일정 (trips)
-- ─────────────────────────────────────────────────────
CREATE TABLE trips (
    id                    BIGSERIAL    PRIMARY KEY,
    owner_id              BIGINT       NOT NULL REFERENCES users(id),
    title                 VARCHAR(200) NOT NULL,
    start_date            DATE         NOT NULL,
    end_date              DATE         NOT NULL,
    region                VARCHAR(100),
    description           TEXT,
    created_at            TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMP    NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────
-- 일정의 날짜 (trip_days)
-- ─────────────────────────────────────────────────────
CREATE TABLE trip_days (
    id                    BIGSERIAL PRIMARY KEY,
    trip_id               BIGINT    NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    day_number            INT       NOT NULL,
    date                  DATE      NOT NULL,
    UNIQUE (trip_id, day_number),
    UNIQUE (trip_id, date)
);


-- ─────────────────────────────────────────────────────
-- 일정 내 장소 (trip_places)
-- ─────────────────────────────────────────────────────
CREATE TABLE trip_places (
    id                    BIGSERIAL     PRIMARY KEY,
    trip_day_id           BIGINT        NOT NULL REFERENCES trip_days(id) ON DELETE CASCADE,
    place_name            VARCHAR(200)  NOT NULL,
    address               VARCHAR(500),
    latitude              DECIMAL(10,7),
    longitude             DECIMAL(10,7),
    visit_time            TIME,
    order_num             INT,
    memo                  TEXT
);


-- ─────────────────────────────────────────────────────
-- 일정 참여자 (trip_members)
-- ─────────────────────────────────────────────────────
CREATE TABLE trip_members (
    id                    BIGSERIAL   PRIMARY KEY,
    trip_id               BIGINT      NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    user_id               BIGINT      NOT NULL REFERENCES users(id),
    role                  VARCHAR(20) NOT NULL DEFAULT 'editor', -- owner/editor/viewer
    joined_at             TIMESTAMP   NOT NULL DEFAULT NOW(),
    UNIQUE (trip_id, user_id)
);


-- ─────────────────────────────────────────────────────
-- 일정-정책 연결 (trip_policies)
-- ─────────────────────────────────────────────────────
CREATE TABLE trip_policies (
    id                    BIGSERIAL PRIMARY KEY,
    trip_id               BIGINT    NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    policy_id             BIGINT    NOT NULL REFERENCES policies(id),
    added_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (trip_id, policy_id)
);


-- ─────────────────────────────────────────────────────
-- 일정 초대 링크 (trip_invites)
-- ─────────────────────────────────────────────────────
CREATE TABLE trip_invites (
    id                    BIGSERIAL    PRIMARY KEY,
    trip_id               BIGINT       NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    invite_token          VARCHAR(100) UNIQUE NOT NULL,
    created_by            BIGINT       NOT NULL REFERENCES users(id),
    accepted_at           TIMESTAMP,
    expires_at            TIMESTAMP    NOT NULL,
    created_at            TIMESTAMP    NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_trip_invites_trip_id ON trip_invites(trip_id);
CREATE INDEX idx_trip_invites_token ON trip_invites(invite_token);


-- ─────────────────────────────────────────────────────
-- AI 추천 기록 (recommendations)
-- ─────────────────────────────────────────────────────
CREATE TABLE recommendations (
    id                    BIGSERIAL PRIMARY KEY,
    user_id               BIGINT    NOT NULL REFERENCES users(id),
    trip_id               BIGINT    REFERENCES trips(id),
    query                 TEXT,
    result                JSONB,
    created_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =====================================================
-- End of schema v0.3
-- =====================================================
