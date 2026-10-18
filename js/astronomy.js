/**
 * Astrolabium - Motor de Cálculo Astronómico
 * 
 * Implementa algoritmos de astronomía clásica y posicional:
 * - Conversión de fechas a Día Juliano (JD)
 * - Tiempo Sideral Medio de Greenwich (GMST) y Tiempo Sideral Local (LST)
 * - Coordenadas del Sol en la eclíptica (longitud, ascensión recta, declinación)
 * - Transformación entre sistemas de coordenadas (Ecuatorial <-> Horizontal)
 * - Catálogo histórico de estrellas brillantes para la Araña (Rete)
 * - Horas temporarias (desiguales) y cálculo de orto y ocaso
 */

export const OBLIQUITY_J2000 = 23.4392911; // Grados
export const J2000 = 2451545.0;

/**
 * Convierte un objeto Date (en UTC) a Día Juliano (Julian Date).
 */
export function getJulianDate(date) {
  const y0 = date.getUTCFullYear();
  const m0 = date.getUTCMonth() + 1;
  const d = date.getUTCDate() +
            date.getUTCHours() / 24.0 +
            date.getUTCMinutes() / 1440.0 +
            date.getUTCSeconds() / 86400.0;

  let y = y0;
  let m = m0;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }

  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);

  const JD = Math.floor(365.25 * (y + 4716)) +
             Math.floor(30.6001 * (m + 1)) +
             d + B - 1524.5;
  return JD;
}

/**
 * Tiempo Sideral Medio de Greenwich (GMST) en grados [0, 360).
 */
export function getGMST(jd) {
  const T = (jd - 2451545.0) / 36525.0;
  let theta = 280.46061837 +
              360.98564736629 * (jd - 2451545.0) +
              0.000387933 * T * T -
              (T * T * T) / 38710000.0;
  theta = theta % 360.0;
  if (theta < 0) theta += 360.0;
  return theta;
}

/**
 * Tiempo Sideral Local (LST) en grados [0, 360).
 * Longitud en grados decimales (positiva hacia el Este, negativa hacia el Oeste).
 */
export function getLST(jd, longitudeDeg) {
  const gmst = getGMST(jd);
  let lst = (gmst + longitudeDeg) % 360.0;
  if (lst < 0) lst += 360.0;
  return lst;
}

/**
 * Posición aparente simplificada del Sol en la eclíptica (algoritmo histórico).
 * Devuelve la longitud eclíptica en grados [0, 360).
 */
export function getSolarEclipticLongitude(jd) {
  const n = jd - 2451545.0;
  // Longitud media del Sol
  const L = (280.460 + 0.9856474 * n) % 360.0;
  // Anomalía media del Sol
  const g = ((357.528 + 0.9856003 * n) % 360.0) * (Math.PI / 180.0);
  // Longitud eclíptica verdadera
  let lambda = L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g);
  lambda = lambda % 360.0;
  if (lambda < 0) lambda += 360.0;
  return lambda;
}

/**
 * Convierte coordenadas eclípticas (longitud, latitud) a coordenadas ecuatoriales (RA, Dec).
 * Entradas y salidas en grados.
 */
export function eclipticToEquatorial(lonDeg, latDeg = 0.0, obliquityDeg = OBLIQUITY_J2000) {
  const lon = lonDeg * (Math.PI / 180.0);
  const lat = latDeg * (Math.PI / 180.0);
  const obl = obliquityDeg * (Math.PI / 180.0);

  const sinDec = Math.sin(lat) * Math.cos(obl) + Math.cos(lat) * Math.sin(obl) * Math.sin(lon);
  const decRad = Math.asin(sinDec);

  const y = Math.sin(lon) * Math.cos(obl) - Math.tan(lat) * Math.sin(obl);
  const x = Math.cos(lon);
  let raRad = Math.atan2(y, x);

  let raDeg = raRad * (180.0 / Math.PI);
  if (raDeg < 0) raDeg += 360.0;

  return {
    ra: raDeg,
    dec: decRad * (180.0 / Math.PI)
  };
}

/**
 * Convierte coordenadas ecuatoriales (RA, Dec) a horizontales (Altitud, Azimut).
 * Azimut medido desde el Norte (0°) hacia el Este (90°), Sur (180°), Oeste (270°).
 */
export function equatorialToHorizontal(raDeg, decDeg, lstDeg, latDeg) {
  let ha = (lstDeg - raDeg) % 360.0;
  if (ha < 0) ha += 360.0;

  const haRad = ha * (Math.PI / 180.0);
  const decRad = decDeg * (Math.PI / 180.0);
  const latRad = latDeg * (Math.PI / 180.0);

  const sinAlt = Math.sin(decRad) * Math.sin(latRad) +
                 Math.cos(decRad) * Math.cos(latRad) * Math.cos(haRad);
  const altRad = Math.asin(Math.max(-1.0, Math.min(1.0, sinAlt)));

  const cosAzTimesCosAlt = Math.sin(decRad) * Math.cos(latRad) -
                           Math.cos(decRad) * Math.sin(latRad) * Math.cos(haRad);
  const sinAzTimesCosAlt = -Math.cos(decRad) * Math.sin(haRad);

  let azRad = Math.atan2(sinAzTimesCosAlt, cosAzTimesCosAlt);
  let azDeg = azRad * (180.0 / Math.PI);
  if (azDeg < 0) azDeg += 360.0;

  return {
    alt: altRad * (180.0 / Math.PI),
    az: azDeg
  };
}

/**
 * Signos del zodíaco con sus nombres en español y latín, y rango de longitud eclíptica.
 */
export const ZODIAC_SIGNS = [
  { name: 'Aries', symbol: '♈', startDeg: 0, endDeg: 30, span: '21 Mar - 19 Abr' },
  { name: 'Tauro', symbol: '♉', startDeg: 30, endDeg: 60, span: '20 Abr - 20 May' },
  { name: 'Géminis', symbol: '♊', startDeg: 60, endDeg: 90, span: '21 May - 20 Jun' },
  { name: 'Cáncer', symbol: '♋', startDeg: 90, endDeg: 120, span: '21 Jun - 22 Jul' },
  { name: 'Leo', symbol: '♌', startDeg: 120, endDeg: 150, span: '23 Jul - 22 Ago' },
  { name: 'Virgo', symbol: '♍', startDeg: 150, endDeg: 180, span: '23 Ago - 22 Sep' },
  { name: 'Libra', symbol: '♎', startDeg: 180, endDeg: 210, span: '23 Sep - 22 Oct' },
  { name: 'Escorpio', symbol: '♏', startDeg: 210, endDeg: 240, span: '23 Oct - 21 Nov' },
  { name: 'Sagitario', symbol: '♐', startDeg: 240, endDeg: 270, span: '22 Nov - 21 Dic' },
  { name: 'Capricornio', symbol: '♑', startDeg: 270, endDeg: 300, span: '22 Dic - 19 Ene' },
  { name: 'Acuario', symbol: '♒', startDeg: 300, endDeg: 330, span: '20 Ene - 18 Feb' },
  { name: 'Piscis', symbol: '♓', startDeg: 330, endDeg: 360, span: '19 Feb - 20 Mar' }
];

export function getZodiacFromLongitude(lonDeg) {
  const norm = ((lonDeg % 360) + 360) % 360;
  const index = Math.floor(norm / 30);
  const sign = ZODIAC_SIGNS[index];
  const degInSign = norm % 30;
  return {
    sign: sign.name,
    symbol: sign.symbol,
    degInSign: degInSign.toFixed(1),
    fullText: `${sign.symbol} ${sign.name} ${degInSign.toFixed(1)}°`
  };
}

/**
 * Catálogo estelar histórico para el diseño de la Araña (Rete).
 * Incluye las estrellas de primera magnitud y referencias astrolábicas clásicas
 * (nombres tradicionales árabes y latinos, constelación, RA y Dec J2000, y magnitud).
 */
export const ASTROLABE_STARS = [
  { name: 'Sirius', arabic: 'Al-Shi\'ra', constel: 'Canis Major', ra: 101.287, dec: -16.716, mag: -1.46 },
  { name: 'Canopus', arabic: 'Suhayl', constel: 'Carina', ra: 95.988, dec: -52.696, mag: -0.74 },
  { name: 'Vega', arabic: 'Al-Waqi', constel: 'Lyra', ra: 279.234, dec: 38.784, mag: 0.03 },
  { name: 'Arcturus', arabic: 'Al-Simak al-Ramih', constel: 'Boötes', ra: 213.915, dec: 19.182, mag: -0.05 },
  { name: 'Rigel', arabic: 'Rijl Jauzah', constel: 'Orion', ra: 78.634, dec: -8.202, mag: 0.18 },
  { name: 'Capella', arabic: 'Al-Ayyuq', constel: 'Auriga', ra: 79.172, dec: 45.998, mag: 0.08 },
  { name: 'Procyon', arabic: 'Al-Shi\'ra al-Sha\'miya', constel: 'Canis Minor', ra: 114.825, dec: 5.225, mag: 0.34 },
  { name: 'Betelgeuse', arabic: 'Ibt al-Jawza', constel: 'Orion', ra: 88.793, dec: 7.407, mag: 0.42 },
  { name: 'Achernar', arabic: 'Akhir al-Nahr', constel: 'Eridanus', ra: 24.429, dec: -57.237, mag: 0.45 },
  { name: 'Hadar', arabic: 'Hadar', constel: 'Centaurus', ra: 210.956, dec: -60.373, mag: 0.61 },
  { name: 'Altair', arabic: 'Al-Nasr al-Ta\'ir', constel: 'Aquila', ra: 297.696, dec: 8.868, mag: 0.77 },
  { name: 'Aldebaran', arabic: 'Al-Dabaran', constel: 'Taurus', ra: 68.980, dec: 16.509, mag: 0.85 },
  { name: 'Antares', arabic: 'Qalb al-Aqrab', constel: 'Scorpius', ra: 247.352, dec: -26.432, mag: 0.96 },
  { name: 'Spica', arabic: 'Al-Simak al-A\'zal', constel: 'Virgo', ra: 201.298, dec: -11.161, mag: 0.98 },
  { name: 'Pollux', arabic: 'Al-Dira', constel: 'Gemini', ra: 116.329, dec: 28.026, mag: 1.14 },
  { name: 'Fomalhaut', arabic: 'Fam al-Hut', constel: 'Piscis Austrinus', ra: 344.413, dec: -29.622, mag: 1.17 },
  { name: 'Deneb', arabic: 'Dhanab al-Dajajah', constel: 'Cygnus', ra: 310.358, dec: 45.280, mag: 1.25 },
  { name: 'Regulus', arabic: 'Qalb al-Asad', constel: 'Leo', ra: 152.093, dec: 11.967, mag: 1.36 },
  { name: 'Castor', arabic: 'Ras al-Tawa\'m', constel: 'Gemini', ra: 113.650, dec: 31.888, mag: 1.58 },
  { name: 'Alkaid', arabic: 'Qaid Banat Na\'sh', constel: 'Ursa Major', ra: 206.885, dec: 49.313, mag: 1.85 },
  { name: 'Alpheratz', arabic: 'Surrat al-Faras', constel: 'Andromeda', ra: 2.097, dec: 29.090, mag: 2.06 },
  { name: 'Polaris', arabic: 'Al-Kawkab al-Shimali', constel: 'Ursa Minor', ra: 37.955, dec: 89.264, mag: 1.98 },
  { name: 'Acrux', arabic: 'Al-Salib', constel: 'Crux', ra: 186.650, dec: -63.099, mag: 0.77 },
  { name: 'Mimosa', arabic: 'Bekrux', constel: 'Crux', ra: 191.930, dec: -59.689, mag: 1.25 }
];
