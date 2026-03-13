export type IPVersion = 'ipv4' | 'ipv6';

export type IPv4CalcResult = {
  version: 'ipv4'; input: string; ip: string; cidr: number; network: string;
  broadcast: string; firstHost: string; lastHost: string; mask: string;
  wildcardMask: string; usableHosts: string; ipClass: string; ipScope: string;
  subnetMeaning: string; scopeColor: string; nextSubnet: string;
};

export type IPv6CalcResult = {
  version: 'ipv6'; input: string; ip: string; cidr: number; network: string;
  firstAddress: string; lastAddress: string; addressCount: string;
  ipClass: 'IPv6'; ipScope: string; subnetMeaning: string; scopeColor: string;
};

export type CalcResult = IPv4CalcResult | IPv6CalcResult;

export type VlsmRequest = { label: string; hosts: number; };

export type VlsmAllocation = {
  label: string; requestedHosts: number; allocatedHosts: number; cidr: number;
  network: string; firstHost: string; lastHost: string; broadcast: string;
};

// ADDED EXPORT TO THESE HELPER TYPES FOR THE STORE
export type RecentCalculation = { id: string; input: string; network: string; scope: string; version: IPVersion; createdAt: number; favorite: boolean; };
export type VlsmRequestItem = { id: string; label: string; hosts: string; color: string; };
export type VlsmResult = VlsmAllocation & { color: string; percentage: number; };
export type TrainingQuestion = { id: string; type: string; question: string; correctAnswer: string; options: string[]; explanation: string; difficulty: string; };
export type TrainingSession = { id: string; difficulty: string; totalQuestions: number; correctAnswers: number; wrongAnswers: number; completedAt: number; timeSpentMs: number; };

const IPV4_SCOPE_COLOR = '#45C8FF';
const IPV6_SCOPE_COLOR = '#8B7CFF';

export function detectIpVersion(value: string): IPVersion | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.includes(':')) return 'ipv6';
  if (trimmed.includes('.')) return 'ipv4';
  return null;
}

export function parseIpAndCidr(value: string, fallbackCidr = '24') {
  const trimmed = value.trim();
  if (!trimmed) return { ip: '', cidr: parseInt(fallbackCidr, 10) || 24 };
  if (trimmed.includes('/')) {
    const [ip, cidrRaw] = trimmed.split('/');
    return { ip: ip.trim(), cidr: parseInt((cidrRaw || fallbackCidr).trim(), 10) || 24 };
  }
  return { ip: trimmed, cidr: parseInt(fallbackCidr, 10) || 24 };
}

// FIXED: Added export to math functions
export function ipToInt(ip: string) {
  return ip.split('.').reduce((int, octet) => ((int << 8) + parseInt(octet, 10)) >>> 0, 0);
}

export function intToIp(int: number) {
  return [(int >>> 24) & 255, (int >>> 16) & 255, (int >>> 8) & 255, int & 255].join('.');
}

export function isValidIPv4(ip: string) {
  const regex = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
  return regex.test(ip.trim());
}

function getIpClass(ip: string): string {
  const first = parseInt(ip.split('.')[0], 10);
  if (first >= 1   && first <= 126) return 'A';
  if (first === 127)                 return 'A'; // loopback, still Class A
  if (first >= 128 && first <= 191) return 'B';
  if (first >= 192 && first <= 223) return 'C';
  if (first >= 224 && first <= 239) return 'D';
  if (first >= 240 && first <= 255) return 'E';
  return 'A';
}

function getIpScope(ip: string): { ipScope: string; subnetMeaning: string; scopeColor: string } {
  const first = parseInt(ip.split('.')[0], 10);
  const second = parseInt(ip.split('.')[1], 10);

  // Loopback
  if (first === 127) return { ipScope: 'Loopback', subnetMeaning: 'Loopback address', scopeColor: '#fcc419' };
  // RFC 1918 Private ranges
  if (first === 10) return { ipScope: 'Private', subnetMeaning: 'RFC 1918 Private (Class A)', scopeColor: '#51cf66' };
  if (first === 172 && second >= 16 && second <= 31) return { ipScope: 'Private', subnetMeaning: 'RFC 1918 Private (Class B)', scopeColor: '#51cf66' };
  if (first === 192 && second === 168) return { ipScope: 'Private', subnetMeaning: 'RFC 1918 Private (Class C)', scopeColor: '#51cf66' };
  // Link-local
  if (first === 169 && second === 254) return { ipScope: 'Link-Local', subnetMeaning: 'APIPA / Link-local', scopeColor: '#ff922b' };
  // Multicast
  if (first >= 224 && first <= 239) return { ipScope: 'Multicast', subnetMeaning: 'Multicast (Class D)', scopeColor: '#cc5de8' };
  // Reserved
  if (first >= 240) return { ipScope: 'Reserved', subnetMeaning: 'Reserved (Class E)', scopeColor: '#ff453a' };
  // Documentation ranges
  if (first === 192 && second === 0 && parseInt(ip.split('.')[2], 10) === 2) return { ipScope: 'Documentation', subnetMeaning: 'Documentation (TEST-NET)', scopeColor: '#74c0fc' };
  if (first === 198 && (second === 51 || second === 18 || second === 19)) return { ipScope: 'Documentation', subnetMeaning: 'Documentation / Benchmarking', scopeColor: '#74c0fc' };
  // Public
  return { ipScope: 'Public', subnetMeaning: 'Public Internet', scopeColor: IPV4_SCOPE_COLOR };
}

export function calculateIPv4(ip: string, cidr: number): IPv4CalcResult {
  if (!isValidIPv4(ip)) throw new Error('Invalid IPv4');
  const ipInt = ipToInt(ip);
  const maskInt = cidr === 0 ? 0 : (~0 << (32 - cidr)) >>> 0;
  const networkInt = (ipInt & maskInt) >>> 0;
  const broadcastInt = (networkInt | (~maskInt >>> 0)) >>> 0;
  const firstHost = cidr >= 31 ? intToIp(networkInt) : intToIp(networkInt + 1);
  const lastHost = cidr >= 31 ? intToIp(broadcastInt) : intToIp(broadcastInt - 1);
  const usable = cidr === 32 ? 1 : cidr === 31 ? 2 : Math.pow(2, 32 - cidr) - 2;
  const { ipScope, subnetMeaning, scopeColor } = getIpScope(ip);

  const blockSize = Math.pow(2, 32 - cidr);
  const nextSubnetInt = (networkInt + blockSize) >>> 0;
  const nextSubnet = nextSubnetInt > 0xFFFFFFFF || cidr === 0 ? '—' : `${intToIp(nextSubnetInt)}/${cidr}`;

  return {
    version: 'ipv4', input: `${ip}/${cidr}`, ip, cidr,
    network: intToIp(networkInt), broadcast: intToIp(broadcastInt),
    firstHost, lastHost, mask: intToIp(maskInt), wildcardMask: intToIp(~maskInt >>> 0),
    usableHosts: usable.toLocaleString(),
    ipClass: getIpClass(ip),
    ipScope,
    subnetMeaning,
    scopeColor,
    nextSubnet,
  };
}

// ── IPv6 helpers ──

function expandIPv6(ip: string): string {
  // Handle '::' shorthand
  let full = ip;
  if (full.includes('::')) {
    const [left, right] = full.split('::');
    const leftGroups  = left  ? left.split(':')  : [];
    const rightGroups = right ? right.split(':') : [];
    const missing = 8 - leftGroups.length - rightGroups.length;
    const middle  = Array(missing).fill('0000');
    full = [...leftGroups, ...middle, ...rightGroups].join(':');
  }
  // Pad each group to 4 hex digits
  return full.split(':').map(g => g.padStart(4, '0')).join(':');
}

function ipv6ToBigInt(ip: string): bigint {
  return expandIPv6(ip)
    .split(':')
    .reduce((acc, group) => (acc << 16n) + BigInt(parseInt(group, 16)), 0n);
}

function bigIntToIPv6(n: bigint): string {
  const groups: string[] = [];
  for (let i = 0; i < 8; i++) {
    groups.unshift((n & 0xffffn).toString(16));
    n >>= 16n;
  }
  // Compress longest run of consecutive zero groups with '::'
  const full = groups.join(':');
  let best = { start: -1, len: 0 };
  let cur  = { start: -1, len: 0 };
  groups.forEach((g, i) => {
    if (g === '0') {
      if (cur.start === -1) cur = { start: i, len: 1 };
      else cur.len++;
      if (cur.len > best.len) best = { ...cur };
    } else {
      cur = { start: -1, len: 0 };
    }
  });
  if (best.len < 2) return full;
  const left  = groups.slice(0, best.start).join(':');
  const right = groups.slice(best.start + best.len).join(':');
  return `${left}::${right}`.replace(/^:([^:])/, '::$1').replace(/([^:]):$/, '$1::');
}

function isValidIPv6(ip: string): boolean {
  try {
    // Basic structural check
    const parts = ip.split('::');
    if (parts.length > 2) return false;
    const groups = ip.replace('::', ':0:').split(':').filter(Boolean);
    if (groups.length > 8) return false;
    return groups.every(g => /^[0-9a-fA-F]{1,4}$/.test(g));
  } catch { return false; }
}

function getIPv6Scope(ip: string): { ipScope: string; subnetMeaning: string; scopeColor: string } {
  const expanded = expandIPv6(ip).toLowerCase();
  const groups = expanded.split(':');
  const first  = parseInt(groups[0], 16);

  if (expanded === '0000:0000:0000:0000:0000:0000:0000:0001')
    return { ipScope: 'Loopback', subnetMeaning: 'Loopback (::1)', scopeColor: '#fcc419' };
  if (expanded.startsWith('fe80'))
    return { ipScope: 'Link-Local', subnetMeaning: 'Link-local (fe80::/10)', scopeColor: '#ff922b' };
  if (expanded.startsWith('fc') || expanded.startsWith('fd'))
    return { ipScope: 'Unique Local', subnetMeaning: 'Unique Local (fc00::/7)', scopeColor: '#51cf66' };
  if (groups[0] === 'ff00' || (first & 0xff00) === 0xff00)
    return { ipScope: 'Multicast', subnetMeaning: 'Multicast (ff00::/8)', scopeColor: '#cc5de8' };
  if (expanded.startsWith('2001:0db8'))
    return { ipScope: 'Documentation', subnetMeaning: 'Documentation (2001:db8::/32)', scopeColor: '#74c0fc' };
  if (expanded.startsWith('2002'))
    return { ipScope: 'Global', subnetMeaning: '6to4 Tunnel (2002::/16)', scopeColor: IPV6_SCOPE_COLOR };
  if (expanded === '0000:0000:0000:0000:0000:0000:0000:0000')
    return { ipScope: 'Unspecified', subnetMeaning: 'Unspecified address (::/128)', scopeColor: '#868e96' };

  return { ipScope: 'Global', subnetMeaning: 'Global Unicast (2000::/3)', scopeColor: IPV6_SCOPE_COLOR };
}

function formatAddressCount(hostBits: number): string {
  if (hostBits === 0) return '1';
  if (hostBits <= 52) return Math.pow(2, hostBits).toLocaleString();
  return `2^${hostBits}`;
}

export function calculateIPv6(ip: string, cidr: number): IPv6CalcResult {
  if (!isValidIPv6(ip)) throw new Error('Invalid IPv6 address');

  const ipInt   = ipv6ToBigInt(ip);
  const maskInt = cidr === 0 ? 0n : (~0n << BigInt(128 - cidr)) & ((1n << 128n) - 1n);
  const networkInt = ipInt & maskInt;
  const lastInt    = networkInt | (~maskInt & ((1n << 128n) - 1n));
  const hostBits   = 128 - cidr;
  const { ipScope, subnetMeaning, scopeColor } = getIPv6Scope(ip);

  return {
    version: 'ipv6',
    input: `${ip}/${cidr}`,
    ip,
    cidr,
    network:      `${bigIntToIPv6(networkInt)}/${cidr}`,
    firstAddress:  bigIntToIPv6(networkInt),
    lastAddress:   bigIntToIPv6(lastInt),
    addressCount:  formatAddressCount(hostBits),
    ipClass:      'IPv6',
    ipScope,
    subnetMeaning,
    scopeColor,
  };
}

export function calculateSubnet(value: string, fallbackCidr = '24'): CalcResult {
  const { ip, cidr } = parseIpAndCidr(value, fallbackCidr);
  const version = detectIpVersion(ip);
  if (!version) throw new Error('Invalid IP address');
  return version === 'ipv4' ? calculateIPv4(ip, cidr) : calculateIPv6(ip, cidr);
}

export function calculateVlsm(baseIp: string, baseCidr: number, requests: VlsmRequest[]): VlsmAllocation[] {
  const sorted = [...requests].sort((a, b) => b.hosts - a.hosts);
  const base = calculateIPv4(baseIp, baseCidr);
  let cursor = ipToInt(base.network);
  return sorted.map(req => {
    const needed = req.hosts + 2;
    const blockSize = Math.pow(2, Math.ceil(Math.log2(needed)));
    const cidr = 32 - Math.log2(blockSize);
    const alloc = { label: req.label, requestedHosts: req.hosts, allocatedHosts: blockSize - 2, cidr, network: intToIp(cursor), firstHost: intToIp(cursor + 1), lastHost: intToIp(cursor + blockSize - 2), broadcast: intToIp(cursor + blockSize - 1) };
    cursor += blockSize;
    return alloc;
  });
}