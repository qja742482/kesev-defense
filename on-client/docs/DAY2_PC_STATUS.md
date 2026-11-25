# 2일차 · 내 PC의 CPU·메모리·디스크 실측 표시

## 1. 제공 기능과 내가 바꾼 부분

| 구분 | 파일 | 내용 |
|---|---|---|
| 제공 (확인 결과) | 전체 코드 검색 | CPU·메모리·디스크를 재는 기능 없음 → 중복 구현 아님 |
| 제공 (사용만 함) | `src/server.mjs`의 `send()` | 모든 API의 공통 응답 형식 `{ ok, data, meta }`를 그대로 사용 |
| 내가 추가 | `src/system/pc-status.mjs` (새 파일) | 일반 권한 측정, 30초마다 자동 측정, 최근 60개 보관, 실패 시 '확인 불가' + 이유 |
| 내가 수정 (제공 파일) | `src/server.mjs` | `import` 1줄 + `GET /api/system` 주소 3줄. `/api/` 교차 사이트 차단 검사 뒤에 둠 |
| 내가 수정 | `student/extension.mjs` | `renderStatus` 맨 위에 카드 4개 + 추이 비교 (`buildPcStatusPanel`) |

- 카드는 학생 영역(`renderStatus`) 맨 위에 둠. 페이지 전체 맨 위로 올리려면 제공 화면 코드를 고쳐야 해서 하지 않음.
- 지우거나 옮긴 파일 없음. SQLite DB 변경 없음. 22단계 제출 문서 변경 없음.

## 2. 측정 방법 (관리자 권한 없음, 추가 패키지 없음)

| 값 | 방법 | 단위 |
|---|---|---|
| CPU 사용률 | `os.cpus()`를 1초 간격으로 2회 읽어 차이로 계산 | % |
| 메모리 사용량 | `os.totalmem() - os.freemem()` | GB |
| 디스크 남은 공간 | `fs.statfs('C:\')`의 `bavail × bsize` | GB |

- `os.loadavg()`는 Windows에서 항상 0을 돌려주므로 사용하지 않음.
- 측정 실패 시 값은 `null`, 상태는 `확인 불가`, 이유를 함께 표시함. 0이나 예시 값으로 채우지 않음.
- 추이는 서버 메모리에만 보관 → 서버를 다시 켜면 비어 있음 (화면에 "서버 시작 이후 측정분만 표시"로 안내).

## 3. 실측 결과 (2026-11-25, 내 PC에서 잰 값)

| 항목 | 케셰브 앱 | Windows (교차 검증) | 측정 시각 |
|---|---|---|---|
| CPU 사용률 | 2.8 % | (작업 관리자 한 자릿수 %) | 오전 10:04:54 |
| 메모리 사용량 | 9.1 / 15.8 GB (57.6 %) | 9.1 / 15.8 GB | 오전 10:04:54 |
| 디스크 C: 남은 공간 | 345.2 / 464.7 GB | 345.2 GB | 오전 10:04:53 |
| 엔진 연결 | 연결 없음 (`ENGINE_NOT_CONNECTED`) | - | - |

추이 비교 (오전 10:05:54 화면 기준): CPU 처음 대비 +1.7%p · 직전 대비 +1.5%p / 메모리 처음 대비 +0.1%p · 직전 대비 −0.2%p

> 위 표의 값은 모두 실측 값. 측정 시점마다 달라지므로 재현할 때는 숫자가 아니라 "실측 상태 + 측정 시각 + 단위가 표시되는지"를 확인함.

## 4. 재현 방법

```powershell
cd "C:\Users\User\AppData\Local\ALEPH\Workbench\projects\케세브-방어전\on-client"
node --check src\system\pc-status.mjs
node --check src\server.mjs
npm run check
npm start
```

다른 PowerShell 창에서:

```powershell
Invoke-RestMethod http://127.0.0.1:5189/api/system | ConvertTo-Json -Depth 6
$os = Get-CimInstance Win32_OperatingSystem
"{0:N1} / {1:N1} GB" -f (($os.TotalVisibleMemorySize - $os.FreePhysicalMemory)/1MB), ($os.TotalVisibleMemorySize/1MB)
"{0:N1} GB 남음" -f ((Get-PSDrive C).Free/1GB)
```

## 5. 확인 순서

1. 문법 검사 3개가 아무 출력 없이 끝나는지
2. `npm start` 후 `케셰브 연결 확인: http://127.0.0.1:5189`가 나오는지
3. `/api/system` 응답에 `ok: true`, cpu·memory·disk의 `status: 실측`과 `measuredAt`이 있는지
4. 앱 값과 Windows 값(메모리·디스크)이 같은지
5. 브라우저 「다시 불러오기」 → 보호 현황의 학생 상태 영역 맨 위에 카드 4개 + 측정 시각이 보이는지
6. 30초 이상 지나 다시 불러오기 → 추이 줄이 늘고 "처음 대비 / 직전 대비"가 바뀌는지
7. 엔진 연결 카드가 `연결 없음 · ENGINE_NOT_CONNECTED`로 보이는지 (값을 지어내지 않는지)