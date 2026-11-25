// [내가 추가한 파일 · 제공 코드 아님]
// 이 PC의 네트워크 구성, 방화벽 설정, Windows 기록(System·Application) 오류·경고 건수를
// 일반 권한으로 '읽기만' 한다. 설정을 바꾸는 명령은 쓰지 않는다.
// - 쓰는 PowerShell 명령: Get-NetFirewallProfile, Get-WinEvent (둘 다 조회 전용)
// - 명령은 코드에 고정되어 있고, 화면·사용자 입력이 명령에 섞이지 않는다.
// - 못 읽은 값은 0이나 예시 값이 아니라 '확인 불가'와 이유로 돌려준다.
// - 기록 건수는 침해나 공격 탐지 결과가 아니다.
import os from 'node:os';
import { execFile } from 'node:child_process';

const INTERVAL_MS = 5 * 60_000;   // 5분마다 조회
const MAX_POINTS = 48;            // 최근 48개(약 4시간) 보관
const PS_TIMEOUT_MS = 20_000;     // PowerShell 한 번에 최대 20초
const WINDOW_HOURS = 24;          // 최근 24시간 기록만 셈
const MAX_EVENTS = 5000;          // 기록 하나당 최대 5000개까지만 셈
const COUNTED_LOGS = ['System', 'Application'];   // 카드 합계에 넣는 기록
const ADMIN_ONLY_LOGS = ['Security'];             // 참고용: 관리자 전용이라 보통 확인 불가

const startedAt = new Date().toISOString();
const history = [];
let latest = null;
let running = null;

const now = () => new Date().toISOString();
const ok = (data) => ({ status: '실측', checkedAt: now(), ...data });
const fail = (reason) => ({ status: '확인 불가', checkedAt: now(), reason });

// MAC 주소 가운데를 가린다 (화면 캡처를 제출해도 기기 식별 정보가 그대로 나가지 않게)
const maskMac = (mac) => {
  if (!mac || mac === '00:00:00:00:00:00') return '없음';
  const p = mac.split(':');
  return `${p[0]}-${p[1]}-**-**-**-${p[5]}`;
};

// PowerShell을 고정된 조회 스크립트로만 실행한다. 출력은 JSON 한 줄.
function runPowerShell(script) {
  return new Promise((resolve, reject) => {
    const full = '[Console]::OutputEncoding=[Text.Encoding]::UTF8;' + script;
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', full],
      { timeout: PS_TIMEOUT_MS, windowsHide: true, maxBuffer: 2 * 1024 * 1024 },
      (err, stdout) => {
        if (err) {
          const why = err.killed ? `${PS_TIMEOUT_MS / 1000}초 안에 응답이 없어 중단함` : err.message;
          return reject(new Error(`PowerShell 실행 실패: ${why}`));
        }
        try {
          resolve(JSON.parse(String(stdout).trim()));
        } catch {
          reject(new Error('PowerShell 출력이 JSON 형식이 아님'));
        }
      },
    );
  });
}

// 1) 네트워크 구성 (Node 기본 기능, PowerShell 안 씀)
function readNetwork() {
  try {
    const ifaces = os.networkInterfaces();
    const adapters = Object.entries(ifaces).map(([name, list]) => ({
      name,
      internal: list.every((a) => a.internal),
      mac: maskMac(list[0]?.mac),
      addresses: list.map((a) => ({ family: a.family, cidr: a.cidr || a.address })),
    }));
    const external = adapters.filter((a) => !a.internal);
    return ok({
      method: 'os.networkInterfaces()',
      adapterCount: adapters.length,
      externalCount: external.length,
      ipv4Count: external.flatMap((a) => a.addresses).filter((x) => x.family === 'IPv4').length,
      adapters,
    });
  } catch (e) {
    return fail(`네트워크 구성을 읽지 못했습니다 (${e.message})`);
  }
}

// 2) 방화벽 설정 (읽기만)
const FIREWALL_SCRIPT = `
try {
  $p = Get-NetFirewallProfile -ErrorAction Stop | ForEach-Object {
    [pscustomobject]@{ name=[string]$_.Name; enabled=[string]$_.Enabled;
      inbound=[string]$_.DefaultInboundAction; outbound=[string]$_.DefaultOutboundAction } }
  @{ ok=$true; profiles=@($p) } | ConvertTo-Json -Compress -Depth 4
} catch {
  @{ ok=$false; reason=$_.Exception.Message; id=$_.FullyQualifiedErrorId } | ConvertTo-Json -Compress
}`;

async function readFirewall() {
  if (process.platform !== 'win32') return fail('Windows가 아니라서 조회하지 않음');
  try {
    const r = await runPowerShell(FIREWALL_SCRIPT);
    if (!r.ok) return fail(`방화벽 설정을 읽지 못했습니다 (${r.reason})`);
    const profiles = r.profiles || [];
    return ok({
      method: 'Get-NetFirewallProfile (조회 전용)',
      profileCount: profiles.length,
      enabledCount: profiles.filter((p) => p.enabled === 'True').length,
      profiles,
    });
  } catch (e) {
    return fail(e.message);
  }
}

// 3) Windows 기록 건수 (읽기만).
// 함정: Get-WinEvent에 -FilterHashtable을 쓰면 권한이 없어도 '권한 없음' 대신 '기록 없음'으로 답할 수 있다.
// 그래서 건수를 세기 전에, 필터 없이 1개만 읽어 보는 '접근 확인'을 먼저 한다.
// - 접근 확인에서 권한 오류 등이 나면 무조건 '확인 불가' (0건으로 바꾸지 않음)
// - 접근 확인을 통과한 뒤 필터 조회에서 '기록 없음'이 나올 때만 진짜 0건
// - 관리자 전용 기록(Security)은 건수를 세지 않고 '읽을 수 있는가'만 본다
const EVENT_SCRIPT = (countedLogs, adminOnlyLogs) => `
$counted = @(${countedLogs.map((l) => `'${l}'`).join(',')})
$adminOnly = @(${adminOnlyLogs.map((l) => `'${l}'`).join(',')})
$r = @{}
foreach ($log in @($counted + $adminOnly)) {
  try {
    $null = Get-WinEvent -LogName $log -MaxEvents 1 -ErrorAction Stop
  } catch {
    if ($_.FullyQualifiedErrorId -notlike 'NoMatchingEventsFound*') {
      $r[$log] = @{ ok=$false; reason=$_.Exception.Message; id=$_.FullyQualifiedErrorId }
      continue
    }
  }
  if ($adminOnly -contains $log) { $r[$log] = @{ ok=$true; readable=$true }; continue }
  try {
    $ev = @(Get-WinEvent -FilterHashtable @{ LogName=$log; Level=1,2,3; StartTime=(Get-Date).AddHours(-${WINDOW_HOURS}) } -MaxEvents ${MAX_EVENTS} -ErrorAction Stop)
    $r[$log] = @{ ok=$true; critical=@($ev | Where-Object { $_.Level -eq 1 }).Count;
      error=@($ev | Where-Object { $_.Level -eq 2 }).Count; warning=@($ev | Where-Object { $_.Level -eq 3 }).Count;
      capped=($ev.Count -ge ${MAX_EVENTS}) }
  } catch {
    if ($_.FullyQualifiedErrorId -like 'NoMatchingEventsFound*') {
      $r[$log] = @{ ok=$true; critical=0; error=0; warning=0; capped=$false }
    } else {
      $r[$log] = @{ ok=$false; reason=$_.Exception.Message; id=$_.FullyQualifiedErrorId }
    }
  }
}
$r | ConvertTo-Json -Compress -Depth 4`;

async function readEventLogs() {
  const logs = [...COUNTED_LOGS, ...ADMIN_ONLY_LOGS];
  if (process.platform !== 'win32') {
    return Object.fromEntries(logs.map((l) => [l, fail('Windows가 아니라서 조회하지 않음')]));
  }
  try {
    const r = await runPowerShell(EVENT_SCRIPT(COUNTED_LOGS, ADMIN_ONLY_LOGS));
    return Object.fromEntries(logs.map((l) => {
      const x = r[l];
      const adminOnly = ADMIN_ONLY_LOGS.includes(l);
      if (!x) return [l, fail('결과가 비어 있음')];
      if (!x.ok) {
        const why = /Unauthorized/i.test(x.id || '') ? '관리자 권한이 필요한 기록이라 읽지 못함' : '기록을 읽지 못함';
        return [l, { ...fail(`${why} (${x.reason})`), adminOnly }];
      }
      if (adminOnly) {
        // 건수는 세지 않는다. 읽을 수 있다면 관리자 권한으로 실행 중일 가능성이 큼.
        return [l, ok({ method: 'Get-WinEvent 접근 확인만 (조회 전용)', readable: true, adminOnly,
          note: '읽기 가능 — 관리자 권한으로 서버를 실행했는지 확인하세요' })];
      }
      return [l, ok({
        method: `Get-WinEvent (최근 ${WINDOW_HOURS}시간, 접근 확인 후 조회, 조회 전용)`,
        error: x.critical + x.error,      // 위험(1) + 오류(2)
        warning: x.warning,               // 경고(3)
        capped: x.capped,                 // true면 '5000건 이상'
        adminOnly,
      })];
    }));
  } catch (e) {
    return Object.fromEntries(logs.map((l) => [l, fail(e.message)]));
  }
}

export function refreshPcSecurity() {
  if (running) return running;   // 조회가 겹치지 않게 한 번에 하나만
  running = (async () => {
    const network = readNetwork();
    const [firewall, events] = await Promise.all([readFirewall(), readEventLogs()]);
    latest = { network, firewall, events };
    const n = (log, key) => (events[log]?.status === '실측' ? events[log][key] : null);
    history.push({
      at: now(),
      systemError: n('System', 'error'), systemWarning: n('System', 'warning'),
      appError: n('Application', 'error'), appWarning: n('Application', 'warning'),
    });
    if (history.length > MAX_POINTS) history.shift();
    return latest;
  })().finally(() => { running = null; });
  return running;
}

export function getPcSecurity() {
  return {
    source: '이 PC에서 앱 서버가 일반 권한으로 직접 조회 (읽기 전용)',
    notice: 'Windows 기록 건수는 침해나 공격 탐지 결과가 아닙니다. 프로그램·장치가 남긴 경고·오류의 개수일 뿐입니다.',
    serverStartedAt: startedAt,
    intervalSeconds: INTERVAL_MS / 1000,
    windowHours: WINDOW_HOURS,
    latest,              // 서버 시작 직후 몇 초 동안은 null (첫 조회 중)
    history: [...history],
  };
}

refreshPcSecurity();
setInterval(refreshPcSecurity, INTERVAL_MS).unref();