# 케셰브(Kheshav) 보안 에이전트 - 학생용 실행 설명서 (Runbook)

## 1. 개요 및 목적
본 문서는 '케셰브' 보안 에이전트 프로젝트를 로컬 환경에서 실행하고, 클라이언트-서버 간 통신 및 접근 제어, XDR, AI 게이트웨이 연동 구조를 파악하기 위한 실행 설명서입니다.

## 2. 지원 환경 및 필요 프로그램
- **Node.js**: v24.19.0 (실제 `package.json` 설정에 확인된 환경)
- **OS**: Windows 10/11 (PowerShell 환경)
- **브라우저**: Chrome, Edge 등 모던 웹 브라우저

## 3. 폴더 구조 및 실행 위치
- **작업 루트 폴더**: `C:\Users\User\AppData\Local\ALEPH\Workbench\projects\케세브-방어전`
- **주요 경로**:
  * `on-client/student/extension.mjs`: 학생 구현 컴포넌트 (`renderIdentity`, `renderDecision`, `renderEvents`, `renderStatus`, `renderAiConnection`, `renderExplanation`, `renderAction`, `renderVulnerabilities`)
  * `on-client/docs/`: 각종 참고 및 가이드 문서
  * `package.json`: 프로젝트 설정 및 의존성 관리

## 4. 설치 및 실행 절차 (PowerShell 기준)

1. **프로젝트 루트 폴더 이동**
   ```powershell
   cd C:\Users\User\AppData\Local\ALEPH\Workbench\projects\케세브-방어전\on-client

   의존성 설치 (필요시) 및 서버 실행

PowerShell
npm install
npm start
기본 서버는 http://127.0.0.1:5189로 구동됩니다.

UI 및 데모 미리보기가 필요한 경우 npm run demo를 실행할 수 있습니다.

## 5. 시스템 아키텍처 및 데이터 흐름 (System Architecture & Data Flow)
본 프로젝트는 브라우저 클라이언트, Node.js 로컬 앱 서버, 그리고 학생 구현 모듈과 엔진 간의 유기적인 통신 구조로 이루어져 있습니다.

1) 시스템 구성도 (File Path & Module Mapping)
코드 스니펫
flowchart TD
    subgraph Browser ["클라이언트 브라우저 (UI / Frontend)"]
        UI["on-client/public/index.html & app.js"]
        Ext["학생 구현 모듈\n(on-client/student/extension.mjs)"]
        UI --> Ext
    end

    subgraph LocalServer ["로컬 앱 서버 (Backend Core)"]
        Server["앱 서버 진입점\n(on-client/src/server.mjs)"]
        API["REST API 엔드포인트\n(/api/diagnostics, /api/events 등)"]
        Server --> API
    end

    subgraph EngineLayer ["엔진 및 AI 어댑터"]
        Engine["보안 엔진 및 SDP 호스트\n(src/engine.mjs, src/engine/sdp-host.mjs)"]
        AI["AI 서비스 및 게이트 연동\n(src/ai/service.mjs)"]
    end

    Browser -->|HTTP 요청 / API 호출| LocalServer
    LocalServer -->|판정 및 데이터 처리| EngineLayer
    LocalServer -->|렌더링 데이터 전달| Browser
2) 주요 파일 경로 및 역할
on-client/public/app.js: 클라이언트 단에서 브라우저 이벤트를 처리하고, on-client/student/extension.mjs의 확장 컴포넌트를 불러와 화면에 동적 렌더링 수행.

on-client/student/extension.mjs: 학생이 직접 구현하는 UI 컴포넌트 모듈 (renderIdentity, renderDecision, renderEvents, renderStatus, renderAiConnection, renderExplanation, renderAction, renderVulnerabilities).

on-client/src/server.mjs: Node.js 기반 로컬 서버 코어로, HTTP 요청 수신, 라우팅 관리 및 에이전트/AI 연동 처리.

src/engine.mjs & src/engine/sdp-host.mjs: ZTNA 및 XDR 보안 판정, 탐지, 집행 로직을 담당하는 핵심 엔진 어댑터.

3) 요청 및 데이터 흐름 (Request Data Flow)
사용자가 모던 웹 브라우저에서 http://127.0.0.1:5189로 접속하면 on-client/public/app.js가 구동됩니다.

브라우저는 on-client/src/server.mjs로 API 요청(예: 진단, 이벤트, 보호 현황 등)을 전송합니다.

앱 서버(on-client/src/server.mjs)는 내부 어댑터인 src/engine.mjs 및 SDP 호스트와 통신하여 보안 판정 및 탐지 결과를 가져옵니다.

서버에서 가공된 데이터는 클라이언트로 전달되며, on-client/student/extension.mjs 내의 렌더링 함수들을 통해 대시보드 화면에 최종 시각화됩니다.

## 6. 장애 안내와 원문 (오류 처리 연결)
ENGINE_NOT_CONNECTED / NATIVE_HOST_DISABLED

원인: 백엔드 에이전트 브리지나 네이티브 호스트 연결이 설정되지 않았거나 일반 npm start 실행 시 발생.

확인 방법: 브라우저 대시보드 상단 및 로그에서 연결 실패 메시지 확인.

복구 및 확인 방법: npm run demo 명령어는 실제 서버 연결을 복구하는 것이 아니라, 연결 없음 상태나 데모 환경에서 대시보드 화면 및 UI를 미리 확인하기 위한 연습용 기능입니다. 실제 통신 환경에서는 네이티브 호스트 및 인증 설정을 올바르게 구성해야 합니다.

PROJECT_NOT_CONFIGURED / ON_AI_PROVISIONING_PENDING

원인: 데모 모드 구동 시 실제 외부 패키지 조회 API나 정식 AI 프로비저닝 인증 토큰이 연결되지 않은 상태.

확인 방법: 하단 패키지 조회 및 AI 연결 점검 버튼 클릭 시 안내 코드 출력.

복구 방법: 로컬 수동 검증 환경임을 인지하고 데모 데이터(demo) 상태에서 정상 동작 여부 확인.

## 7. 지원 범위
지원 환경: Windows PowerShell 환경 및 Node.js 기반 로컬 개발 서버 (http://127.0.0.1:5189)

제한 사항: 본 런북은 로컬 수동 검증 및 데모 환경을 기준으로 작성되었으며, 미확인된 외부 배포 환경이나 권한이 부여되지 않은 원격 AI 프로비저닝 동작은 지원하지 않음.