## 5일차 · 처음 보는 사람의 실행 시험과 안내 고치기



## 1. 시험 방법



- 기존 프로젝트 폴더와 제출물은 그대로 두고, 임시 폴더에 저장소를 새로 받아(`git clone ... kesev-test`) 안내만 보고 실행함.

- 기존에 있던 실행 안내는 시작 틀이 제공한 `on-client/README.md` 하나뿐이었음. 저장소 맨 위에는 안내가 없었음.



## 2. 막힌 기록 (2026-11-25, 내 PC 실측)



| # | 단계 | 실행한 명령 | 오류 문구 / 증상 |

|---|---|---|---|

| ① | 저장소를 받은 직후 | `Get-ChildItem` | 맨 위 폴더에 `on-client` 폴더만 있고 실행 안내가 없음 |

| ② | on-client/README "켜기"의 첫 명령 | `powershell -NoProfile -ExecutionPolicy Bypass -File .\\tools\\start-alekov.ps1` | `계정 연결 설정을 확인하지 못했습니다. 기존 설정과 학생 작업은 그대로 두었습니다.` → 서버 안 켜짐 |

| ③ | 저장소 맨 위에서 실행 | `npm start` | `npm error enoent Could not read package.json: ... kesev-test\\package.json` |

| 확인 | `cd on-client` 후 | `npm start` | `케셰브 연결 확인: http://127.0.0.1:5189`, 보호 현황에 ① 내 PC 자원 · ② 내 PC 보안 구성 표시 ✅ |

### 고친 README로 재시험 (2026-11-25 오후 12:00, 내 PC 실측)

| 단계 | 결과 |
|---|---|
| 새 폴더(`kesev-test2`, 커밋 `0ed5f6e`)에서 맨 위 `README.md` 확인 | 있음 → 막힘 ① 해결 |
| README만 보고 `cd on-client` → `node -v`(v24.19.0) → `npm start` | 서버 켜짐 → 막힘 ②·③ 해결 |
| 브라우저 보호 현황 | ① 내 PC 자원 · ② 내 PC 보안 구성이 실측으로 표시 |
| 새로 나온 헷갈림 | "명령을 어떻게 실행하지?" → README에 "PowerShell 창에 한 줄씩 입력 후 Enter" 한 줄 추가 |


## 3. 원인 판단: 안내 문제 (코드 문제 아님)



| # | 원인 | 근거 |

|---|---|---|

| ① · ③ | 저장소 맨 위에 안내가 없고 `cd on-client`를 알려 주지 않음 | `package.json`은 `on-client` 안에 있음. 새로 받은 코드에서도 `cd on-client` 후 정상 실행 |

| ② | 안내가 선택 기능(계정 연결)까지 준비하는 명령을 기본으로 보여 줌 | 멈춘 곳은 `start-alekov.ps1` 62줄, 계정 연결 준비 결과를 읽는 단계(서버 켜기 전). 내 기능은 계정 연결 없이 `npm start`로 동작 |



- 계정 연결 준비 도구가 실패한 이유 자체는 제공 도구 쪽이라 고치지 않음.

- 새 환경에서 `cd on-client` + `npm start`가 정상이므로 `student/`, `src/` 코드는 고치지 않음 ("필요한 만큼만").



## 4. 고친 것



| 파일 | 변경 | 이유 |

|---|---|---|

| `README.md` (저장소 맨 위) | 🆕 처음 보는 사람용 실행 안내 | 막힌 기록 ①②③ 해결. GitHub 첫 화면에 보임 |

| `on-client/docs/DAY5\_RUN\_CHECK.md` | 🆕 이 기록 | 재현용 |



고치지 않은 파일: `on-client/README.md`(제공 안내, 시작 틀 업데이트 때 덮어써질 수 있음), `tools/\*.ps1`(제공 도구), `student/`·`src/` 코드.



## 5. 재현 방법 (처음 보는 사람 시험 다시 하기)



```powershell

\# 기존 서버 창은 Ctrl + C로 끔

cd $env:TEMP

git clone https://github.com/qja742482/kesev-defense.git kesev-test2

cd kesev-test2

Get-Content README.md -Encoding UTF8   # 맨 위에 안내가 보이는지

cd on-client

node -v                               # v24.19.0

npm start

```



## 6. 확인 순서



1. 새로 받은 폴더 맨 위에 `README.md`가 있는지 (GitHub 저장소 첫 화면에도 보이는지)

2. README만 보고 `cd on-client` → `npm start`까지 막힘 없이 되는지

3. 브라우저 `http://127.0.0.1:5189` → `Ctrl + Shift + R` → 보호 현황에 ① 내 PC 자원 · ② 내 PC 보안 구성이 `실측 · 시각`으로 보이는지

4. README "자주 막히는 곳"의 해결 방법이 실제 오류 문구와 맞는지

5. 시험이 끝나면 임시 폴더 서버를 끄고, 원래 폴더에서 `npm start`로 다시 켬

