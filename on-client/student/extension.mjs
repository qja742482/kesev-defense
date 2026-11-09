// 이 파일은 학생이 같은 프로젝트에서 이어서 구현합니다.
// 제공 UI를 받은 것만으로 단계 완료를 인정하지 않습니다.
export function createStudentView() {
  return {
    renderIdentity(data) {
      if (!data) {
        return '로그인 정보 없음';
      }

      const { user, device, session, status, mode, error } = data;

      if (error || status === 'error' || mode === 'error') {
        const errorMsg = error?.message || error || '알 수 없는 오류 발생';
        return `[오류] 상태: ${status || 'error'} - ${errorMsg}`;
      }

      if (status === 'unknown' || mode === 'unknown' || status === 'unconfirmed') {
        return `[확인 불가] 세션 상태를 확인할 수 없습니다.`;
      }

      if (!user && !device && !session) {
        return '로그인 정보 없음';
      }

      const userName = user?.name || user?.username || user || '알 수 없음';
      const deviceName = device?.name || device?.model || device || '연결된 기기 없음';
      const sessionInfo = session?.id || session?.token || session || '세션 정보 없음';

      return `사용자: ${userName} | 기기: ${deviceName} | 세션: ${sessionInfo}`;
    },
    renderDecision() { return '학생 구현 대기: 서버의 판정과 이유를 연결하세요.'; },
    renderEvents() { return '학생 구현 대기: 본인 접속·XDR 기록을 연결하세요.'; },
    renderStatus() { return '학생 구현 대기: 기기·세션·알림과 연결 점검 상태를 구분하세요.'; },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}