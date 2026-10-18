/**
 * Astrolabium - Motor de Proyección Estereográfica
 * 
 * Implementa la proyección conforme de la esfera celeste sobre el plano del ecuador:
 * - Astrolabio Septentrional: proyección desde el Polo Sur Celeste (SCP). El centro es el Polo Norte Celeste (NCP).
 * - Astrolabio Austral: proyección desde el Polo Norte Celeste (NCP). El centro es el Polo Sur Celeste (SCP).
 * - Preservación de círculos: traslada círculos sobre la esfera a círculos exactos en el plano.
 */

export class StereographicProjector {
  constructor(Req = 140, hemisphere = 'north') {
    this.Req = Req; // Radio arbitrario del ecuador en píxeles/unidades
    this.hemisphere = hemisphere; // 'north' o 'south'
  }

  setHemisphere(hemisphere) {
    this.hemisphere = hemisphere;
  }

  setReq(Req) {
    this.Req = Req;
  }

  /**
   * Radio proyectado para una declinación dada (en grados).
   */
  decToRadius(decDeg) {
    const decRad = decDeg * (Math.PI / 180.0);
    if (this.hemisphere === 'north') {
      // Proyección desde SCP: dec = +90 es r=0; dec = 0 es r=Req; dec = -90 es r=infinito
      return this.Req * Math.tan(Math.PI / 4.0 - decRad / 2.0);
    } else {
      // Proyección desde NCP: dec = -90 es r=0; dec = 0 es r=Req; dec = +90 es r=infinito
      return this.Req * Math.tan(Math.PI / 4.0 + decRad / 2.0);
    }
  }

  /**
   * Declinación a partir del radio en el plano.
   */
  radiusToDec(r) {
    if (this.hemisphere === 'north') {
      const decRad = Math.PI / 2.0 - 2.0 * Math.atan(r / this.Req);
      return decRad * (180.0 / Math.PI);
    } else {
      const decRad = 2.0 * Math.atan(r / this.Req) - Math.PI / 2.0;
      return decRad * (180.0 / Math.PI);
    }
  }

  /**
   * Proyecta coordenadas ecuatoriales (RA, Dec) en coordenadas cartesianas (x, y) de la placa.
   * Por convención astronómica e instrumental:
   * El meridiano local coincide con el eje vertical Y.
   */
  projectEquatorial(raDeg, decDeg) {
    const r = this.decToRadius(decDeg);
    const raRad = raDeg * (Math.PI / 180.0);

    let x, y;
    if (this.hemisphere === 'north') {
      // Visto desde el polo norte celeste: la ascensión recta aumenta en sentido antihorario
      x = r * Math.cos(raRad);
      y = r * Math.sin(raRad);
    } else {
      // Visto desde el polo sur celeste: invertimos orientación para conservar Este-Oeste
      x = r * Math.cos(-raRad);
      y = r * Math.sin(-raRad);
    }

    return { x, y, r };
  }

  /**
   * Propiedad cardinal de la proyección estereográfica:
   * Los círculos en la esfera celeste proyectan en círculos en el plano.
   * centerRa, centerDec: centro del círculo en la esfera
   * angularRadius: radio angular en grados
   * 
   * Devuelve { xc, yc, rProj }
   */
  projectCircle(centerRaDeg, centerDecDeg, angularRadiusDeg) {
    const dec1 = centerDecDeg + angularRadiusDeg;
    const dec2 = centerDecDeg - angularRadiusDeg;

    // Verificar si el círculo encierra el polo de proyección
    if (this.hemisphere === 'north' && dec2 <= -90.0) {
      throw new Error("El círculo contiene el polo sur celeste de proyección.");
    }
    if (this.hemisphere === 'south' && dec1 >= 90.0) {
      throw new Error("El círculo contiene el polo norte celeste de proyección.");
    }

    const r1 = this.decToRadius(dec1);
    const r2 = this.decToRadius(dec2);

    // Radio proyectado en el plano
    const rProj = Math.abs(r2 - r1) / 2.0;
    // Distancia desde el origen al centro proyectado
    const rCenter = (r1 + r2) / 2.0;

    let raRad = centerRaDeg * (Math.PI / 180.0);
    if (this.hemisphere === 'south') {
      raRad = -raRad;
    }

    const xc = rCenter * Math.cos(raRad);
    const yc = rCenter * Math.sin(raRad);

    return { xc, yc, rProj };
  }
}
