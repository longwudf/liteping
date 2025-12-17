export const locationMap: Record<string, string> = {
  // --- 🌏 亚洲 (Asia) ---
  'HKG': '🇭🇰 Hong Kong',
  'TPE': '🇹🇼 Taipei',
  'KIX': '🇯🇵 Osaka',
  'NRT': '🇯🇵 Tokyo',
  'ICN': '🇰🇷 Seoul',
  'SIN': '🇸🇬 Singapore',
  'KUL': '🇲🇾 Kuala Lumpur',
  'BKK': '🇹🇭 Bangkok',
  'SGN': '🇻🇳 Ho Chi Minh City',
  'HAN': '🇻🇳 Hanoi',
  'CGK': '🇮🇩 Jakarta',
  'MNL': '🇵🇭 Manila',
  'BOM': '🇮🇳 Mumbai',
  'DEL': '🇮🇳 New Delhi',
  'MAA': '🇮🇳 Chennai',
  'BLR': '🇮🇳 Bangalore',

  // --- 🌎 北美 (North America) ---
  'LAX': '🇺🇸 Los Angeles',
  'SJC': '🇺🇸 San Jose',
  'SFO': '🇺🇸 San Francisco',
  'PDX': '🇺🇸 Portland',
  'SEA': '🇺🇸 Seattle',
  'DFW': '🇺🇸 Dallas',
  'ORD': '🇺🇸 Chicago',
  'EWR': '🇺🇸 Newark',
  'JFK': '🇺🇸 New York',
  'LGA': '🇺🇸 New York',
  'IAD': '🇺🇸 Washington, DC',
  'MIA': '🇺🇸 Miami',
  'ATL': '🇺🇸 Atlanta',
  'YYZ': '🇨🇦 Toronto',
  'YVR': '🇨🇦 Vancouver',
  'YUL': '🇨🇦 Montreal',

  // --- 🌍 欧洲 (Europe) ---
  'LHR': '🇬🇧 London',
  'MAN': '🇬🇧 Manchester',
  'FRA': '🇩🇪 Frankfurt',
  'MUC': '🇩🇪 Munich',
  'BER': '🇩🇪 Berlin',
  'CDG': '🇫🇷 Paris',
  'MRS': '🇫🇷 Marseille',
  'AMS': '🇳🇱 Amsterdam',
  'MAD': '🇪🇸 Madrid',
  'BCN': '🇪🇸 Barcelona',
  'MXP': '🇮🇹 Milan',
  'FCO': '🇮🇹 Rome',
  'ZRH': '🇨🇭 Zurich',
  'GVA': '🇨🇭 Geneva',
  'ARN': '🇸🇪 Stockholm',
  'OSL': '🇳🇴 Oslo',
  'CPH': '🇩🇰 Copenhagen',
  'HEL': '🇫🇮 Helsinki',
  'WAW': '🇵🇱 Warsaw',
  'VIE': '🇦🇹 Vienna',
  'PRG': '🇨🇿 Prague',

  // --- 🌏 大洋洲 (Oceania) ---
  'SYD': '🇦🇺 Sydney',
  'MEL': '🇦🇺 Melbourne',
  'BNE': '🇦🇺 Brisbane',
  'PER': '🇦🇺 Perth',
  'AKL': '🇳🇿 Auckland',

  // --- 🌎 南美 (South America) ---
  'GRU': '🇧🇷 São Paulo',
  'GIG': '🇧🇷 Rio de Janeiro',
  'EZE': '🇦🇷 Buenos Aires',
  'SCL': '🇨🇱 Santiago',
  'BOG': '🇨🇴 Bogotá',
  'LIM': '🇵🇪 Lima',

  // --- 🌍 非洲 & 中东 (Africa & Middle East) ---
  'JNB': '🇿🇦 Johannesburg',
  'CPT': '🇿🇦 Cape Town',
  'CAI': '🇪🇬 Cairo',
  'DXB': '🇦🇪 Dubai',
  'RUH': '🇸🇦 Riyadh',
  'TLV': '🇮🇱 Tel Aviv',

  // --- ☁️ 特殊 ---
  'GLOBAL': '🌍 Global Edge'
};

// 辅助函数：找不到就直接显示代码
export function getLocationName(code: string): string {
  if (!code) return 'EDGE';
  return locationMap[code] || code;
}