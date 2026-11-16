# 케셰브(Kheshav) 보안 에이전트 - 22단계 재현 기록 및 릴리스 문서

## 1. 저장소 및 버전 정보
- **저장소 URL**: `https://github.com/qja742482/kesev-defense.git`
- **브랜치**: `main`
- **최종 커밋 해시 (40자리)**: `ed0985775f3e727688b46f16f333aa866ef0c33d`
- **런타임 환경**: Node.js v24.19.0, Windows PowerShell, 모던 웹 브라우저 (Chrome/Edge)

## 2. 새 환경 재현 절차 (Clean Environment Reproduction)
새로운 빈 폴더에서 동일한 환경을 재현하려면 아래 절차를 따릅니다.
1. 빈 폴더 생성 후 터미널 오픈
2. 저장소 클론 및 프로젝트 폴더 이동:
   ```powershell
   git clone [https://github.com/qja742482/kesev-defense.git](https://github.com/qja742482/kesev-defense.git) .
   cd on-client