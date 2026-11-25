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
      // [내가 추가] 핵심 기능 3가지를 먼저 보여 준다. 영역마다 따로 감싸서 한쪽이 실패해도 나머지는 보이게 한다.
      const showPanelError = (label, e) => {
        console.error(`[케셰브] ${label} 표시 오류`, e);
        const p = document.createElement('p');
        p.textContent = `[${label}] 확인 불가 — 화면 표시 중 오류: ${e?.message || e} → student/extension.mjs 저장 후 서버 재시작, 브라우저 Ctrl + Shift + R`;
        container.append(p);
      };
      try { container.append(buildCoreNav()); } catch (e) { showPanelError('핵심 기능 바로가기', e); }
      try { container.append(buildPcStatusPanel({ devices, mode })); } catch (e) { showPanelError('① 내 PC 자원', e); }
      try { container.append(buildPcSecurityPanel({ devices, mode })); } catch (e) { showPanelError('② 내 PC 보안 구성', e); }
      try {
        container.append(buildSectionHeading('kesev-core-3', '③ 연결·알림 상태',
          '기존 서버·에이전트(SDP) 응답 기준입니다. PC 직접 조회 결과가 아니며, 위쪽 「다시 불러오기」로 갱신됩니다.'));
      } catch (e) { showPanelError('③ 연결·알림 상태', e); }
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

      const eventId = event?.id || '기록 없음';
      const rReqId = receipt?.requestId || '요청 ID 없음';

      if (eventId && eventId !== '기록 없음') {
        container.setAttribute('data-student-action-event', eventId);
      }
      if (rReqId && rReqId !== '요청 ID 없음') {
        container.setAttribute('data-student-action-request', rReqId);
      }

      const addLine = (text) => {
        const p = document.createElement('p');
        p.textContent = text;
        container.append(p);
      };

      const evidenceList = Array.isArray(event?.evidence) ? event.evidence : [];
      const evidenceIdsText = evidenceList.map(ev => ev.id).join(', ') || '없음';
      const aId = actionId || '지정 안 됨';
      const tId = target?.id || '대상 없음';
      const tGen = target?.generation ?? '세대 없음';
      const rRecId = receipt?.receiptId || '영수증 ID 없음';
      const rVer = receipt?.version ?? '버전 없음';

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
        addLine('상태: 준비됨·미실행 (prepared)');
        addLine('확인 기한: ' + (confirmationExpiresAt || '기한 미지정'));
        appendIdentifiers();
        return container;
      }

      if (status === 'executing') {
        addLine('상태: 서버에 전달 중 (executing)');
        addLine('결과가 아직 확인되지 않았습니다 (완료 아님).');
        appendIdentifiers();
        return container;
      }

      if (status === 'pending') {
        addLine('상태: 서버 접수·처리 중 (pending)');
        addLine('서버가 접수했다는 것(ACK)은 효과가 확인된 것이 아닙니다.');
        appendIdentifiers();
        return container;
      }

      if (status === 'succeeded') {
        const isEffectApplied = observation && observation.effectApplied === true;
        if (isEffectApplied) {
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
        return container;
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
    renderVulnerabilities({ status, mode, data, error } = {}) {
      const container = document.createElement('div');
      const addLine = (text) => {
        const p = document.createElement('p');
        p.textContent = text;
        container.append(p);
      };

      if (status === 'idle') {
        addLine('조회 전');
        return container;
      }

      if (status === 'loading') {
        addLine('조회 중');
        return container;
      }

      if (status === 'error') {
        const errObj = error || {};
        const msg = errObj.message || '알 수 없는 오류';
        addLine('조회 실패: ' + msg);
        return container;
      }

      if (status !== 'ok') {
        addLine('확인 불가');
        return container;
      }

      // ok 상태 처리 (20단계 핵심 구현)
      const dStatus = data?.status || 'unknown';
      const statusLabels = {
        complete: '모두 조회(complete)',
        partial: '일부 조회 실패(partial)',
        not_checked: '아직 조회 안 함(not_checked)',
        not_configured: '조회 준비 미완료(not_configured)',
        unverifiable: 'lock 파일 확인 불가(unverifiable)',
      };
      const statusText = statusLabels[dStatus] || ('확인 불가 (' + dStatus + ')');
      addLine('전체 조회 상태: ' + statusText);

      addLine('잠금 파일 버전: ' + (data?.lockfileVersion ?? '확인 불가') + ' | 잠금 파일 해시: ' + (data?.lockfileHash ?? '확인 불가') + ' | 확인 시각: ' + (data?.checkedAt ?? '확인 불가'));

      const packages = Array.isArray(data?.packages) ? data.packages : [];
      if (packages.length === 0) {
        addLine('조회된 패키지가 없습니다.');
        return container;
      }

      packages.forEach(pkg => {
        const pkgDiv = document.createElement('div');
        pkgDiv.setAttribute('data-student-package-name', pkg.name || 'unknown');
        pkgDiv.setAttribute('data-student-package-version', pkg.version || 'unknown');
        pkgDiv.style.borderBottom = '1px solid #ddd';
        pkgDiv.style.padding = '8px 0';

        const addPkgLine = (text) => {
          const p = document.createElement('p');
          p.textContent = text;
          pkgDiv.append(p);
        };

        const pkgStatusLabels = {
          known_vulnerabilities: '알려진 항목 있음',
          none_found: '알려진 항목 없음 (조회 범위에서 알려진 취약점 항목이 없습니다)',
          unverifiable: '조회 확인 불가 (일부만 확인됐고 전체 조회는 확인할 수 없음)',
        };
        const pkgStatusText = pkgStatusLabels[pkg.status] || ('상태: ' + (pkg.status || 'unknown'));

        addPkgLine('패키지: ' + (pkg.name || '이름 없음') + ' | 버전: ' + (pkg.version || '버전 없음'));
        addPkgLine('상태: ' + pkgStatusText + ' | 출처: ' + (pkg.source || '출처 없음') + ' | 확인 시각: ' + (pkg.checkedAt || '시각 미확인'));

        const vulns = Array.isArray(pkg.vulnerabilities) ? pkg.vulnerabilities : [];
        if (vulns.length > 0) {
          addPkgLine('[취약점 목록]');
          vulns.forEach(v => {
            addPkgLine(' - ID: ' + (v.id || 'N/A') + ' (수정 시각: ' + (v.modified || 'N/A') + ')');
          });
        } else {
          addPkgLine('[취약점 목록]: 없음');
        }

        container.append(pkgDiv);
      });

      return container;
    }
  };
}
// ============================================================================
// [내가 추가] 4일차 · 내 학생 영역 다듬기 (제공 화면 파일은 고치지 않음)
// - 핵심 기능 3가지를 먼저 보여 준다: ① 내 PC 자원 ② 내 PC 보안 구성 ③ 연결·알림 상태
// - 내가 추가한 영역마다 「최근 측정값 다시 조회」 버튼과 대기 표시를 둔다.
//   (서버는 30초/5분마다 스스로 잰다. 이 버튼은 '새로 재기'가 아니라 '가장 최근 측정값 다시 받기'다.)
// - 조회에 실패하면 예시 값을 보여 주지 않고, 실패한 항목과 다음에 할 일을 보여 준다.
// - 키보드만으로 쓸 수 있게 진짜 <button>과 제목 요소를 쓰고, 상태 변화는 aria-live로 알린다.
// - innerHTML을 쓰지 않고 textContent만 쓴다.
// ============================================================================

const KESEV_TIMEOUT_MS = 10_000;

function kesevEl(tag, text, style = {}, attrs = {}) {
  const n = document.createElement(tag);
  if (text != null) n.textContent = text;
  Object.assign(n.style, style);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
}
const kesevTime = (iso) => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleTimeString('ko-KR') : '시각 없음';
};

// 실패 이유를 보고 '다음에 할 일'을 정한다
function kesevNextStep(reason = '') {
  const r = String(reason);
  if (/첫 (측정|조회) 중/.test(r)) return '서버가 막 켜져 첫 측정 중입니다. 몇 초 뒤 「최근 측정값 다시 조회」를 누르세요.';
  if (/관리자 권한/.test(r)) return '관리자 권한이 필요한 항목입니다. 일반 권한에서는 확인 불가가 정상이며, 설정을 바꾸지 않습니다.';
  if (/앱 서버에 연결하지 못함/.test(r)) return '서버 창에서 npm start가 실행 중인지 확인한 뒤 다시 조회하세요.';
  if (/응답이 없음|초 안에/.test(r)) return '잠시 뒤 다시 조회하세요. 계속되면 서버 창의 오류 문구를 확인하세요.';
  if (/PowerShell/.test(r)) return 'PowerShell이 실행되는지 확인하세요 (일반 PowerShell 창에서 Get-NetFirewallProfile 실행).';
  if (/디스크|드라이브/.test(r)) return '드라이브가 연결되어 있는지 확인하세요.';
  if (/ENGINE_NOT_CONNECTED|SDP 미연결|연결 없음/.test(r)) return '기존 서버·에이전트(SDP) 연결 어댑터를 확인하세요 (docs/SDP_HOST_CONNECTION.md).';
  return '서버 창의 오류 문구를 확인한 뒤 다시 조회하세요.';
}

// 내 API를 부른다. 실패는 사람이 읽을 수 있는 이유로 바꿔서 던진다.
async function kesevGetJson(path) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), KESEV_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(path, { cache: 'no-store', signal: ctrl.signal });
  } catch (e) {
    if (e?.name === 'AbortError') throw new Error(`${KESEV_TIMEOUT_MS / 1000}초 안에 응답이 없음 (${path})`);
    throw new Error(`앱 서버에 연결하지 못함 (${path})`);
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new Error(`앱 서버가 오류로 응답함: HTTP ${res.status} (${path})`);
  let body;
  try { body = await res.json(); } catch { throw new Error(`응답이 JSON 형식이 아님 (${path})`); }
  if (!body?.ok) throw new Error(`응답 형식이 예상과 다름: ${body?.error?.code || '이유 정보 없음'} (${path})`);
  return { data: body.data || {}, meta: body.meta || {} };
}

// 다시 조회 버튼 + 대기 표시 + 실패 안내가 붙은 영역 틀
function kesevSection({ id, title, subtitle, load }) {
  const section = kesevEl('section', null, { margin: '14px 0', padding: '10px', border: '1px solid #8883', borderRadius: '10px' },
    { 'aria-labelledby': `${id}-title` });
  const head = kesevEl('div', null, { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' });
  const h = kesevEl('h3', title, { margin: '0', fontSize: '1.05em' }, { id: `${id}-title`, tabindex: '-1' });
  const btn = kesevEl('button', '최근 측정값 다시 조회', { padding: '4px 10px', cursor: 'pointer' },
    { type: 'button', 'aria-describedby': `${id}-status` });
  const status = kesevEl('span', '', { fontSize: '0.85em' }, { id: `${id}-status`, role: 'status', 'aria-live': 'polite' });
  head.append(h, btn, status);
  section.append(head);
  if (subtitle) section.append(kesevEl('p', subtitle, { fontSize: '0.8em', opacity: '0.75', margin: '4px 0 8px' }));
  const body = kesevEl('div', null, {}, { 'aria-busy': 'false' });
  section.append(body);
  section.id = id;

  const showFailures = (items) => {
    if (!items.length) return;
    const box = kesevEl('div', null, { marginTop: '10px', padding: '8px', border: '1px solid #d97706', borderRadius: '8px' },
      { role: 'group', 'aria-label': '실패한 항목과 다음에 할 일' });
    box.append(kesevEl('p', `실패한 항목 ${items.length}개 · 다음에 할 일`, { fontWeight: 'bold', margin: '0 0 4px' }));
    const ul = kesevEl('ul', null, { margin: '0', paddingLeft: '18px', fontSize: '0.85em' });
    for (const it of items) {
      const li = kesevEl('li');
      li.textContent = `${it.name}: ${it.reason} → ${kesevNextStep(it.reason)}`;
      ul.append(li);
    }
    box.append(ul);
    body.append(box);
  };

  const run = async () => {
    const started = new Date();
    btn.disabled = true;
    btn.textContent = '조회 중…';
    body.setAttribute('aria-busy', 'true');
    body.style.opacity = '0.5';
    status.textContent = `조회 중… (시작 ${started.toLocaleTimeString('ko-KR')})`;
    try {
      const failures = await load(body);           // load가 body를 다시 그리고, 실패 항목 목록을 돌려준다
      showFailures(failures || []);
      status.textContent = failures?.length
        ? `조회 끝 · 일부 실패 ${failures.length}개 · ${new Date().toLocaleTimeString('ko-KR')}`
        : `조회 완료 · ${new Date().toLocaleTimeString('ko-KR')} (값 옆 시각은 서버가 실제로 잰 시각)`;
    } catch (e) {
      body.replaceChildren();
      showFailures([{ name: '이 영역 전체', reason: e?.message || String(e) }]);
      status.textContent = `조회 실패 · ${new Date().toLocaleTimeString('ko-KR')}`;
    } finally {
      body.setAttribute('aria-busy', 'false');
      body.style.opacity = '1';
      btn.disabled = false;
      btn.textContent = '최근 측정값 다시 조회';
    }
  };
  btn.addEventListener('click', run);
  run();
  return section;
}

function kesevCard(grid, title, sourceLabel) {
  const card = kesevEl('div', null, { border: '1px solid #8884', borderRadius: '8px', padding: '8px' },
    { role: 'group', 'aria-label': title });
  const value = kesevEl('div', '조회 중', { fontSize: '1.1em', fontWeight: 'bold', margin: '4px 0' });
  const note = kesevEl('div', '', { fontSize: '0.8em', opacity: '0.85' });
  card.append(kesevEl('div', title, { fontSize: '0.85em' }), value, note);
  if (sourceLabel) card.append(kesevEl('div', sourceLabel, { fontSize: '0.75em', opacity: '0.6', marginTop: '4px' }));
  grid.append(card);
  return { value, note };
}
const kesevGrid = () => kesevEl('div', null, { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' });

// 핵심 기능 3가지 바로가기 (키보드: Tab으로 이동, Enter/Space로 해당 영역 제목에 초점)
function buildCoreNav() {
  const nav = kesevEl('nav', null, { display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '6px 0 4px' }, { 'aria-label': '핵심 기능 3가지 바로가기' });
  nav.append(kesevEl('span', '핵심 기능:', { fontWeight: 'bold', alignSelf: 'center' }));
  for (const [id, label] of [['kesev-core-1', '① 내 PC 자원'], ['kesev-core-2', '② 내 PC 보안 구성'], ['kesev-core-3', '③ 연결·알림 상태']]) {
    const b = kesevEl('button', label, { padding: '4px 10px', cursor: 'pointer' }, { type: 'button' });
    b.addEventListener('click', () => {
      const t = document.getElementById(`${id}-title`);
      if (t) { t.scrollIntoView({ block: 'start', behavior: 'smooth' }); t.focus({ preventScroll: true }); }
    });
    nav.append(b);
  }
  return nav;
}

// ③ 연결·알림 상태 제목 (아래의 기존 표시를 묶는 제목만 붙인다. 내용은 기존 renderStatus 그대로)
function buildSectionHeading(id, title, subtitle) {
  const wrap = kesevEl('div', null, { marginTop: '14px' });
  wrap.append(kesevEl('h3', title, { margin: '0', fontSize: '1.05em' }, { id: `${id}-title`, tabindex: '-1' }));
  if (subtitle) wrap.append(kesevEl('p', subtitle, { fontSize: '0.8em', opacity: '0.75', margin: '4px 0' }));
  return wrap;
}

// ① 내 PC 자원 (2일차 기능 다듬기: CPU · 메모리 · 디스크 · 측정 상태)
function buildPcStatusPanel({ mode } = {}) {
  return kesevSection({
    id: 'kesev-core-1',
    title: '① 내 PC 자원 — 이 PC에서 직접 잰 값',
    subtitle: `서버가 30초마다 일반 권한으로 측정합니다. 값 옆 시각은 실제로 잰 시각입니다.${mode === 'demo' ? ' (예시 모드여도 이 영역은 실측 값입니다)' : ''}`,
    load: async (body) => {
      const { data: s } = await kesevGetJson('/api/system');
      body.replaceChildren();
      const failures = [];
      const grid = kesevGrid();
      const cards = {
        cpu: kesevCard(grid, 'CPU 사용률', '출처: PC 직접 측정'),
        memory: kesevCard(grid, '메모리 사용량', '출처: PC 직접 측정'),
        disk: kesevCard(grid, '디스크 남은 공간', '출처: PC 직접 측정'),
        meta: kesevCard(grid, '측정 상태', '출처: 앱 서버'),
      };
      body.append(grid);
      const l = s.latest;
      const show = (key, name, m, format) => {
        if (!m) {
          cards[key].value.textContent = '확인 불가';
          cards[key].note.textContent = '첫 측정 중';
          failures.push({ name, reason: '첫 측정 중' });
        } else if (m.status !== '실측') {
          cards[key].value.textContent = '확인 불가';
          cards[key].note.textContent = `${m.reason} · ${kesevTime(m.measuredAt)}`;
          failures.push({ name, reason: m.reason });
        } else {
          cards[key].value.textContent = format(m);
          cards[key].note.textContent = `실측 · ${kesevTime(m.measuredAt)}`;
        }
      };
      show('cpu', 'CPU 사용률', l?.cpu, (m) => `${m.value} %`);
      show('memory', '메모리 사용량', l?.memory, (m) => `${m.value} / ${m.total} GB (${m.percent} %)`);
      show('disk', '디스크 남은 공간', l?.disk, (m) => `${m.value} GB 남음 (${String(m.drive).replace(/\\$/, '')})`);
      cards.meta.value.textContent = `${s.intervalSeconds || 30}초마다 측정`;
      cards.meta.note.textContent = `서버 시작 ${kesevTime(s.serverStartedAt)} · 쌓인 측정 ${(s.history || []).length}개`;

      // 추이
      const history = s.history || [];
      body.append(kesevEl('h4', `추이 비교 · 서버 시작 이후 최근 ${Math.min(history.length, 20)}개`, { margin: '10px 0 4px', fontSize: '0.95em' }));
      if (history.length === 0) {
        body.append(kesevEl('p', '아직 쌓인 측정값이 없습니다.'));
      } else {
        const diff = (key) => {
          const vals = history.map((h) => h[key]).filter((v) => typeof v === 'number');
          if (vals.length < 2) return '비교할 값 부족 (30초 뒤 다시 조회)';
          const f = (n) => (n >= 0 ? '+' : '') + n.toFixed(1);
          return `처음 대비 ${f(vals.at(-1) - vals[0])}%p · 직전 대비 ${f(vals.at(-1) - vals.at(-2))}%p`;
        };
        body.append(kesevEl('p', `CPU: ${diff('cpu')} / 메모리: ${diff('memory')}`, { margin: '0 0 4px', fontSize: '0.9em' }));
        const list = kesevEl('ul', null, { listStyle: 'none', padding: '0', margin: '0' }, { 'aria-label': 'CPU·메모리 측정 기록' });
        for (const h of history.slice(-20)) {
          const li = kesevEl('li', null, { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8em' });
          li.append(kesevEl('span', kesevTime(h.at), { width: '80px' }));
          for (const [label, v, color] of [['CPU', h.cpu, '#7c5cff'], ['메모리', h.memory, '#3ecf8e']]) {
            const box = kesevEl('span', null, { flex: '1', display: 'flex', alignItems: 'center', gap: '4px' });
            if (typeof v === 'number') {
              box.append(kesevEl('span', null, { width: `${Math.max(1, v)}%`, height: '8px', background: color, borderRadius: '4px' }, { 'aria-hidden': 'true' }));
              box.append(kesevEl('span', `${label} ${v}%`));
            } else box.append(kesevEl('span', `${label} 확인 불가`));
            li.append(box);
          }
          list.append(li);
        }
        body.append(list);
      }
      return failures;
    },
  });
}

// ② 내 PC 보안 구성 (3일차 기능 다듬기: 네트워크 · 방화벽 · Windows 기록 · SDP 연결)
function buildPcSecurityPanel({ devices, mode } = {}) {
  const NOTICE = '※ Windows 기록 건수는 침해나 공격 탐지 결과가 아닙니다. 프로그램·장치가 남긴 경고·오류의 개수입니다.';
  return kesevSection({
    id: 'kesev-core-2',
    title: '② 내 PC 보안 구성 — 이 PC에서 직접 조회한 값 (읽기 전용)',
    subtitle: '서버가 5분마다 일반 권한으로 조회합니다. 방화벽·보안 설정은 읽기만 하고 바꾸지 않습니다.',
    load: async (body) => {
      const { data: s, meta } = await kesevGetJson('/api/pc-security');
      body.replaceChildren();
      const failures = [];
      const grid = kesevGrid();
      const cards = {
        network: kesevCard(grid, '네트워크 구성', '출처: PC 직접 조회'),
        firewall: kesevCard(grid, '방화벽 설정', '출처: PC 직접 조회 · 읽기만'),
        events: kesevCard(grid, 'Windows 기록 (최근 24시간)', '출처: PC 직접 조회 · 공격 탐지 아님'),
        sdp: kesevCard(grid, 'SDP 연결', '출처: SDP 서버 응답 (PC 조회와 별개)'),
      };
      body.append(grid, kesevEl('p', NOTICE, { fontSize: '0.85em', margin: '6px 0' }));

      // SDP: PC 조회와 섞지 않는다. 실패 목록에는 넣되 'PC 조회 실패'와 구분되는 이름을 쓴다.
      if (devices?.status !== 'error' && devices?.data && mode !== 'demo') {
        cards.sdp.value.textContent = 'SDP 연결됨';
        cards.sdp.note.textContent = '기존 서버·에이전트 응답 확인';
      } else {
        cards.sdp.value.textContent = 'SDP 미연결';
        const code = devices?.error?.code || (meta.mode === 'disconnected' ? 'ENGINE_NOT_CONNECTED' : '');
        cards.sdp.note.textContent = meta.mode === 'demo' || mode === 'demo' ? '예시 모드 (실제 연결 아님)' : code || '연결 응답 없음';
        failures.push({ name: 'SDP 연결 (서버 연결 상태, PC 조회 아님)', reason: `SDP 미연결 ${cards.sdp.note.textContent}` });
      }

      const l = s.latest;
      if (!l) {
        for (const k of ['network', 'firewall', 'events']) {
          cards[k].value.textContent = '확인 불가';
          cards[k].note.textContent = '첫 조회 중';
        }
        failures.push({ name: '네트워크·방화벽·Windows 기록', reason: '첫 조회 중' });
        return failures;
      }
      const fail = (key, name, m) => {
        cards[key].value.textContent = '확인 불가';
        cards[key].note.textContent = `${m?.reason || '이유 정보 없음'} · ${kesevTime(m?.checkedAt)}`;
        failures.push({ name, reason: m?.reason || '이유 정보 없음' });
      };

      const n = l.network;
      if (n?.status === '실측') {
        cards.network.value.textContent = `외부 어댑터 ${n.externalCount}개`;
        cards.network.note.textContent = `IPv4 ${n.ipv4Count}개 · 실측 · ${kesevTime(n.checkedAt)}`;
      } else fail('network', '네트워크 구성', n);

      const f = l.firewall;
      if (f?.status === '실측') {
        cards.firewall.value.textContent = `켜짐 ${f.enabledCount} / ${f.profileCount}개 프로필`;
        cards.firewall.note.textContent = `실측 · ${kesevTime(f.checkedAt)}`;
      } else fail('firewall', '방화벽 설정', f);

      const sys = l.events?.System;
      const app = l.events?.Application;
      if (sys?.status === '실측' && app?.status === '실측') {
        cards.events.value.textContent = `오류 ${sys.error + app.error} · 경고 ${sys.warning + app.warning}`;
        cards.events.note.textContent = `System + Application · 실측 · ${kesevTime(sys.checkedAt)}`;
      } else fail('events', 'Windows 기록 (System·Application)', [sys, app].find((x) => x?.status !== '실측'));

      // 추이
      const history = s.history || [];
      body.append(kesevEl('h4', `추이 비교 · ${Math.round((s.intervalSeconds || 300) / 60)}분 간격 · 최근 ${Math.min(history.length, 12)}개`, { margin: '10px 0 4px', fontSize: '0.95em' }));
      const v = (x) => (typeof x === 'number' ? String(x) : '확인 불가');
      const rows = history.slice(-12);
      const tl = kesevEl('ul', null, { margin: '0', paddingLeft: '18px', fontSize: '0.8em' }, { 'aria-label': 'Windows 기록 건수 추이' });
      rows.forEach((h, i) => {
        const prev = rows[i - 1];
        const d = (key) => (prev && typeof h[key] === 'number' && typeof prev[key] === 'number'
          ? ` (${h[key] - prev[key] >= 0 ? '+' : ''}${h[key] - prev[key]})` : '');
        tl.append(kesevEl('li', `${kesevTime(h.at)} · System 오류 ${v(h.systemError)}${d('systemError')} 경고 ${v(h.systemWarning)}${d('systemWarning')} · Application 오류 ${v(h.appError)}${d('appError')} 경고 ${v(h.appWarning)}${d('appWarning')}`));
      });
      body.append(tl);
      if (history.length < 2) body.append(kesevEl('p', '비교할 조회 결과가 부족합니다 (5분 뒤 다시 조회).', { fontSize: '0.8em', opacity: '0.8' }));

      // 기록 (펼치기: details/summary는 키보드 Enter/Space로 열고 닫힘)
      const details = kesevEl('details', null, { marginTop: '8px' });
      details.append(kesevEl('summary', '조회 상세 보기 (어댑터 · 방화벽 프로필 · 기록별 건수)', { cursor: 'pointer' }));
      const add = (text, style = {}) => details.append(kesevEl('div', text, { fontSize: '0.8em', ...style }));
      add('네트워크 어댑터', { fontWeight: 'bold', marginTop: '6px' });
      if (n?.status === '실측') {
        for (const a of n.adapters) add(`${a.name}${a.internal ? ' (내부)' : ''} · MAC ${a.mac} · ${a.addresses.map((x) => `${x.family} ${x.cidr}`).join(', ')}`);
      } else add(`확인 불가 · ${n?.reason || ''}`);
      add('방화벽 프로필 (읽기만, 설정 변경 없음)', { fontWeight: 'bold', marginTop: '6px' });
      const act = (x) => (x === 'NotConfigured' ? '설정 안 됨(Windows 기본 동작)' : x === 'Block' ? '차단' : x === 'Allow' ? '허용' : x);
      const on = (x) => (x === 'True' ? '켜짐' : x === 'False' ? '꺼짐' : '설정 안 됨');
      if (f?.status === '실측') {
        for (const p of f.profiles) add(`${p.name} · ${on(p.enabled)} · 들어오는 연결 기본: ${act(p.inbound)} · 나가는 연결 기본: ${act(p.outbound)}`);
      } else add(`확인 불가 · ${f?.reason || ''}`);
      add('Windows 기록 건수 (최근 24시간)', { fontWeight: 'bold', marginTop: '6px' });
      add(NOTICE, { opacity: '0.8' });
      for (const [name, x] of Object.entries(l.events || {})) {
        if (x.status !== '실측') {
          add(`${name} · 확인 불가 · ${x.reason}`);
          if (x.adminOnly) failures.push({ name: `${name} 기록 (참고용)`, reason: x.reason });
        } else if (x.adminOnly) add(`${name} · 읽기 가능 (${x.note})`);
        else add(`${name} · 오류 ${x.error} · 경고 ${x.warning}${x.capped ? ' (5000건 이상, 일부만 셈)' : ''} · 실측 · ${kesevTime(x.checkedAt)}`);
      }
      body.append(details);
      return failures;
    },
  });
}