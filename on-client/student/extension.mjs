export function createStudentView() {
  return {
    renderIdentity({ me, devices, sessions } = {}) {
      const container = document.createElement('div');

      const mStatus = me?.status;
      const dStatus = devices?.status;
      const sStatus = sessions?.status;

      const mError = me?.error;
      const dError = devices?.error;
      const sError = sessions?.error;
      const error = mError || dError || sError;

      const mode = me?.mode || devices?.mode || sessions?.mode;

      let modeText = '';
      if (mode === 'demo') modeText = '예제 자료';
      else if (mode === 'disconnected') modeText = '연결 없음';
      else if (mode === 'unknown') modeText = '확인 불가';

      // 1. me, devices, sessions 중 하나라도 loading 상태인 경우
      if (mStatus === 'loading' || dStatus === 'loading' || sStatus === 'loading') {
        container.textContent = modeText ? `불러오는 중 (${modeText})` : '불러오는 중';
        return container;
      }

      // 2. me, devices, sessions 중 하나라도 error 상태이거나 에러가 있는 경우
      if (mStatus === 'error' || dStatus === 'error' || sStatus === 'error' || error) {
        const errObj = mError || dError || sError || error;
        const errorMsg = errObj?.message || errObj || '알 수 없는 오류 발생';
        const prefix = modeText ? `연결 실패 (${modeText}): ` : '연결 실패: ';
        container.textContent = prefix + errorMsg;
        return container;
      }

      if (mode === 'disconnected' && !me?.data) {
        container.textContent = '연결 없음';
        return container;
      }
      if (mode === 'unknown' && !me?.data) {
        container.textContent = '확인 불가';
        return container;
      }

      const data = me?.data;
      if (data && data.user) {
        const userName = data.user.label || data.user.id || '알 수 없음';
        
        const deviceObj = data.device || {};
        const deviceName = deviceObj.label || deviceObj.id || '기기 없음';
        const deviceStatusRaw = deviceObj.status || 'unknown';
        let deviceStatusText = '확인 불가';
        if (deviceStatusRaw === 'compliant') deviceStatusText = '보안 기준 충족';
        else if (deviceStatusRaw === 'noncompliant') deviceStatusText = '보안 기준 미충족';
        else if (deviceStatusRaw === 'unknown') deviceStatusText = '확인 불가';
        const deviceDisplay = `${deviceStatusText} (${deviceStatusRaw})`;

        const sessionObj = data.session || {};
        const sessionStatusRaw = sessionObj.status || 'unknown';
        let sessionStatusText = '확인 불가';
        if (sessionStatusRaw === 'active') sessionStatusText = '활성';
        else if (sessionStatusRaw === 'expired') sessionStatusText = '만료';
        else if (sessionStatusRaw === 'revoked') sessionStatusText = '철회됨';
        else if (sessionStatusRaw === 'unknown') sessionStatusText = '확인 불가';
        const sessionDisplay = `${sessionStatusText} (${sessionStatusRaw})`;

        let displayText = `사용자: ${userName} | 기기: ${deviceName} (${deviceDisplay}) | 세션: ${sessionDisplay}`;
        if (modeText) {
          displayText += ` [${modeText}]`;
        }
        container.textContent = displayText;
        return container;
      }

      container.textContent = modeText ? `로그인 정보 없음 (${modeText})` : '로그인 정보 없음';
      return container;
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