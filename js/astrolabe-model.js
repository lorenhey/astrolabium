/**
 * Astrolabium - Modelado Geométrico e Instrumental del Astrolabio
 * 
 * Modela las cuatro capas físicas del instrumento:
 * 1. Mater (Madre): Limbo graduado en 360° y 24 horas, trono y anilla de suspensión.
 * 2. Tympan (Tímpano): Placa para una latitud dada con trópicos, ecuador, horizonte,
 *    crepúsculo, almucantarates (círculos de altitud), acimutes y horas desiguales.
 * 3. Rete (Araña): Red celeste calada con la eclíptica zodiacal excéntrica y punteros de estrellas.
 * 4. Rule y Alidade (Regla delantera y Alhidada trasera con pínulas de mira y cuadrado de sombras).
 */

import { StereographicProjector } from './projection.js';
import {
  OBLIQUITY_J2000,
  ASTROLABE_STARS,
  ZODIAC_SIGNS,
  eclipticToEquatorial
} from './astronomy.js';

export class AstrolabeModel {
  constructor(latitude = -34.60, Req = 140) {
    this.Req = Req;
    this.latitude = latitude;
    this.hemisphere = latitude >= 0 ? 'north' : 'south';
    this.projector = new StereographicProjector(Req, this.hemisphere);
    this.obliquity = OBLIQUITY_J2000;
  }

  setLatitude(lat) {
    this.latitude = lat;
    this.hemisphere = lat >= 0 ? 'north' : 'south';
    this.projector.setHemisphere(this.hemisphere);
  }

  setReq(Req) {
    this.Req = Req;
    this.projector.setReq(Req);
  }

  // --- 1. LÍMITES Y CÍRCULOS FUNDAMENTALES ---

  getEquatorRadius() {
    return this.projector.decToRadius(0.0);
  }

  getTropicOfCancerRadius() {
    return this.projector.decToRadius(this.obliquity);
  }

  getTropicOfCapricornRadius() {
    return this.projector.decToRadius(-this.obliquity);
  }

  /**
   * Radio exterior de la placa del tímpano (el trópico más exterior).
   * En el hemisferio norte: Trópico de Capricornio (-23.44°).
   * En el hemisferio sur: Trópico de Cáncer (+23.44°).
   */
  getOuterTympanRadius() {
    return this.hemisphere === 'north'
      ? this.getTropicOfCapricornRadius()
      : this.getTropicOfCancerRadius();
  }

  // --- 2. TÍMPANO (CLIMA O PLACA DE LATITUD) ---

  /**
   * Círculo del horizonte astronómico (altitud = 0°).
   * Círculo sobre la esfera celeste con centro en el Cenit y radio angular de 90°.
   */
  getHorizon() {
    return this.getAlmucantar(0.0);
  }

  /**
   * Círculo crepuscular (altitud = -18° crepúsculo astronómico, o -12° náutico).
   */
  getTwilightCircle(altitude = -18.0) {
    return this.getAlmucantar(altitude);
  }

  /**
   * Círculo de altitud igual (Almucantarate).
   * Centro celeste en el Cenit (dec = latitud, RA = 90° o 270° según hemisferio).
   * Radio angular = 90° - altitud.
   */
  getAlmucantar(altitudeDeg) {
    const zenithDec = this.latitude;
    // En proyección septentrional, el meridiano sur se alinea en el eje vertical Y
    const zenithRa = 90.0;
    const angularRadius = 90.0 - altitudeDeg;

    return this.projector.projectCircle(zenithRa, zenithDec, angularRadius);
  }

  /**
   * Lista de almucantarates desde alt = 0° hasta 85° en pasos dados (ej. cada 5°).
   */
  getAlmucantarList(stepDeg = 5) {
    const list = [];
    for (let alt = 0; alt <= 85; alt += stepDeg) {
      try {
        const circle = this.getAlmucantar(alt);
        list.push({ alt, ...circle });
      } catch (e) {
        // Ignorar si el círculo pasa por el polo de proyección
      }
    }
    return list;
  }

  /**
   * Arcos de acimut (círculos ortogonales al horizonte que van del Cenit al Nadir).
   */
  getAzimuthCircle(azimuthDeg) {
    // Cenit y Nadir proyectados
    const zenithDec = this.latitude;
    const nadirDec = -this.latitude;
    const zenithRa = 90.0;
    const nadirRa = 270.0;

    const z = this.projector.projectEquatorial(zenithRa, zenithDec);
    const n = this.projector.projectEquatorial(nadirRa, nadirDec);

    // Los centros de todos los círculos de acimut descansan sobre la mediatriz del segmento Cenit-Nadir
    const midY = (z.y + n.y) / 2.0;
    const halfDist = (z.y - n.y) / 2.0;

    // Azimut medido desde el Sur o Norte según tradición
    const azRad = azimuthDeg * (Math.PI / 180.0);
    const xc = halfDist * Math.tan(azRad);
    const yc = midY;
    const r = Math.hypot(xc, z.y - yc);

    return { az: azimuthDeg, xc, yc, rProj: r };
  }

  getAzimuthList(stepDeg = 15) {
    const list = [];
    for (let az = 10; az < 360; az += stepDeg) {
      if (az === 90 || az === 270) continue; // Puntos singulares
      try {
        const circ = this.getAzimuthCircle(az);
        list.push(circ);
      } catch (e) {}
    }
    return list;
  }

  // --- 3. ARAÑA (RETE) ---

  /**
   * Anillo excéntrico de la Eclíptica.
   * La eclíptica es un círculo máximo (radio angular 90°) inclinado un ángulo epsilon (oblicuidad).
   * Polo Norte de la Eclíptica en RA = 270°, Dec = 90° - epsilon.
   */
  getEclipticCircle() {
    const centerRa = this.hemisphere === 'north' ? 270.0 : 90.0;
    const centerDec = this.hemisphere === 'north'
      ? (90.0 - this.obliquity)
      : (this.obliquity - 90.0);

    return this.projector.projectCircle(centerRa, centerDec, 90.0);
  }

  /**
   * Posiciones proyectadas de los 12 signos del zodíaco a lo largo del anillo de la eclíptica.
   */
  getZodiacMarkings() {
    const markings = [];
    for (let lon = 0; lon < 360; lon += 5) {
      const eq = eclipticToEquatorial(lon, 0, this.obliquity);
      const proj = this.projector.projectEquatorial(eq.ra, eq.dec);
      const isSignBoundary = lon % 30 === 0;
      const signIndex = Math.floor(lon / 30);
      const sign = ZODIAC_SIGNS[signIndex];

      markings.push({
        lon,
        x: proj.x,
        y: proj.y,
        isSignBoundary,
        sign: isSignBoundary ? sign.name : null,
        symbol: isSignBoundary ? sign.symbol : null
      });
    }
    return markings;
  }

  /**
   * Estrellas de la Araña con sus posiciones proyectadas y punteros.
   */
  getProjectedStars() {
    const rLimit = this.getOuterTympanRadius() * 1.05;
    const projected = [];

    ASTROLABE_STARS.forEach(s => {
      // Filtrar estrellas que queden fuera del trópico exterior o pasen del polo
      const proj = this.projector.projectEquatorial(s.ra, s.dec);
      if (proj.r <= rLimit && proj.r > 2) {
        projected.push({
          ...s,
          x: proj.x,
          y: proj.y,
          dist: proj.r
        });
      }
    });

    return projected;
  }

  // --- 4. DORSO DEL ASTROLABIO (CUADRADO DE SOMBRAS Y CALENDARIO) ---

  /**
   * Datos geométricos del Cuadrado de Sombras (Shadow Square).
   * Escala de 12 puntos de gnomon tradicional:
   * - Umbra Versa (sombras de alturas mayores a 45°)
   * - Umbra Recta (sombras de alturas menores a 45°)
   */
  getShadowSquareGeometry(size = 80) {
    return {
      size,
      half: size / 2,
      points: 12, // 12 dígitos históricos de gnomon
      step: size / 24
    };
  }
}
