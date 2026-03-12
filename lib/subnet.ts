export type IPVersion = 'ipv4' | 'ipv6';

export type IPv4CalcResult = {
  version: 'ipv4'; input: string; ip: string; cidr: number; network: string;
  broadcast: string; firstHost: string; lastHost: string; mask: string;
  wildcardMask: string; usableHosts: string; ipClass: string; ipScope: string;
  subnetMeaning: string; scopeColor: string;
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

export function calculateIPv4(ip: string, cidr: number): IPv4CalcResult {
  if (!isValidIPv4(ip)) throw new Error('Invalid IPv4');
  const ipInt = ipToInt(ip);
  const maskInt = cidr === 0 ? 0 : (~0 << (32 - cidr)) >>> 0;
  const networkInt = (ipInt & maskInt) >>> 0;
  const broadcastInt = (networkInt | (~maskInt >>> 0)) >>> 0;
  const firstHost = cidr >= 31 ? intToIp(networkInt) : intToIp(networkInt + 1);
  const lastHost = cidr >= 31 ? intToIp(broadcastInt) : intToIp(broadcastInt - 1);
  const usable = cidr === 32 ? 1 : cidr === 31 ? 2 : Math.pow(2, 32 - cidr) - 2;

  return {
    version: 'ipv4', input: `${ip}/${cidr}`, ip, cidr,
    network: intToIp(networkInt), broadcast: intToIp(broadcastInt),
    firstHost, lastHost, mask: intToIp(maskInt), wildcardMask: intToIp(~maskInt >>> 0),
    usableHosts: usable.toLocaleString(), ipClass: 'C', ipScope: 'Public', subnetMeaning: 'Subnet', scopeColor: IPV4_SCOPE_COLOR
  };
}

export function calculateIPv6(ip: string, cidr: number): IPv6CalcResult {
  return { version: 'ipv6', input: `${ip}/${cidr}`, ip, cidr, network: ip, firstAddress: ip, lastAddress: 'N/A', addressCount: '2^' + (128 - cidr), ipClass: 'IPv6', ipScope: 'Global', subnetMeaning: 'IPv6 Subnet', scopeColor: IPV6_SCOPE_COLOR };
}

export function calculateSubnet(value: string, fallbackCidr = '24'): CalcResult {
  const { ip, cidr } = parseIpAndCidr(value, fallbackCidr);
  const version = detectIpVersion(ip);
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