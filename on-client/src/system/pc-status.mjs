// [내가 추가한 파일 · 제공 코드 아님]
// 이 PC의 CPU·메모리·디스크를 관리자 권한 없이, Node 기본 기능만으로 직접 잰다.
// 못 읽은 값은 0이나 예시 값이 아니라 '확인 불가'와 이유로 돌려준다.
import os from 'node:os';
import { statfs } from 'node:fs/promises';

const INTERVAL_MS = 30_000;   // 30초마다 측정
const MAX_POINTS = 60;        // 최근 60개(약 30분) 보관
const DISK_PATH = process.env.SystemDrive ? process.env.SystemDrive + '\\' : '/';
const GB = 1024 ** 3;
const startedAt = new Date().toISOString();
const history = [];
let latest = null;
let running = null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const round = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d;
const ok = (value, unit, measuredAt, extra = {}) => ({ status: '실측', value, unit, measuredAt, ...extra });
const fail = (unit, measuredAt, reason) => ({ status: '확인 불가', value: null, unit, measuredAt, reason });

// os.cpus()는 부팅 후 '누적' 시간만 준다 → 두 번 읽어서 차이로 계산해야 지금 사용률이 된다.
// (os.loadavg()는 Windows에서 항상 0을 주므로 쓰지 않는다.)
function cpuTimes() {
  const cpus = os.cpus();
  if (!Array.isArray(cpus) || cpus.length === 0) throw new Error('os.cpus()가 CPU 정보를 돌려주지 않았습니다');
  let idle = 0, total = 0;
  for (const { times: t } of cpus) {
    idle += t.idle;
    total += t.user + t.nice + t.sys + t.idle + t.irq;
  }
  return { idle, total };
}

async function measureCpu() {
  try {
    const a = cpuTimes();
    await sleep(1000);
    const b = cpuTimes();
    const measuredAt = new Date().toISOString();
    const dt = b.total - a.total;
    if (dt <= 0) return fail('%', measuredAt, '1초 동안 CPU 시간 변화가 기록되지 않았습니다');
    return ok(round((1 - (b.idle - a.idle) / dt) * 100), '%', measuredAt, { method: 'os.cpus() 1초 간격 2회 비교' });
  } catch (e) {
    return fail('%', new Date().toISOString(), e.message);
  }
}

function measureMemory() {
  const measuredAt = new Date().toISOString();
  try {
    const total = os.totalmem();
    const free = os.freemem();
    if (!(total > 0)) return fail('GB', measuredAt, '전체 메모리 값을 읽지 못했습니다');
    const used = total - free;
    return ok(round(used / GB), 'GB', measuredAt, {
      total: round(total / GB), percent: round((used / total) * 100), method: 'os.totalmem() - os.freemem()',
    });
  } catch (e) {
    return fail('GB', measuredAt, e.message);
  }
}

async function measureDisk() {
  const measuredAt = new Date().toISOString();
  try {
    const s = await statfs(DISK_PATH);
    const total = s.blocks * s.bsize;
    const free = s.bavail * s.bsize;   // bavail = 일반 사용자가 실제로 쓸 수 있는 공간
    if (!(total > 0)) return fail('GB', measuredAt, `${DISK_PATH} 전체 용량을 읽지 못했습니다`);
    return ok(round(free / GB), 'GB', measuredAt, {
      total: round(total / GB), percentFree: round((free / total) * 100), drive: DISK_PATH, method: 'fs.statfs()',
    });
  } catch (e) {
    return fail('GB', measuredAt, `${DISK_PATH} 디스크 정보를 읽지 못했습니다 (${e.code || e.message})`);
  }
}

export function measureNow() {
  if (running) return running;   // 측정이 겹치지 않게 한 번에 하나만
  running = (async () => {
    const [cpu, disk] = await Promise.all([measureCpu(), measureDisk()]);
    const memory = measureMemory();
    latest = { cpu, memory, disk };
    history.push({ at: new Date().toISOString(), cpu: cpu.value, memory: memory.percent ?? null });
    if (history.length > MAX_POINTS) history.shift();
    return latest;
  })().finally(() => { running = null; });
  return running;
}

export function getPcStatus() {
  return {
    source: '이 PC에서 앱 서버가 일반 권한으로 직접 측정',
    serverStartedAt: startedAt,
    intervalSeconds: INTERVAL_MS / 1000,
    latest,              // 서버 시작 직후 약 1초 동안은 null (첫 측정 중)
    history: [...history],
  };
}

measureNow();
setInterval(measureNow, INTERVAL_MS).unref();   // unref: 이 타이머 때문에 서버 종료가 막히지 않게