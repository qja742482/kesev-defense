# 3일차 · 내 PC 네트워크·방화벽·Windows 기록 조회 (읽기 전용)

## 1. 제공 기능과 내가 바꾼 부분

| 구분 | 파일 | 내용 |
|---|---|---|
| 제공 (확인 결과) | 전체 코드 | 네트워크·방화벽·Windows 기록을 조회하는 기능 없음 → 중복 구현 아님 |
| 제공 (사용만 함) | `src/server.mjs`의 `send()`, `meta.mode` | 공통 응답 형식과 엔진 연결 상태(`disconnected`)를 그대로 사용 |
| 내가 추가 | `src/system/pc-security.mjs` (새 파일) | 일반 권한·읽기 전용 조회, 5분마다 자동 조회, 건수 추이 보관 |
| 내가 수정 (제공 파일) | `src/server.mjs` | `import` 1줄 + `GET /api/pc-security` 3줄 |
| 내가 수정 | `student/extension.mjs` | `buildPcSecurityPanel` 함수 추가, `renderStatus`에서 2일차·3일차 영역을 각각 try/catch로 감쌈 (한쪽이 실패해도 다른 쪽은 표시) |

- 2일차 측정 코드(`pc-status.mjs`, `buildPcStatusPanel`)는 바꾸지 않음.
- 지우거나 옮긴 파일 없음. SQLite DB 변경 없음. 22단계·2일차 문서 변경 없음.

## 2. 조회 방법 (관리자 권한 없음, 설정 변경 없음)

| 항목 | 방법 | 못 읽을 때 |
|---|---|---|
| 네트워크 구성 | Node 기본 `os.networkInterfaces()` | 확인 불가 + 이유 |
| 방화벽 설정 | `Get-NetFirewallProfile` (조회 전용) | 확인 불가 + 이유 |
| System·Application 기록 | 필터 없이 1개 읽어 접근 확인 → `Get-WinEvent`로 최근 24시간 위험·오류·경고 개수 | 확인 불가 + 이유 |
| Security 기록 (참고) | 접근 확인만 함. 건수는 세지 않음 | 관리자 전용이라 확인 불가 |
| SDP 연결 | 제공 코드의 엔진 연결 상태 | SDP 미연결 (PC 조회 카드와 출처를 나눠 표시) |

- PowerShell 명령은 코드에 고정. 화면·사용자 입력이 명령에 섞이지 않음 (`execFile` 사용).
- `Set-`, `New-`, `Remove-`, `netsh … set` 등 설정을 바꾸는 명령은 쓰지 않음.
- MAC 주소는 가운데를 가려서 표시.
- 공격·침투를 흉내 내는 시험은 하지 않음.

### 발견하고 고친 문제: 권한 오류가 "0건"으로 둔갑

- 증상: 일반 권한인데 Security 기록이 `실측 · 0건`으로 나옴.
- 확인: `IsInRole('Administrators')` = False, `Get-WinEvent -LogName Security -MaxEvents 1` = `UnauthorizedAccessException`.
- 원인: `Get-WinEvent -FilterHashtable`은 권한이 없어도 "기록 없음(NoMatchingEventsFound)"으로 답할 수 있음. 코드는 이를 0건으로 처리했음.
- 수정: 건수를 세기 전에 필터 없이 1개 읽어 접근을 확인. 권한 오류면 무조건 확인 불가. Security는 건수를 세지 않음.

## 3. 실측 결과 (2026-11-25 오전 11:27, 내 PC 일반 권한)

| 카드 | 화면 값 | 출처 |
|---|---|---|
| 네트워크 구성 | 외부 어댑터 2개 · IPv4 2개 | PC 직접 조회 |
| 방화벽 설정 | 켜짐 3 / 3개 프로필 (Domain·Private·Public), 기본 동작은 모두 "설정 안 됨" | PC 직접 조회 · 읽기만 |
| Windows 기록 (최근 24시간) | 오류 4 · 경고 8 (System 0/4, Application 4/4) | PC 직접 조회 · 공격 탐지 아님 |
| SDP 연결 | SDP 미연결 · `ENGINE_NOT_CONNECTED` | SDP 서버 응답 |

| 기록 | 결과 |
|---|---|
| System | 실측 · 오류 0 · 경고 4 |
| Application | 실측 · 오류 4 · 경고 4 |
| Security | 확인 불가 · 관리자 권한이 필요한 기록이라 읽지 못함 (권한이 없는 작업을 수행하려고 했습니다.) |

> 위 값은 모두 내 PC에서 실제로 조회한 값. 시점마다 달라지므로 재현할 때는 숫자보다 "실측/확인 불가 + 조회 시각 + 출처"가 표시되는지를 확인함.
> Windows 기록 건수는 침해나 공격 탐지 결과가 아니다.

## 4. 재현 방법

**관리자가 아닌 일반 PowerShell**에서:

```powershell
cd "C:\Users\User\AppData\Local\ALEPH\Workbench\projects\케세브-방어전\on-client"
([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole('Administrators')   # False
node --check src\system\pc-security.mjs
node --check src\server.mjs
npm run check
npm start
```

다른 PowerShell 창에서 (서버 시작 5초 뒤):

```powershell
Invoke-RestMethod http://127.0.0.1:5189/api/pc-security | ConvertTo-Json -Depth 8
Get-NetFirewallProfile | Select-Object Name, Enabled, DefaultInboundAction, DefaultOutboundAction
Get-WinEvent -LogName Security -MaxEvents 1 -ErrorAction Stop   # 권한 오류가 나야 정상
```

브라우저: `http://127.0.0.1:5189` → **Ctrl + Shift + R** (예전 파일 무시) → 보호 현황 → 다시 불러오기

## 5. 확인 순서

1. 관리자 여부가 False인지
2. 문법 검사 3개가 아무 출력 없이 끝나는지
3. `/api/pc-security`의 network·firewall·System·Application이 `실측`, Security가 `확인 불가`인지
4. 앱 방화벽 값이 `Get-NetFirewallProfile` 결과와 같은지
5. 화면: 2일차 카드 4개 아래에 3일차 카드 4개(네트워크·방화벽·Windows 기록·SDP 연결)가 보이는지
6. Windows 기록 카드와 기록 상세에 "공격 탐지 결과가 아님" 문구가 있는지
7. SDP 카드만 "출처: SDP 서버 응답"이고 `SDP 미연결`로 따로 보이는지
8. 기록 상세에 Security가 `확인 불가` + 이유로 보이는지 (0건으로 바뀌지 않는지)
9. 5분 뒤 다시 불러오기 → 추이 줄이 늘고 직전 대비 증감이 보이는지