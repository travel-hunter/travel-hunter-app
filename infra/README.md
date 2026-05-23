# 개발 서버 환경 구축 가이드

## 개요

`init-server` 스크립트는 본 프로젝트의 **1단계 온프레미스(On-Premise) 개발 환경 구축**을 위한 Ubuntu bootstrap 스크립트입니다.

팀원 간 동일한 개발 서버 환경을 구성하기 위해 작성되었으며, Ubuntu 서버 초기 설정을 자동화합니다.

해당 스크립트를 실행하면 아래 작업이 자동으로 수행됩니다.

- 시스템 패키지 업데이트
- deploy 사용자 생성
- sudo 권한 부여
- hostname 설정
- timezone 설정 (Asia/Seoul)
- UFW 방화벽 설정
- Docker 설치 및 활성화

---

# 지원 환경

- Ubuntu 24.04 LTS
- VMware Ubuntu VM
- WSL2 Ubuntu
- Cloud VM Ubuntu
