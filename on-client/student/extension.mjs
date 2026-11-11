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
    renderDecision({ status, data, error, appId } = {}) {
      const container = document.createElement('div');
      const addLine = (text) => {
        const line = document.createElement('p');
        line.textContent = text;
        container.append(line);
      };

      if (status === 'idle') {
        addLine('업무 앱을 선택하고 접속을 요청하세요.');
        return container;
      }
      if (status === 'loading') {
        addLine('판정 확인 중');
        return container;
      }
      if (status === 'error') {
        const message = typeof error?.message === 'string' && error.message
          ? error.message
          : '오류 메시지를 확인할 수 없습니다.';
        addLine(`요청 실패: ${message}`);
        addLine('요청 실패는 접근 거부 판정이 아닙니다.');
        return container;
      }
      if (status !== 'ok') {
        addLine('확인 불가(unknown)');
        return container;
      }

      const app = typeof data?.appId === 'string' ? data.appId : appId;
      if (typeof app === 'string' && app) addLine(`업무 앱: ${app}`);

      const decision = data?.decision;
      const decisionLabels = {
        allow: '허용(allow)',
        deny: '거부(deny)',
        challenge: '추가 확인 필요(challenge)',
        unknown: '확인 불가(unknown)',
      };
      if (typeof decision === 'string' && Object.hasOwn(decisionLabels, decision)) {
        addLine(`접근 판정: ${decisionLabels[decision]}`);
        if (decision === 'challenge') {
          addLine('이 앱이 추가 인증 또는 확인 절차를 대신 수행하지 않습니다.');
        }
      } else {
        const originalCode = typeof decision === 'string' && decision ? decision : '값 없음';
        addLine(`접근 판정: 확인 불가(unknown) · 원래 판정 코드: ${originalCode}`);
      }

      addLine(`판정 이유: ${typeof data?.reason === 'string' ? data.reason : '확인 불가'}`);
      addLine(`판정 시각: ${typeof data?.checkedAt === 'string' ? data.checkedAt : '확인 불가'}`);
      return container;
    },
    renderEvents({ status, mode, data, error } = {}) {
      const container = document.createElement('div');

      if (status === 'error') {
        const msg = error?.message || '알 수 없는 오류';
        container.textContent = `기록을 불러오지 못했습니다: ${msg}`;
        return container;
      }

      if (!Array.isArray(data)) {
        container.textContent = '확인 불가(CONTRACT_MISMATCH)';
        return container;
      }

      if (data.length === 0) {
        container.textContent = '표시할 기록이 없습니다';
        return container;
      }

      if (!container._filterState) {
        container._filterState = { kind: 'all', appId: 'all', access: 'all' };
      }
      if (!container._selectedDetailId) {
        container._selectedDetailId = null;
      }

      const renderUI = () => {
        container.replaceChildren();

        const filterWrapper = document.createElement('div');
        filterWrapper.style.marginBottom = '10px';

        const kindLabel = document.createElement('label');
        kindLabel.textContent = '기록 종류: ';
        const kindSelect = document.createElement('select');
        kindSelect.setAttribute('aria-label', '기록 종류');
        ['all', 'access', 'xdr'].forEach((val) => {
          const opt = document.createElement('option');
          opt.value = val;
          opt.textContent = val === 'all' ? '전체' : (val === 'access' ? '접속' : 'XDR 경보');
          if (container._filterState.kind === val) opt.selected = true;
          kindSelect.append(opt);
        });
        kindSelect.addEventListener('change', (e) => {
          container._filterState.kind = e.target.value;
          renderUI();
        });
        kindLabel.append(kindSelect);
        filterWrapper.append(kindLabel);

        const appSet = new Set();
        data.forEach((item) => { if (item.appId) appSet.add(item.appId); });
        const appList = Array.from(appSet);

        const appLabel = document.createElement('label');
        appLabel.textContent = ' 업무 앱: ';
        const appSelect = document.createElement('select');
        appSelect.setAttribute('aria-label', '업무 앱');
        const allAppOpt = document.createElement('option');
        allAppOpt.value = 'all';
        allAppOpt.textContent = '전체';
        appSelect.append(allAppOpt);
        appList.forEach((appId) => {
          const opt = document.createElement('option');
          opt.value = appId;
          opt.textContent = appId;
          if (container._filterState.appId === appId) opt.selected = true;
          appSelect.append(opt);
        });
        appSelect.addEventListener('change', (e) => {
          container._filterState.appId = e.target.value;
          renderUI();
        });
        appLabel.append(appSelect);
        filterWrapper.append(appLabel);

        const accessLabel = document.createElement('label');
        accessLabel.textContent = ' 접속 상태: ';
        const accessSelect = document.createElement('select');
        accessSelect.setAttribute('aria-label', '접속 상태');
        ['all', 'allowed', 'denied', 'unknown'].forEach((val) => {
          const opt = document.createElement('option');
          opt.value = val;
          opt.textContent = val === 'all' ? '전체' : val;
          if (container._filterState.access === val) opt.selected = true;
          accessSelect.append(opt);
        });
        accessSelect.addEventListener('change', (e) => {
          container._filterState.access = e.target.value;
          renderUI();
        });
        accessLabel.append(accessSelect);
        filterWrapper.append(accessLabel);

        container.append(filterWrapper);

        const sortedData = [...data].sort((a, b) => new Date(b.at) - new Date(a.at));
        const filteredData = sortedData.filter((item) => {
          if (container._filterState.kind !== 'all' && item.kind !== container._filterState.kind) return false;
          if (container._filterState.appId !== 'all' && item.appId !== container._filterState.appId) return false;
          const itemAccess = item.state?.access || 'unknown';
          if (container._filterState.access !== 'all' && itemAccess !== container._filterState.access) return false;
          return true;
        });

        if (filteredData.length === 0) {
          const emptyMsg = document.createElement('div');
          emptyMsg.textContent = '조건에 맞는 기록이 없습니다.';
          container.append(emptyMsg);
          return;
        }

        filteredData.forEach((item) => {
          const row = document.createElement('div');
          row.setAttribute('data-student-event-id', item.id);
          row.style.borderBottom = '1px solid #ccc';
          row.style.padding = '8px 0';

          const kindText = item.kind === 'access' ? '접속' : (item.kind === 'xdr' ? 'XDR 경보' : item.kind);
          const appText = item.appId ? item.appId : '앱을 확인할 수 없음';
          
          const summaryText = document.createElement('span');
          summaryText.textContent = `[${kindText}] 시각: ${item.at} | 앱: ${appText} | 요약: ${item.summary || ''}`;
          row.append(summaryText);

          const detailBtn = document.createElement('button');
          detailBtn.textContent = `${item.id} 상세`;
          detailBtn.setAttribute('aria-label', `${item.id} 상세`);
          detailBtn.style.marginLeft = '10px';
          detailBtn.addEventListener('click', () => {
            container._selectedDetailId = container._selectedDetailId === item.id ? null : item.id;
            renderUI();
          });
          row.append(detailBtn);

          if (container._selectedDetailId === item.id) {
            const detailDiv = document.createElement('div');
            detailDiv.setAttribute('data-student-event-detail', item.id);
            detailDiv.style.marginTop = '8px';
            detailDiv.style.padding = '8px';
            detailDiv.style.background = '#f9f9f9';

            const addDetailLine = (text) => {
              const p = document.createElement('p');
              p.textContent = text;
              detailDiv.append(p);
            };

            addDetailLine(`사건 ID: ${item.id}`);
            addDetailLine(`업무 앱(appId): ${appText}`);

            if (Array.isArray(item.evidence) && item.evidence.length > 0) {
              addDetailLine('근거 (Evidence):');
              item.evidence.forEach(ev => addDetailLine(` - [${ev.id}] ${ev.text}`));
            } else {
              addDetailLine('근거 (Evidence): 없음');
            }

            if (Array.isArray(item.rules) && item.rules.length > 0) {
              addDetailLine('규칙 (Rules):');
              item.rules.forEach(rule => addDetailLine(` - [${rule.id}] ${rule.text}`));
            } else {
              addDetailLine('규칙 (Rules): 없음');
            }

            const st = item.state || {};
            const accessVal = st.access || 'unknown';
            const sessionVal = st.session || 'unknown';
            const deviceVal = st.device || 'unknown';

            // 접속 상태(access) 한국어 설명 추가
            let accessText = accessVal;
            if (accessVal === 'allowed') accessText = '허용 (allowed)';
            else if (accessVal === 'denied') accessText = '거부 (denied)';
            else accessText = `확인 불가 (${accessVal})`;

            let sessionText = sessionVal;
            if (sessionVal === 'active') sessionText = '활성 (active)';
            else if (sessionVal === 'expired') sessionText = '만료 (expired)';
            else if (sessionVal === 'revoked') sessionText = '철회됨 (revoked)';
            else sessionText = `확인 불가 (${sessionVal})`;

            let deviceText = deviceVal;
            if (deviceVal === 'compliant') deviceText = '보안 기준 충족 (compliant)';
            else if (deviceVal === 'noncompliant') deviceText = '보안 기준 미충족 (noncompliant)';
            else deviceText = `확인 불가 (${deviceVal})`;

            addDetailLine(`상태 - 접속(access): ${accessText}`);
            addDetailLine(`상태 - 세션(session): ${sessionText}`);
            addDetailLine(`상태 - 기기(device): ${deviceText}`);

            row.append(detailDiv);
          }

          container.append(row);
        });
      };

      renderUI();
      return container;
    },
    renderStatus() { return '학생 구현 대기: 기기·세션·알림과 연결 점검 상태를 구분하세요.'; },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}