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