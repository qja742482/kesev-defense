# 케셰브(Kheshav) 보안 에이전트 - 학생용 실행 설명서 (Runbook)

## 1. 개요 및 목적
본 문서는 '케셰브' 보안 에이전트 프로젝트를 로컬 환경에서 실행하고, 클라이언트-서버 간 통신 및 접근 제어, XDR, AI 게이트웨이 연동 구조를 파악하기 위한 실행 설명서입니다.

## 2. 지원 환경 및 필요 프로그램
* **Node.js**: v18.x 이상 권장 (실제 확인된 환경)
* **OS**: Windows 10/11 (PowerShell 환경)
* **브라우저**: Chrome, Edge 등 모던 웹 브라우저

## 3. 폴더 구조 및 실행 위치
* **작업 루트 폴더**: `C:\Users\User\AppData\Local\ALEPH\Workbench\projects\케세브-방어전`
* **주요 경로**:
  * `on-client/student/extension.mjs`: 학생 구현 컴포넌트 (`renderIdentity`, `renderDecision`, `renderEvents`, `renderStatus`, `renderAiConnection`, `renderExplanation`, `renderAction`, `renderVulnerabilities`)
  * `on-client/docs/`: 각종 참고 및 가이드 문서
  * `package.json`: 프로젝트 설정 및 의존성 관리

## 4. 설치 및 실행 절차 (PowerShell 기준)

1. **프로젝트 루트 폴더 이동**
   ```powershell
   cd C:\Users\User\AppData\Local\ALEPH\Workbench\projects\케세브-방어전

## 5. 장애 안내와 원문 (오류 처리 연결)
* **ENGINE_NOT_CONNECTED / NATIVE_HOST_DISABLED**
  * **원인:** 백엔드 에이전트 브리지나 네이티브 호스트 연결이 설정되지 않았거나 일반 `npm start` 실행 시 발생.
  * **확인 방법:** 브라우저 대시보드 상단 및 로그에서 연결 실패 메시지 확인.
  * **복구 방법:** 데모 모드(`npm run demo`)를 활용하여 로컬 테스트 환경으로 서버를 재구동하거나 네이티브 호스트 설정을 대조하여 우회 실행.
* **PROJECT_NOT_CONFIGURED / ON_AI_PROVISIONING_PENDING**
  * **원인:** 데모 모드 구동 시 실제 외부 패키지 조회 API나 정식 AI 프로비저닝 인증 토큰이 연결되지 않은 상태.
  * **확인 방법:** 하단 패키지 조회 및 AI 연결 점검 버튼 클릭 시 안내 코드 출력.
  * **복구 방법:** 로컬 수동 검증 환경임을 인지하고 데모 데이터(demo) 상태에서 정상 동작 여부 확인.

## 6. 지원 범위
* **지원 환경:** Windows PowerShell 환경 및 Node.js 기반 로컬 개발 서버 (`http://127.0.0.1:5189`)
* **제한 사항:** 본 런북은 로컬 수동 검증 환경을 기준으로 작성되었으며, 미확인된 외부 배포 환경이나 권한이 부여되지 않은 원격 AI 프로비저닝 동작은 지원하지 않음.