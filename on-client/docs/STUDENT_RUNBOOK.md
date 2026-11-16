# 케셰브(Kheshav) 보안 에이전트 - 학생용 실행 설명서 (Runbook)

## 1. 개요 및 목적
본 문서는 '케셰브' 보안 에이전트 프로젝트를 로컬 환경에서 실행하고, 클라이언트-서버 간 통신 및 접근 제어, XDR, AI 게이트웨이 연동 구조를 파악하기 위한 학생용 실행 설명서입니다.

## 2. 지원 환경 및 필요 프로그램
- **Node.js**: v24.19.0 (실제 `package.json` 설정에 확인된 환경)
- **OS**: Windows 10/11 (PowerShell 환경)
- **브라우저**: Chrome, Edge 등 모던 웹 브라우저

## 3. 폴더 구조 및 실행 위치
- **작업 루트 폴더**: Workbench 프로젝트 내 `on-client` 폴더
- **주요 경로**:
  * `student/extension.mjs`: 학생 구현 컴포넌트 (`renderIdentity`, `renderDecision`, `renderEvents`, `renderStatus`, `renderAiConnection`, `renderExplanation`, `renderAction`, `renderVulnerabilities`)
  * `docs/`: 각종 참고 및 가이드 문서
  * `package.json`: 프로젝트 설정 및 의존성 관리

## 4. 설치 및 실행 절차 (PowerShell 기준)

1. **프로젝트 폴더 이동 및 실행**
   ```powershell
   cd on-client
   npm install
   npm start

## 5. 시스템 아키텍처 및 데이터 흐름 (System Architecture & Data Flow)
본 프로젝트는 브라우저 클라이언트, Node.js 로컬 앱 서버, 그리고 학생 구현 모듈과 엔진 간의 유기적인 통신 구조로 이루어져 있습니다.

1) 시스템 구성도 (File Path & Module Mapping)
코드 스니펫
flowchart TD
    subgraph Browser ["클라이언트 브라우저 (UI / Frontend)"]
        UI["public/index.html & app.js"]
        Ext["학생 구현 모듈\n(student/extension.mjs)"]
        UI --> Ext
    end

    subgraph LocalServer ["로컬 앱 서버 (Backend Core)"]
        Server["앱 서버 진입점\n(src/server.mjs)"]
        API["REST API 엔드포인트\n(신원, 앱, 접근 판정, 기록 조회)"]
        Server --> API
    end

    subgraph EngineLayer ["엔진 어댑터 및 선택적 조치"]
        Engine["엔진 어댑터\n(신원·앱·접근 판정·기록 조회)"]
        Action["선택적 조치 경로"]
    end

    Browser -->|HTTP 요청| LocalServer
    LocalServer -->|엔진 어댑터 연동| Engine
    LocalServer -->|렌더링 및 UI 표시| Browser
    Engine --> Action

2) 주요 파일 경로 및 역할
public/app.js: 클라이언트 단에서 브라우저 이벤트를 처리하고, student/extension.mjs의 확장 컴포넌트를 불러와 화면에 동적 렌더링 수행.

student/extension.mjs: 학생이 직접 구현하는 UI 컴포넌트 모듈 (renderIdentity, renderDecision, renderEvents, renderStatus, renderAiConnection, renderExplanation, renderAction, renderVulnerabilities).

src/server.mjs: Node.js 기반 로컬 서버 코어로, HTTP 요청 수신, 라우팅 관리 및 신원·앱·접근 판정·기록 조회 처리.

src/engine.mjs & src/engine/sdp-host.mjs: 보안 엔진 어댑터로 신원·앱·접근 판정·기록 조회를 담당.

3) 요청 및 데이터 흐름 (Request Data Flow)
사용자가 모던 웹 브라우저에서 http://127.0.0.1:5189로 접속하면 브라우저 클라이언트가 구동됩니다.

브라우저는 로컬 앱 서버(src/server.mjs)로 API 요청을 전송합니다.

앱 서버는 엔진 어댑터를 통해 신원, 앱, 접근 판정, 기록 조회 등의 데이터를 처리합니다.

처리된 데이터는 클라이언트로 전달되며, student/extension.mjs 내의 렌더링 함수들을 통해 대시보드 화면에 최종 시각화됩니다.

## 6. 장애 안내와 원문 (오류 처리 연결)
PROJECT_NOT_CONFIGURED

원인: 프로젝트 경로 설정(ON_PROJECT_DIRECTORY)이 올바르게 지정되지 않았거나 구성되지 않은 상태.

복구 및 확인 방법: 담당자 설정 및 프로젝트 디렉토리 환경 변수를 확인하고 올바른 경로로 설정합니다.

ON_AI_PROVISIONING_PENDING

원인: 앱 권한 및 인증 자격(AI 프로비저닝)이 아직 준비되지 않은 상태.

복구 및 확인 방법: 담당자에게 앱 권한 및 자격 준비를 요청합니다.

참고 사항 (npm run demo): npm run demo는 실제 서버 연결을 복구하거나 장애를 해결하는 기능이 아니며, 연결이 없는 상태에서 예제 화면과 UI를 미리 확인하기 위한 용도로만 사용합니다.

##  7. 지원 범위
지원 환경: Windows PowerShell 환경 및 Node.js 기반 로컬 개발 서버 (http://127.0.0.1:5189)

제한 사항: 본 런북은 로컬 수동 검증 및 데모 환경을 기준으로 작성되었으며, 미확인된 외부 배포 환경이나 권한이 부여되지 않은 원격 AI 프로비저닝 동작은 지원하지 않음.