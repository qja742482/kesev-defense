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

      if (mStatus === 'loading' || dStatus === 'loading' || sStatus === 'loading') {
        container.textContent = modeText ? '불러오는 중 (' + modeText + ')' : '불러오는 중';
        return container;
      }

      if (mStatus === 'error' || dStatus === 'error' || sStatus === 'error' || error) {
        const errObj = mError || dError || sError || error;
        const errorMsg = errObj?.message || errObj || '알 수 없는 오류 발생';
        const prefix = modeText ? '연결 실패 (' + modeText + '): ' : '연결 실패: ';
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
        const deviceDisplay = deviceStatusText + ' (' + deviceStatusRaw + ')';

        const sessionObj = data.session || {};
        const sessionStatusRaw = sessionObj.status || 'unknown';
        let sessionStatusText = '확인 불가';
        if (sessionStatusRaw === 'active') sessionStatusText = '활성';
        else if (sessionStatusRaw === 'expired') sessionStatusText = '만료';
        else if (sessionStatusRaw === 'revoked') sessionStatusText = '철회됨';
        else if (sessionStatusRaw === 'unknown') sessionStatusText = '확인 불가';
        const sessionDisplay = sessionStatusText + ' (' + sessionStatusRaw + ')';

        let displayText = '사용자: ' + userName + ' | 기기: ' + deviceName + ' (' + deviceDisplay + ') | 세션: ' + sessionDisplay;
        if (modeText) {
          displayText = displayText + ' [' + modeText + ']';
        }
        container.textContent = displayText;
        return container;
      }

      container.textContent = modeText ? '로그인 정보 없음 (' + modeText + ')' : '로그인 정보 없음';
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
        addLine('요청 실패: ' + message);
        addLine('요청 실패는 접근 거부 판정이 아닙니다.');
        return container;
      }
      if (status !== 'ok') {
        addLine('확인 불가(unknown)');
        return container;
      }

      const app = typeof data?.appId === 'string' ? data.appId : appId;
      if (typeof app === 'string' && app) addLine('업무 앱: ' + app);

      const decision = data?.decision;
      const decisionLabels = {
        allow: '허용(allow)',
        deny: '거부(deny)',
        challenge: '추가 확인 필요(challenge)',
        unknown: '확인 불가(unknown)',
      };
      if (typeof decision === 'string' && Object.hasOwn(decisionLabels, decision)) {
        addLine('접근 판정: ' + decisionLabels[decision]);
        if (decision === 'challenge') {
          addLine('이 앱이 추가 인증 또는 확인 절차를 대신 수행하지 않습니다.');
        }
      } else {
        const originalCode = typeof decision === 'string' && decision ? decision : '값 없음';
        addLine('접근 판정: 확인 불가(unknown) · 원래 판정 코드: ' + originalCode);
      }

      addLine('판정 이유: ' + (typeof data?.reason === 'string' ? data.reason : '확인 불가'));
      addLine('판정 시각: ' + (typeof data?.checkedAt === 'string' ? data.checkedAt : '확인 불가'));
      return container;
    },
    renderEvents({ status, mode, data, error } = {}) {
      const container = document.createElement('div');

      if (status === 'error') {
        const msg = error?.message || '알 수 없는 오류';
        container.textContent = '기록을 불러오지 못했습니다: ' + msg;
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
          summaryText.textContent = '[' + kindText + '] 시각: ' + item.at + ' | 앱: ' + appText + ' | 요약: ' + (item.summary || '');
          row.append(summaryText);

          const detailBtn = document.createElement('button');
          detailBtn.textContent = item.id + ' 상세';
          detailBtn.setAttribute('aria-label', item.id + ' 상세');
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

            addDetailLine('사건 ID: ' + item.id);
            addDetailLine('업무 앱(appId): ' + appText);

            if (Array.isArray(item.evidence) && item.evidence.length > 0) {
              addDetailLine('근거 (Evidence):');
              item.evidence.forEach(ev => addDetailLine(' - [' + ev.id + '] ' + ev.text));
            } else {
              addDetailLine('근거 (Evidence): 없음');
            }

            if (Array.isArray(item.rules) && item.rules.length > 0) {
              addDetailLine('규칙 (Rules):');
              item.rules.forEach(rule => addDetailLine(' - [' + rule.id + '] ' + rule.text));
            } else {
              addDetailLine('규칙 (Rules): 없음');
            }

            const st = item.state || {};
            const accessVal = st.access || 'unknown';
            const sessionVal = st.session || 'unknown';
            const deviceVal = st.device || 'unknown';

            let accessText = accessVal;
            if (accessVal === 'allowed') accessText = '허용 (allowed)';
            else if (accessVal === 'denied') accessText = '거부 (denied)';
            else accessText = '확인 불가 (' + accessVal + ')';

            let sessionText = sessionVal;
            if (sessionVal === 'active') sessionText = '활성 (active)';
            else if (sessionVal === 'expired') sessionText = '만료 (expired)';
            else if (sessionVal === 'revoked') sessionText = '철회됨 (revoked)';
            else sessionText = '확인 불가 (' + sessionVal + ')';

            let deviceText = deviceVal;
            if (deviceVal === 'compliant') deviceText = '보안 기준 충족 (compliant)';
            else if (deviceVal === 'noncompliant') deviceText = '보안 기준 미충족 (noncompliant)';
            else deviceText = '확인 불가 (' + deviceVal + ')';

            addDetailLine('상태 - 접속(access): ' + accessText);
            addDetailLine('상태 - 세션(session): ' + sessionText);
            addDetailLine('상태 - 기기(device): ' + deviceText);

            if (Array.isArray(item.supportedActions) && item.supportedActions.length > 0) {
              item.supportedActions.forEach((action) => {
                const actionBtn = document.createElement('button');
                actionBtn.textContent = action + ' 미지원';
                actionBtn.disabled = true;
                actionBtn.style.marginTop = '5px';
                actionBtn.style.display = 'block';
                
                const note = document.createElement('span');
                note.textContent = ' 조치 실행 연결은 준비 중입니다.';
                note.style.fontSize = '0.9em';
                note.style.color = '#666';

                const actionWrapper = document.createElement('div');
                actionWrapper.append(actionBtn);
                actionWrapper.append(note);
                detailDiv.append(actionWrapper);
              });
            }

            row.append(detailDiv);
          }

          container.append(row);
        });
      };

      renderUI();
      return container;
    },
    renderStatus({ devices, sessions, notifications, diagnostics, mode } = {}) {
      const container = document.createElement('div');

      const addSectionTitle = (title) => {
        const h = document.createElement('p');
        h.textContent = title;
        h.style.fontWeight = 'bold';
        h.style.marginTop = '10px';
        container.append(h);
      };

      addSectionTitle('[등록 기기 정보]');
      const dStatus = devices?.status;
      if (dStatus === 'loading') {
        const p = document.createElement('p');
        p.textContent = '불러오는 중';
        container.append(p);
      } else if (dStatus === 'error') {
        const errMsg = devices?.error?.message || '알 수 없는 오류';
        const isTimeout = errMsg.includes('timeout') || errMsg.includes('초과');
        const p = document.createElement('p');
        p.textContent = isTimeout 
          ? '기기 정보 조회 시간 초과: ' + errMsg + '. 다시 시도는 위쪽 다시 불러오기 버튼을 직접 누르세요.' 
          : '기기 정보를 불러오지 못했습니다: ' + errMsg + '. 다시 시도는 위쪽 다시 불러오기 버튼을 직접 누르세요.';
        container.append(p);
      } else if (dStatus === 'ok') {
        const dData = devices?.data;
        if (!Array.isArray(dData) || dData.length === 0) {
          const p = document.createElement('p');
          p.textContent = '등록된 기기가 없음';
          container.append(p);
        } else {
          dData.forEach((dev) => {
            const p = document.createElement('p');
            const devLabel = dev.label || dev.id || '알 수 없는 기기';
            const devStatus = dev.status || 'unknown';
            p.textContent = '기기: ' + devLabel + ' | 상태: ' + devStatus;
            container.append(p);
          });
        }
      } else {
        const p = document.createElement('p');
        p.textContent = '기기 정보 확인 불가';
        container.append(p);
      }

      addSectionTitle('[현재 검증된 세션 정보]');
      const sStatus = sessions?.status;
      if (sStatus === 'loading') {
        const p = document.createElement('p');
        p.textContent = '불러오는 중';
        container.append(p);
      } else if (sStatus === 'error') {
        const errMsg = sessions?.error?.message || '알 수 없는 오류';
        const isTimeout = errMsg.includes('timeout') || errMsg.includes('초과');
        const p = document.createElement('p');
        p.textContent = isTimeout 
          ? '세션 정보 조회 시간 초과: ' + errMsg + '. 다시 시도는 위쪽 다시 불러오기 버튼을 직접 누르세요.' 
          : '세션 정보를 불러오지 못했습니다: ' + errMsg + '. 다시 시도는 위쪽 다시 불러오기 버튼을 직접 누르세요.';
        container.append(p);
      } else if (sStatus === 'ok') {
        const sData = sessions?.data;
        const sessionItem = Array.isArray(sData) ? sData[0] : sData;
        if (!sessionItem) {
          const p = document.createElement('p');
          p.textContent = '현재 연결 없음';
          container.append(p);
        } else {
          const p = document.createElement('p');
          const sId = sessionItem.id || '알 수 없음';
          const sState = sessionItem.status || 'unknown';
          p.textContent = '세션 ID: ' + sId + ' | 상태: ' + sState + ' (현재 검증된 연결 하나)';
          container.append(p);
        }
      } else {
        const p = document.createElement('p');
        p.textContent = '현재 연결 없음';
        container.append(p);
      }

      addSectionTitle('[보안 알림]');
      if (!Array.isArray(notifications) || notifications.length === 0) {
        const p = document.createElement('p');
        p.textContent = '주의할 알림이 없습니다';
        container.append(p);
      } else {
        notifications.forEach((notif) => {
          const p = document.createElement('p');
          const res = notif.resource || '알 수 없는 자원';
          const code = notif.code || 'N/A';
          const msg = notif.message || '';
          p.textContent = '[자원: ' + res + '] 코드: ' + code + ' - ' + msg;
          container.append(p);
        });
      }

      addSectionTitle('[진단 정보 및 도움 요청]');
      const diag = diagnostics;
      if (diag && diag.status === 'ok') {
        const dInfo = diag.data || diag;
        const reqId = dInfo.requestId || 'N/A';
        const comp = dInfo.component || 'N/A';
        const ver = dInfo.version || 'N/A';
        const checkedAt = dInfo.checkedAt || 'N/A';
        const engineMode = dInfo.engine?.mode || dInfo.engineMode || 'N/A';
        const engineCode = dInfo.engine?.code || dInfo.engineCode || 'N/A';

        const diagText = 'RequestId: ' + reqId + ' | Component: ' + comp + ' | Version: ' + ver + ' | CheckedAt: ' + checkedAt + ' | EngineMode: ' + engineMode + ' | EngineCode: ' + engineCode;
        
        const diagP = document.createElement('p');
        diagP.textContent = diagText;
        container.append(diagP);

        const descP = document.createElement('p');
        descP.textContent = '이 정보는 도움 요청에 사용되는 안전한 진단 정보입니다.';
        container.append(descP);

        const copyBtn = document.createElement('button');
        copyBtn.textContent = '도움정보 복사';
        copyBtn.setAttribute('aria-label', '도움정보 복사');
        copyBtn.style.marginTop = '5px';
        copyBtn.addEventListener('click', () => {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(diagText).then(() => {
              alert('도움정보가 클립보드에 복사되었습니다.');
            }).catch(() => {
              alert('복사에 실패했습니다.');
            });
          }
        });
        container.append(copyBtn);
      } else {
        const p = document.createElement('p');
        p.textContent = '진단 정보를 불러올 수 없습니다.';
        container.append(p);
      }

      return container;
    },
    renderAiConnection({ status, mode, data, error, checkedAt, explanationAccepted } = {}) {
      const container = document.createElement('div');
      const addLine = (text) => {
        const p = document.createElement('p');
        p.textContent = text;
        container.append(p);
      };

      if (status === 'idle') {
        addLine('AI 연결 점검 전');
        addLine('다시 점검은 사용자가 버튼을 직접 누르는 것입니다.');
        return container;
      }

      if (status === 'loading') {
        addLine('AI 연결 점검 중');
        return container;
      }

      if (status === 'error') {
        const errObj = error || {};
        const code = errObj.code || 'UNKNOWN';
        const msg = errObj.message || '알 수 없는 오류';

        let causeText = '기타 오류';
        if (code.includes('AUTH') || code.includes('UNAUTHORIZED')) {
          causeText = '계정 연결 다시 확인, 담당자 확인';
        } else if (code.includes('PERMISSION') || code.includes('DENIED') || code.includes('PENDING')) {
          causeText = '담당자에게 계정 연결과 앱 권한 확인 요청';
        } else if (code.includes('LIMIT') || code.includes('QUOTA')) {
          causeText = '담당자 확인';
        } else if (code.includes('TIME') || code.includes('SCHEDULE')) {
          causeText = '이용 시간 확인';
        } else if (code.includes('TIMEOUT') || code.includes('RATE') || code.includes('NETWORK')) {
          causeText = '잠시 뒤 직접 다시 점검';
        } else if (code.includes('CANCEL')) {
          causeText = '취소됨. 이전 결과는 현재 결과가 아닙니다.';
        } else if (code.includes('MODEL') || code.includes('NOT_FOUND')) {
          causeText = '담당자에게 모델 허용 설정 확인 요청';
        }

        addLine('연결 점검 실패 원인: ' + causeText + ' (' + code + ': ' + msg + ')');
        addLine('다시 점검은 사용자가 버튼을 직접 누르는 것입니다.');
        return container;
      }

      if (status === 'ok') {
        const auth = data?.audienceAuthorization;
        const authText = auth === 'verified' ? '앱 권한 확인 후 점검(verified)' : '시험 연결 점검(test)';
        const count = data?.modelCount ?? '알 수 없는 수';
        const time = checkedAt || data?.checkedAt || '시각 미확인';

        addLine('AI 연결 점검 결과: ' + authText);
        addLine('사용 가능한 모델 수: ' + count);
        addLine('점검 시각: ' + time);
        addLine('사건 설명은 아직 실행하지 않았습니다.');
        return container;
      }

      addLine('AI 연결 점검 전');
      return container;
    },
    renderExplanation({ event, explanation, checkedAt } = {}) {
      const container = document.createElement('div');

      if (!event) {
        container.textContent = '보안 기록에서 기록을 먼저 고르세요';
        return container;
      }

      if (!explanation || explanation.status === 'idle') {
        container.textContent = '설명 대기 중';
        return container;
      }

      if (explanation.status === 'loading') {
        container.textContent = '설명 요청 중';
        return container;
      }

      if (explanation.status === 'error') {
        const errObj = explanation.error || {};
        const code = errObj.code || 'UNKNOWN';
        const msg = errObj.message || '알 수 없는 오류';
        container.textContent = 'AI 설명 실패: ' + code + ' - ' + msg + '. 기록은 그대로입니다.';
        return container;
      }

      if (explanation.status === 'ok') {
        const expData = explanation.data || {};
        const evidenceIds = Array.isArray(expData.evidenceIds) ? expData.evidenceIds : [];
        const eventEvidence = Array.isArray(event.evidence) ? event.evidence : [];

        let evidenceMismatch = false;
        const verifiedEvidences = [];
        for (const id of evidenceIds) {
          const found = eventEvidence.find(ev => ev.id === id);
          if (!found) {
            evidenceMismatch = true;
            break;
          }
          verifiedEvidences.push(found);
        }

        if (evidenceMismatch) {
          container.textContent = '근거가 맞지 않음: AI 설명이 인용한 근거 ID가 사건 기록과 일치하지 않아 사용할 수 없습니다.';
          return container;
        }

        container.setAttribute('data-student-explanation-event', event.id);

        const addLine = (text) => {
          const p = document.createElement('p');
          p.textContent = text;
          container.append(p);
        };

        addLine('사건 ID: ' + event.id);
        addLine('AI 설명(참고용)');
        addLine(expData.summary || '요약 내용 없음');

        addLine('[인용된 근거]');
        if (verifiedEvidences.length > 0) {
          verifiedEvidences.forEach(ev => {
            addLine('근거 ID ' + ev.id + ' — ' + ev.text);
          });
        } else {
          addLine('인용된 근거 없음');
        }

        addLine('[관련 규칙]');
        const eventRules = Array.isArray(event.rules) ? event.rules : [];
        if (eventRules.length > 0) {
          eventRules.forEach(rule => {
            addLine('규칙 ID ' + rule.id + ' — ' + rule.text);
          });
        } else {
          addLine('관련 규칙 없음');
        }

        addLine('[현재 상태]');
        const state = event.state || {};
        const accessState = state.access || 'unknown';
        const sessionState = state.session || 'unknown';
        const deviceState = state.device || 'unknown';

        const formatStateVal = (val) => val === 'unknown' ? '확인 불가 (unknown)' : val;
        addLine('접속: ' + formatStateVal(accessState));
        addLine('세션: ' + formatStateVal(sessionState));
        addLine('기기: ' + formatStateVal(deviceState));

        addLine('[조치 제안]');
        const proposals = Array.isArray(expData.proposals) ? expData.proposals : [];
        const supportedActions = Array.isArray(event.supportedActions) ? event.supportedActions : [];

        if (proposals.length === 0) {
          if (supportedActions.length === 0) {
            addLine('연동 시스템이 지원하는 조치가 없어 제안이 없습니다(정상)');
          } else {
            addLine('AI가 제안한 조치가 없습니다.');
          }
        } else {
          proposals.forEach(prop => {
            addLine('조치: ' + (prop.action || '알 수 없는 조치') + ' | 이유: ' + (prop.reason || '이유 없음'));
            addLine('사람 확인이 필요하며 아직 실행되지 않았습니다.');
          });
        }

        return container;
      }

      container.textContent = '설명 대기 중';
      return container;
    },
    renderAction({ status, event, actionId, target, receipt, observation, message, confirmationExpiresAt, error } = {}) {
      const container = document.createElement('div');
      const addLine = (text) => {
        const p = document.createElement('p');
        p.textContent = text;
        container.append(p);
      };

      const eventId = event?.id || '기록 없음';
      const evidenceList = Array.isArray(event?.evidence) ? event.evidence : [];
      const evidenceIdsText = evidenceList.map(ev => ev.id).join(', ') || '없음';
      const aId = actionId || '지정 안 됨';
      const tId = target?.id || '대상 없음';
      const tGen = target?.generation ?? '세대 없음';
      const rReqId = receipt?.requestId || '요청 ID 없음';
      const rRecId = receipt?.receiptId || '영수증 ID 없음';
      const rVer = receipt?.version ?? '버전 없음';

      // 기본 식별 정보 표기 함수
      const appendIdentifiers = () => {
        addLine('사건 ID: ' + eventId + ' | 근거 ID: ' + evidenceIdsText);
        addLine('조치 ID(actionId): ' + aId + ' | 대상 ID(target.id): ' + tId + ' (세대: ' + tGen + ')');
        addLine('요청 ID(requestId): ' + rReqId + ' | 영수증 ID(receiptId): ' + rRecId + ' | 버전(version): ' + rVer);
      };

      if (status === 'idle') {
        addLine('상태: 아직 미실행 (idle)');
        addLine('지금 기록에는 연동 시스템이 지원하는 조치가 없어(supportedActions 빈 배열) 실제 처리 경로가 열리지 않습니다. 화면에 조치 준비 버튼이 나오지 않는 것이 정상입니다.');
        return container;
      }

      if (status === 'prepared') {
        container.setAttribute('data-student-action-event', eventId);
        if (rReqId !== '요청 ID 없음') {
          container.setAttribute('data-student-action-request', rReqId);
        }
        addLine('상태: 준비됨·미실행 (prepared)');
        addLine('확인 기한: ' + (confirmationExpiresAt || '기한 미지정'));
        appendIdentifiers();
        return container;
      }

      if (status === 'executing') {
        container.setAttribute('data-student-action-event', eventId);
        if (rReqId !== '요청 ID 없음') {
          container.setAttribute('data-student-action-request', rReqId);
        }
        addLine('상태: 서버에 전달 중 (executing)');
        addLine('결과가 아직 확인되지 않았습니다 (완료 아님).');
        appendIdentifiers();
        return container;
      }

      if (status === 'pending') {
        container.setAttribute('data-student-action-event', eventId);
        if (rReqId !== '요청 ID 없음') {
          container.setAttribute('data-student-action-request', rReqId);
        }
        addLine('상태: 서버 접수·처리 중 (pending)');
        addLine('서버가 접수했다는 것(ACK)은 효과가 확인된 것이 아닙니다.');
        appendIdentifiers();
        return container;
      }

      if (status === 'succeeded') {
        const isEffectApplied = observation && observation.effectApplied === true;
        if (isEffectApplied) {
          container.setAttribute('data-student-action-event', eventId);
          if (rReqId !== '요청 ID 없음') {
            container.setAttribute('data-student-action-request', rReqId);
          }
          addLine('상태: 효과 확인 (succeeded)');
          addLine('관측 시각: ' + (observation.observedAt || '시각 미확인'));
          addLine('effectApplied: true');
          addLine('영수증 ID(receiptId): ' + rRecId);
          appendIdentifiers();
        } else {
          addLine('상태: 결과 불명 (unknown / condition not met)');
          addLine('효과가 확인되지 않았으므로 성공으로 판단할 수 없습니다. 결과 재조회를 진행하세요.');
          appendIdentifiers();
        }
        return container;
      }

      if (status === 'denied') {
        addLine('상태: 거절 (denied)');
        addLine('거절 사유: ' + (message || '사유 없음'));
        appendIdentifiers();
        return container;
      }

      if (status === 'failed') {
        addLine('상태: 실패 (failed)');
        addLine('실패 사유: ' + (message || '사유 없음'));
        appendIdentifiers();
        return container;
      }

      if (status === 'unknown') {
        addLine('상태: 결과 불명 (unknown)');
        addLine('효과 없음으로도 성공으로도 판단하지 마십시오. 결과 재조회를 하시기 바랍니다.');
        appendIdentifiers();
        return container;
      }

      if (status === 'expired') {
        addLine('상태: 확인 기한 지남 (expired)');
        addLine('확인 기한이 지났습니다. 조치를 다시 준비하십시오.');
        appendIdentifiers();
      }

      if (status === 'error') {
        const errObj = error || {};
        const code = errObj.code || 'UNKNOWN';
        const errMsg = errObj.message || '알 수 없는 오류';
        addLine('상태: 요청 처리 안 됨 (error)');
        addLine('오류 코드: ' + code + ' | 메시지: ' + errMsg);
        appendIdentifiers();
        return container;
      }

      addLine('상태: 알 수 없음 (status: ' + (status || 'none') + ')');
      return container;
    },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}