export type IPVersion = 'ipv4' | 'ipv6';

export type IPv4CalcResult = {
  version: 'ipv4';
  input: string;
  ip: string;
  cidr: number;
  network: string;
  broadcast: string;
  firstHost: string;
  lastHost: string;
  mask: string;
  wildcardMask: string;
  usableHosts: string;
  ipClass: string;
  ipScope: string;
  subnetMeaning: string;
  scopeColor: string;
};

export type IPv6CalcResult = {
  version: 'ipv6';
  input: string;
  ip: string;
  cidr: number;
  network: string;
  firstAddress: string;
  lastAddress: string;
  addressCount: string;
  ipClass: 'IPv6';
  ipScope: string;
  subnetMeaning: string;
  scopeColor: string;
};

export type CalcResult = IPv4CalcResult | IPv6CalcResult;

export type VlsmRequest = {
  label: string;
  hosts: number;
};

export type VlsmAllocation = {
  label: string;
  requestedHosts: number;
  allocatedHosts: number;
  cidr: number;
  network: string;
  firstHost: string;
  lastHost: string;
  broadcast: string;
};

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

  if (!trimmed) {
    return {
      ip: '',
      cidr: parseInt(fallbackCidr, 10) || 24,
    };
  }

  if (trimmed.includes('/')) {
    const [ip, cidrRaw] = trimmed.split('/');
    return {
      ip: ip.trim(),
      cidr:
        parseInt((cidrRaw || fallbackCidr).trim(), 10) ||
        parseInt(fallbackCidr, 10) ||
        24,
    };
  }

  return {
    ip: trimmed,
    cidr: parseInt(fallbackCidr, 10) || 24,
  };
}

function ipToInt(ip: string) {
  return ip
    .split('.')
    .reduce((int, octet) => ((int << 8) + parseInt(octet, 10)) >>> 0, 0);
}

function intToIp(int: number) {
  return [
    (int >>> 24) & 255,
    (int >>> 16) & 255,
    (int >>> 8) & 255,
    int & 255,
  ].join('.');
}

export function isValidIPv4(ip: string) {
  const regex =
    /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
  return regex.test(ip.trim());
}

function getIPv4Class(firstOctet: number) {
  if (firstOctet >= 1 && firstOctet <= 126) return 'A';
  if (firstOctet >= 128 && firstOctet <= 191) return 'B';
  if (firstOctet >= 192 && firstOctet <= 223) return 'C';
  if (firstOctet >= 224 && firstOctet <= 239) return 'D';
  return 'E';
}

function getIPv4Scope(ip: string) {
  const parts = ip.split('.').map((part) => parseInt(part, 10));
  const [a, b, c] = parts;

  // RFC 1122 — "This" network
  if (a === 0) return 'Reserved';
  // RFC 1918 — Private
  if (a === 10) return 'Private';
  if (a === 172 && b >= 16 && b <= 31) return 'Private';
  if (a === 192 && b === 168) return 'Private';
  // RFC 5737 — Documentation / TEST-NET
  if (a === 192 && b === 0 && c === 2) return 'Documentation';
  if (a === 198 && b === 51 && c === 100) return 'Documentation';
  if (a === 203 && b === 0 && c === 113) return 'Documentation';
  // RFC 6598 — Shared Address Space (CGNAT)
  if (a === 100 && b >= 64 && b <= 127) return 'CGNAT';
  // Loopback
  if (a === 127) return 'Loopback';
  // RFC 3927 — Link-Local
  if (a === 169 && b === 254) return 'Link-Local';
  // RFC 5771 — Multicast
  if (a >= 224 && a <= 239) return 'Multicast';
  // Class E / Reserved (240–255)
  if (a >= 240) return 'Reserved';
  return 'Public';
}

function getIPv4Meaning(cidr: number) {
  if (cidr === 32) return 'Single host route';
  if (cidr === 31) return 'Point-to-point subnet';
  if (cidr <= 8) return 'Massive address space';
  if (cidr <= 16) return 'Very large network';
  if (cidr <= 24) return 'Typical LAN subnet';
  if (cidr <= 27) return 'Small subnet';
  if (cidr <= 30) return 'Tiny routed segment';
  return 'Specialized subnet';
}

export function calculateIPv4(ip: string, cidr: number): IPv4CalcResult {
  if (!isValidIPv4(ip)) {
    throw new Error('Enter a valid IPv4 address.');
  }

  if (Number.isNaN(cidr) || cidr < 0 || cidr > 32) {
    throw new Error('CIDR must be between 0 and 32.');
  }

  const ipInt = ipToInt(ip);
  const maskInt = cidr === 0 ? 0 : (~0 << (32 - cidr)) >>> 0;
  const networkInt = (ipInt & maskInt) >>> 0;
  const broadcastInt = (networkInt | (~maskInt >>> 0)) >>> 0;
  const wildcardInt = (~maskInt) >>> 0;

  let usable = Math.pow(2, 32 - cidr) - 2;
  if (cidr === 31) usable = 2;
  if (cidr === 32) usable = 1;

  const firstHost =
    cidr >= 31 ? intToIp(networkInt) : intToIp((networkInt + 1) >>> 0);
  const lastHost =
    cidr >= 31 ? intToIp(broadcastInt) : intToIp((broadcastInt - 1) >>> 0);

  const ipParts = ip.split('.').map((part) => parseInt(part, 10));
  const ipClass = getIPv4Class(ipParts[0]);
  const ipScope = getIPv4Scope(ip);

  return {
    version: 'ipv4',
    input: `${ip}/${cidr}`,
    ip,
    cidr,
    network: intToIp(networkInt),
    broadcast: intToIp(broadcastInt),
    firstHost,
    lastHost,
    mask: intToIp(maskInt),
    wildcardMask: intToIp(wildcardInt),
    usableHosts: usable.toLocaleString(),
    ipClass,
    ipScope,
    subnetMeaning: getIPv4Meaning(cidr),
    scopeColor: IPV4_SCOPE_COLOR,
  };
}

function expandIPv6(ip: string) {
  const lower = ip.trim().toLowerCase();

  if (!lower.includes('::')) {
    const groups = lower.split(':');
    if (groups.length !== 8) throw new Error('Enter a valid IPv6 address.');
    return groups.map((group) => group.padStart(4, '0'));
  }

  const [left, right] = lower.split('::');
  const leftGroups = left ? left.split(':').filter(Boolean) : [];
  const rightGroups = right ? right.split(':').filter(Boolean) : [];
  const missing = 8 - (leftGroups.length + rightGroups.length);

  if (missing < 0) throw new Error('Enter a valid IPv6 address.');

  return [
    ...leftGroups.map((group) => group.padStart(4, '0')),
    ...Array.from({ length: missing }, () => '0000'),
    ...rightGroups.map((group) => group.padStart(4, '0')),
  ];
}

function compressIPv6(groups: string[]) {
  const normalized = groups.map((group) => group.replace(/^0+/, '') || '0');

  let bestStart = -1;
  let bestLength = 0;
  let currentStart = -1;
  let currentLength = 0;

  for (let i = 0; i < normalized.length; i += 1) {
    if (normalized[i] === '0') {
      if (currentStart === -1) currentStart = i;
      currentLength += 1;

      if (currentLength > bestLength) {
        bestLength = currentLength;
        bestStart = currentStart;
      }
    } else {
      currentStart = -1;
      currentLength = 0;
    }
  }

  if (bestLength <= 1) return normalized.join(':');

  const left = normalized.slice(0, bestStart).join(':');
  const right = normalized.slice(bestStart + bestLength).join(':');

  if (!left && !right) return '::';
  if (!left) return `::${right}`;
  if (!right) return `${left}::`;
  return `${left}::${right}`;
}

function ipv6GroupsToBigInt(groups: string[]) {
  return groups.reduce((acc, group) => (acc << 16n) + BigInt(`0x${group}`), 0n);
}

function bigIntToIpv6Groups(value: bigint) {
  const groups: string[] = [];

  for (let i = 0; i < 8; i += 1) {
    const group = Number((value >> BigInt((7 - i) * 16)) & 0xffffn)
      .toString(16)
      .padStart(4, '0');
    groups.push(group);
  }

  return groups;
}

export function isValidIPv6(ip: string) {
  try {
    const lower = ip.trim().toLowerCase();
    // RFC 4291: '::' may appear at most once; ':::' is always invalid
    if (lower.includes(':::')) return false;
    const doubleColonCount = (lower.match(/::/g) || []).length;
    if (doubleColonCount > 1) return false;
    const groups = expandIPv6(ip);
    return (
      groups.length === 8 &&
      groups.every((group) => /^[0-9a-f]{4}$/.test(group))
    );
  } catch {
    return false;
  }
}

function getIPv6Scope(ip: string) {
  const expanded = expandIPv6(ip);
  const first = parseInt(expanded[0], 16);

  if ((first & 0xfe00) === 0xfc00) return 'Unique Local';
  if ((first & 0xffc0) === 0xfe80) return 'Link-Local';
  if ((first & 0xff00) === 0xff00) return 'Multicast';
  if (expanded.every((group) => group === '0000')) return 'Unspecified';
  if (compressIPv6(expanded) === '::1') return 'Loopback';
  return 'Global';
}

function getIPv6Meaning(cidr: number) {
  if (cidr === 128) return 'Single IPv6 interface';
  if (cidr === 127) return 'Point-to-point link (RFC 6164)';
  if (cidr === 64)  return 'Standard IPv6 LAN (/64)';
  if (cidr >= 48)   return 'Site subnet allocation';
  if (cidr >= 32)   return 'Regional allocation';
  if (cidr < 32)    return 'Large ISP/RIR block';
  return 'IPv6 subnet';
}

export function calculateIPv6(ip: string, cidr: number): IPv6CalcResult {
  if (!isValidIPv6(ip)) {
    throw new Error('Enter a valid IPv6 address.');
  }

  if (Number.isNaN(cidr) || cidr < 0 || cidr > 128) {
    throw new Error('CIDR must be between 0 and 128.');
  }

  const groups = expandIPv6(ip);
  const ipBig = ipv6GroupsToBigInt(groups);
  const shift = BigInt(128 - cidr);
  const mask =
    cidr === 0 ? 0n : ((1n << 128n) - 1n) ^ ((1n << shift) - 1n);
  const networkBig = ipBig & mask;
  const lastBig = cidr === 128 ? ipBig : networkBig + ((1n << shift) - 1n);

  const network = compressIPv6(bigIntToIpv6Groups(networkBig));
  const lastAddress = compressIPv6(bigIntToIpv6Groups(lastBig));
  const count = cidr === 128 ? 1n : 1n << shift;

  const ipScope = getIPv6Scope(ip);

  return {
    version: 'ipv6',
    input: `${ip}/${cidr}`,
    ip: compressIPv6(groups),
    cidr,
    network,
    firstAddress: network,
    lastAddress,
    addressCount: count.toString(),
    ipClass: 'IPv6',
    ipScope,
    subnetMeaning: getIPv6Meaning(cidr),
    scopeColor: IPV6_SCOPE_COLOR,
  };
}

export function calculateSubnet(
  value: string,
  fallbackCidr = '24'
): CalcResult {
  const { ip, cidr } = parseIpAndCidr(value, fallbackCidr);
  const version = detectIpVersion(ip);

  if (!version) {
    throw new Error('Enter an IPv4 or IPv6 address.');
  }

  if (version === 'ipv4') {
    return calculateIPv4(ip, cidr);
  }

  return calculateIPv6(ip, cidr);
}

export function calculateVlsm(
  baseIp: string,
  baseCidr: number,
  requests: VlsmRequest[]
): VlsmAllocation[] {
  if (!isValidIPv4(baseIp)) {
    throw new Error('VLSM currently supports IPv4 major networks.');
  }

  if (Number.isNaN(baseCidr) || baseCidr < 0 || baseCidr > 32) {
    throw new Error('Base CIDR must be between 0 and 32.');
  }

  const base = calculateIPv4(baseIp, baseCidr);
  const sorted = [...requests].sort((a, b) => b.hosts - a.hosts);

  let cursor = ipToInt(base.network);
  const max = ipToInt(base.broadcast);

  const allocations: VlsmAllocation[] = [];

  for (const request of sorted) {
    const needed = request.hosts <= 2 ? request.hosts : request.hosts + 2;
    const blockSize = Math.pow(2, Math.ceil(Math.log2(Math.max(needed, 1))));
    const cidr = 32 - Math.log2(blockSize);

    const network = cursor;
    const broadcast = cursor + blockSize - 1;

    if (broadcast > max) {
      throw new Error('Not enough address space for all requested subnets.');
    }

    allocations.push({
      label: request.label,
      requestedHosts: request.hosts,
      allocatedHosts: blockSize <= 2 ? blockSize : blockSize - 2,
      cidr,
      network: intToIp(network),
      firstHost: blockSize <= 2 ? intToIp(network) : intToIp(network + 1),
      lastHost:
        blockSize <= 2 ? intToIp(broadcast) : intToIp(broadcast - 1),
      broadcast: intToIp(broadcast),
    });

    cursor = broadcast + 1;
  }

  return allocations;
}