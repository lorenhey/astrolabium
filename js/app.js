/**
 * Astrolabium - Controlador Principal de la Aplicación Web (js/app.js)
 * 
 * Orquesta:
 * - Sincronización entre controles de latitud, fecha, hora y el instrumento
 * - Cálculo astronómico en tiempo real (JD, LST, posición solar, altitud/azimut de estrellas)
 * - Simulación y animación del movimiento diurno de la esfera celeste
 * - Modos de vista Anverso (Araña/Tímpano) y Reverso (Alhidada/Sombras)
 * - Misiones y casos de uso históricos guiados
 * - Generación y descarga de archivos vectoriales SVG para corte láser
 */

import {
  getJulianDate,
  getLST,
  getSolarEclipticLongitude,
  eclipticToEquatorial,
  equatorialToHorizontal,
  getZodiacFromLongitude,
  ASTROLABE_STARS
} from './astronomy.js';

import { AstrolabeModel } from './astrolabe-model.js';
import { AstrolabeRenderer } from './renderer.js';

class AstrolabiumApp {
  constructor() {
    this.currentDate = new Date();
    this.model = new AstrolabeModel(-34.60, 140); // Latitud por defecto: Buenos Aires (-34.60°)
    this.initDOM();
    this.initRenderer();
    this.bindEvents();
    this.applyCityPreset('buenos-aires');
    this.updateAstronomicalClock();
  }

  initDOM() {
    this.dom = {
      canvas: document.getElementById('astrolabe-canvas'),
      // Controles geográficos
      selectCity: document.getElementById('select-city'),
      inputLat: document.getElementById('input-lat'),
      inputLon: document.getElementById('input-lon'),
      sliderLat: document.getElementById('slider-lat'),
      badgeHemisphere: document.getElementById('badge-hemisphere'),

      // Controles temporales
      inputDate: document.getElementById('input-date'),
      inputTime: document.getElementById('input-time'),
      btnNow: document.getElementById('btn-now'),
      btnStepHour: document.getElementById('btn-step-hour'),
      btnPlayPause: document.getElementById('btn-play-pause'),
      selectAnimSpeed: document.getElementById('select-anim-speed'),

      // Rotaciones manuales
      sliderRete: document.getElementById('slider-rete'),
      valRete: document.getElementById('val-rete'),
      sliderRule: document.getElementById('slider-rule'),
      valRule: document.getElementById('val-rule'),
      sliderAlidade: document.getElementById('slider-alidade'),
      valAlidade: document.getElementById('val-alidade'),

      // Conmutadores de vista y capas
      btnViewFront: document.getElementById('btn-view-front'),
      btnViewBack: document.getElementById('btn-view-back'),
      toggleAlmucantars: document.getElementById('toggle-almucantars'),
      toggleAzimuths: document.getElementById('toggle-azimuths'),
      toggleStarLabels: document.getElementById('toggle-star-labels'),
      toggleSun: document.getElementById('toggle-sun'),

      // Paneles y badges de lecturas astronómicas
      badgeLST: document.getElementById('badge-lst'),
      badgeSunZodiac: document.getElementById('badge-sun-zodiac'),
      badgeSunAlt: document.getElementById('badge-sun-alt'),
      badgeJulianDate: document.getElementById('badge-julian-date'),
      visibleStarsTable: document.getElementById('visible-stars-table'),
      sunInfoCard: document.getElementById('sun-info-card'),

      // Misiones guiadas
      missionSelect: document.getElementById('mission-select'),
      missionCard: document.getElementById('mission-card'),
      btnStepMission: document.getElementById('btn-step-mission'),

      // Botones de exportación
      btnExportTympanSVG: document.getElementById('btn-export-tympan-svg'),
      btnExportReteSVG: document.getElementById('btn-export-rete-svg'),
      btnExportSessionJSON: document.getElementById('btn-export-session-json')
    };

    // Inicializar inputs de fecha y hora local
    const pad = (n) => String(n).padStart(2, '0');
    const y = this.currentDate.getFullYear();
    const m = pad(this.currentDate.getMonth() + 1);
    const d = pad(this.currentDate.getDate());
    const hh = pad(this.currentDate.getHours());
    const mm = pad(this.currentDate.getMinutes());

    if (this.dom.inputDate) this.dom.inputDate.value = `${y}-${m}-${d}`;
    if (this.dom.inputTime) this.dom.inputTime.value = `${hh}:${mm}`;
  }

  initRenderer() {
    this.renderer = new AstrolabeRenderer(this.dom.canvas, this.model);
    this.renderer.onAngleChange = (angles) => {
      if (this.dom.valRete) this.dom.valRete.textContent = `${Math.round(angles.rete)}°`;
      if (this.dom.sliderRete) this.dom.sliderRete.value = Math.round(angles.rete);

      if (this.dom.valRule) this.dom.valRule.textContent = `${Math.round(angles.rule)}°`;
      if (this.dom.sliderRule) this.dom.sliderRule.value = Math.round(angles.rule);

      if (this.dom.valAlidade) this.dom.valAlidade.textContent = `${Math.round(angles.alidade)}°`;
      if (this.dom.sliderAlidade) this.dom.sliderAlidade.value = Math.round(angles.alidade);
    };
  }

  bindEvents() {
    // 1. Ciudad / Coordenadas
    if (this.dom.selectCity) {
      this.dom.selectCity.addEventListener('change', (e) => {
        this.applyCityPreset(e.target.value);
      });
    }

    const onLatChange = (lat) => {
      this.model.setLatitude(lat);
      if (this.dom.badgeHemisphere) {
        this.dom.badgeHemisphere.textContent = lat >= 0 ? 'Hemisferio Norte' : 'Hemisferio Sur';
        this.dom.badgeHemisphere.className = `badge ${lat >= 0 ? 'badge-info' : 'badge-success'}`;
      }
      this.renderer.resize();
      this.updateAstronomicalClock();
    };

    if (this.dom.inputLat) {
      this.dom.inputLat.addEventListener('input', () => {
        const val = parseFloat(this.dom.inputLat.value) || 0;
        if (this.dom.sliderLat) this.dom.sliderLat.value = val;
        onLatChange(val);
      });
    }

    if (this.dom.sliderLat) {
      this.dom.sliderLat.addEventListener('input', () => {
        const val = parseFloat(this.dom.sliderLat.value) || 0;
        if (this.dom.inputLat) this.dom.inputLat.value = val.toFixed(1);
        onLatChange(val);
      });
    }

    if (this.dom.inputLon) {
      this.dom.inputLon.addEventListener('input', () => {
        this.updateAstronomicalClock();
      });
    }

    // 2. Fecha y Hora
    const onDateTimeChange = () => {
      const dateVal = this.dom.inputDate.value;
      const timeVal = this.dom.inputTime.value;
      if (dateVal && timeVal) {
        const [y, m, d] = dateVal.split('-').map(Number);
        const [hh, mm] = timeVal.split(':').map(Number);
        this.currentDate = new Date(y, m - 1, d, hh, mm);
        this.updateAstronomicalClock();
      }
    };

    if (this.dom.inputDate) this.dom.inputDate.addEventListener('change', onDateTimeChange);
    if (this.dom.inputTime) this.dom.inputTime.addEventListener('change', onDateTimeChange);

    if (this.dom.btnNow) {
      this.dom.btnNow.addEventListener('click', () => {
        this.currentDate = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        this.dom.inputDate.value = `${this.currentDate.getFullYear()}-${pad(this.currentDate.getMonth() + 1)}-${pad(this.currentDate.getDate())}`;
        this.dom.inputTime.value = `${pad(this.currentDate.getHours())}:${pad(this.currentDate.getMinutes())}`;
        this.updateAstronomicalClock();
      });
    }

    if (this.dom.btnStepHour) {
      this.dom.btnStepHour.addEventListener('click', () => {
        this.currentDate = new Date(this.currentDate.getTime() + 3600 * 1000);
        const pad = (n) => String(n).padStart(2, '0');
        this.dom.inputTime.value = `${pad(this.currentDate.getHours())}:${pad(this.currentDate.getMinutes())}`;
        this.updateAstronomicalClock();
      });
    }

    // Animación en tiempo real (Play / Pause)
    this.isAnimating = false;
    if (this.dom.btnPlayPause) {
      this.dom.btnPlayPause.addEventListener('click', () => {
        this.isAnimating = !this.isAnimating;
        this.dom.btnPlayPause.textContent = this.isAnimating ? '⏸ Pausar Rotación' : '▶ Rotación Diurna';
        if (this.isAnimating) {
          this.lastAnimFrame = performance.now();
          this.startAnimationLoop();
        }
      });
    }

    // 3. Sliders de Rotación Manual
    if (this.dom.sliderRete) {
      this.dom.sliderRete.addEventListener('input', (e) => {
        const deg = parseFloat(e.target.value);
        this.renderer.state.reteRotationDeg = deg;
        if (this.dom.valRete) this.dom.valRete.textContent = `${Math.round(deg)}°`;
        this.renderer.render();
      });
    }

    if (this.dom.sliderRule) {
      this.dom.sliderRule.addEventListener('input', (e) => {
        const deg = parseFloat(e.target.value);
        this.renderer.state.ruleRotationDeg = deg;
        if (this.dom.valRule) this.dom.valRule.textContent = `${Math.round(deg)}°`;
        this.renderer.render();
      });
    }

    if (this.dom.sliderAlidade) {
      this.dom.sliderAlidade.addEventListener('input', (e) => {
        const deg = parseFloat(e.target.value);
        this.renderer.state.alidadeRotationDeg = deg;
        if (this.dom.valAlidade) this.dom.valAlidade.textContent = `${Math.round(deg)}°`;
        this.renderer.render();
      });
    }

    // 4. Conmutadores de vista Anverso / Reverso
    if (this.dom.btnViewFront) {
      this.dom.btnViewFront.addEventListener('click', () => {
        this.renderer.state.viewMode = 'front';
        this.dom.btnViewFront.classList.add('active');
        this.dom.btnViewBack.classList.remove('active');
        this.renderer.render();
      });
    }

    if (this.dom.btnViewBack) {
      this.dom.btnViewBack.addEventListener('click', () => {
        this.renderer.state.viewMode = 'back';
        this.dom.btnViewBack.classList.add('active');
        this.dom.btnViewFront.classList.remove('active');
        this.renderer.render();
      });
    }

    // Toggles de capas
    if (this.dom.toggleAlmucantars) {
      this.dom.toggleAlmucantars.addEventListener('change', (e) => {
        this.renderer.state.showAlmucantars = e.target.checked;
        this.renderer.render();
      });
    }

    if (this.dom.toggleAzimuths) {
      this.dom.toggleAzimuths.addEventListener('change', (e) => {
        this.renderer.state.showAzimuths = e.target.checked;
        this.renderer.render();
      });
    }

    if (this.dom.toggleStarLabels) {
      this.dom.toggleStarLabels.addEventListener('change', (e) => {
        this.renderer.state.showStarLabels = e.target.checked;
        this.renderer.render();
      });
    }

    if (this.dom.toggleSun) {
      this.dom.toggleSun.addEventListener('change', (e) => {
        this.renderer.state.showSun = e.target.checked;
        this.renderer.render();
      });
    }

    // 5. Misiones guiadas
    if (this.dom.missionSelect) {
      this.dom.missionSelect.addEventListener('change', (e) => {
        this.loadMission(e.target.value);
      });
    }

    // 6. Exportaciones
    if (this.dom.btnExportTympanSVG) {
      this.dom.btnExportTympanSVG.addEventListener('click', () => {
        this.exportSVG('tympan', `astrolabio_timpano_lat_${this.model.latitude.toFixed(1)}.svg`);
      });
    }

    if (this.dom.btnExportReteSVG) {
      this.dom.btnExportReteSVG.addEventListener('click', () => {
        this.exportSVG('rete', `astrolabio_arana_rete.svg`);
      });
    }

    if (this.dom.btnExportSessionJSON) {
      this.dom.btnExportSessionJSON.addEventListener('click', () => {
        this.exportSessionJSON();
      });
    }

    // Pestañas generales
    const tabButtons = document.querySelectorAll('.nav-tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        tabButtons.forEach(b => b.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const targetPane = document.getElementById(targetId);
        if (targetPane) targetPane.classList.add('active');

        if (targetId === 'tab-simulador') {
          setTimeout(() => this.renderer.resize(), 50);
        }

        if (targetId === 'tab-teoria' && window.renderMathInElement) {
          window.renderMathInElement(targetPane, {
            delimiters: [
              { left: '$$', right: '$$', display: true },
              { left: '$', right: '$', display: false }
            ]
          });
        }
      });
    });
  }

  applyCityPreset(cityKey) {
    const presets = {
      'buenos-aires': { lat: -34.60, lon: -58.38, name: 'Buenos Aires (Argentina)' },
      'cordoba': { lat: -31.42, lon: -64.19, name: 'Córdoba (Observatorio Histórico)' },
      'toledo': { lat: 39.86, lon: -4.02, name: 'Toledo (Tablas Alfonsíes)' },
      'greenwich': { lat: 51.48, lon: 0.00, name: 'Greenwich (Observatorio Real)' },
      'baghdad': { lat: 33.31, lon: 44.36, name: 'Bagdad (Casa de la Sabiduría)' },
      'alexandria': { lat: 31.20, lon: 29.92, name: 'Alejandría (Claudio Ptolomeo)' },
      'paris': { lat: 48.86, lon: 2.35, name: 'París (Observatorio de París)' }
    };

    const p = presets[cityKey];
    if (p) {
      if (this.dom.inputLat) this.dom.inputLat.value = p.lat.toFixed(2);
      if (this.dom.sliderLat) this.dom.sliderLat.value = p.lat;
      if (this.dom.inputLon) this.dom.inputLon.value = p.lon.toFixed(2);
      this.model.setLatitude(p.lat);
      if (this.dom.badgeHemisphere) {
        this.dom.badgeHemisphere.textContent = p.lat >= 0 ? 'Hemisferio Norte' : 'Hemisferio Sur';
        this.dom.badgeHemisphere.className = `badge ${p.lat >= 0 ? 'badge-info' : 'badge-success'}`;
      }
      this.renderer.resize();
      this.updateAstronomicalClock();
    }
  }

  updateAstronomicalClock() {
    const lat = parseFloat(this.dom.inputLat?.value) || -34.60;
    const lon = parseFloat(this.dom.inputLon?.value) || -58.38;

    // 1. Día Juliano y Tiempo Sideral
    const jd = getJulianDate(this.currentDate);
    const lstDeg = getLST(jd, lon);
    const lstHours = lstDeg / 15.0;

    // 2. Longitud y posición del Sol
    const sunLon = getSolarEclipticLongitude(jd);
    const sunZodiac = getZodiacFromLongitude(sunLon);
    const sunEq = eclipticToEquatorial(sunLon, 0, this.model.obliquity);
    const sunHoriz = equatorialToHorizontal(sunEq.ra, sunEq.dec, lstDeg, lat);

    // Actualizar estado del renderizador
    this.renderer.state.sunLongitudeDeg = sunLon;
    // La rotación de la araña simula la orientación sideral (LST)
    if (!this.isDragging) {
      this.renderer.state.reteRotationDeg = lstDeg;
      if (this.dom.valRete) this.dom.valRete.textContent = `${Math.round(lstDeg)}°`;
      if (this.dom.sliderRete) this.dom.sliderRete.value = Math.round(lstDeg);
    }

    // 3. Actualizar Badges en la cabecera
    if (this.dom.badgeJulianDate) {
      this.dom.badgeJulianDate.textContent = `JD ${jd.toFixed(2)}`;
    }
    if (this.dom.badgeLST) {
      const hh = Math.floor(lstHours);
      const mm = Math.floor((lstHours - hh) * 60);
      this.dom.badgeLST.textContent = `LST ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} (${lstDeg.toFixed(1)}°)`;
    }
    if (this.dom.badgeSunZodiac) {
      this.dom.badgeSunZodiac.textContent = `Sol: ${sunZodiac.fullText}`;
    }
    if (this.dom.badgeSunAlt) {
      this.dom.badgeSunAlt.textContent = `Alt Sol: ${sunHoriz.alt.toFixed(1)}° (${sunHoriz.alt >= 0 ? 'Día' : 'Noche'})`;
      this.dom.badgeSunAlt.className = `badge ${sunHoriz.alt >= 0 ? 'badge-warning' : 'badge-neutral'}`;
    }

    // 4. Ficha solar
    if (this.dom.sunInfoCard) {
      this.dom.sunInfoCard.innerHTML = `
        <div style="font-family: var(--font-mono); font-size: 0.8rem; line-height: 1.6;">
          <div><strong>Longitud Eclíptica (λ):</strong> ${sunLon.toFixed(2)}° (${sunZodiac.fullText})</div>
          <div><strong>Ascensión Recta (α):</strong> ${(sunEq.ra / 15).toFixed(2)}h (${sunEq.ra.toFixed(1)}°)</div>
          <div><strong>Declinación (δ):</strong> ${sunEq.dec >= 0 ? '+' : ''}${sunEq.dec.toFixed(2)}°</div>
          <div><strong>Altitud actual:</strong> <span style="color: ${sunHoriz.alt >= 0 ? '#f59e0b' : '#64748b'};">${sunHoriz.alt.toFixed(1)}°</span></div>
          <div><strong>Acimut actual:</strong> ${sunHoriz.az.toFixed(1)}°</div>
        </div>
      `;
    }

    // 5. Tabla de estrellas visibles en este momento
    this.updateVisibleStars(lstDeg, lat);

    this.renderer.render();
  }

  updateVisibleStars(lstDeg, lat) {
    if (!this.dom.visibleStarsTable) return;

    const visible = [];
    ASTROLABE_STARS.forEach(s => {
      const h = equatorialToHorizontal(s.ra, s.dec, lstDeg, lat);
      if (h.alt > 0) {
        visible.push({ ...s, alt: h.alt, az: h.az });
      }
    });

    visible.sort((a, b) => b.alt - a.alt);

    let html = '';
    visible.slice(0, 10).forEach(s => {
      html += `
        <tr>
          <td><strong>${s.name}</strong> <small>(${s.arabic})</small></td>
          <td>${s.constel}</td>
          <td><strong style="color: #38bdf8;">${s.alt.toFixed(1)}°</strong></td>
          <td>${s.az.toFixed(1)}°</td>
          <td>${s.mag.toFixed(2)}</td>
        </tr>
      `;
    });

    if (visible.length === 0) {
      html = `<tr><td colspan="5" style="text-align: center; color: var(--text-dim);">No hay estrellas de primera magnitud visibles sobre el horizonte en este instante.</td></tr>`;
    }

    this.dom.visibleStarsTable.innerHTML = html;
  }

  startAnimationLoop() {
    if (!this.isAnimating) return;

    const now = performance.now();
    const dt = (now - this.lastAnimFrame) / 1000;
    this.lastAnimFrame = now;

    const speedMultiplier = parseFloat(this.dom.selectAnimSpeed?.value) || 60; // segundos simulados por segundo real
    const simulatedSeconds = dt * speedMultiplier;

    this.currentDate = new Date(this.currentDate.getTime() + simulatedSeconds * 1000);

    const pad = (n) => String(n).padStart(2, '0');
    if (this.dom.inputDate) this.dom.inputDate.value = `${this.currentDate.getFullYear()}-${pad(this.currentDate.getMonth() + 1)}-${pad(this.currentDate.getDate())}`;
    if (this.dom.inputTime) this.dom.inputTime.value = `${pad(this.currentDate.getHours())}:${pad(this.currentDate.getMinutes())}`;

    this.updateAstronomicalClock();

    requestAnimationFrame(() => this.startAnimationLoop());
  }

  loadMission(missionKey) {
    if (!this.dom.missionCard) return;

    const missions = {
      'night-time': {
        title: 'Misión 1: Saber qué hora de la noche es midiendo la estrella Vega',
        desc: 'En una noche despejada de verano, apuntás tu alhidada hacia la brillante estrella Vega y medís una altitud de 35°. ¿Cómo usaban el astrolabio para saber la hora exacta?',
        steps: [
          '1. Buscá el puntero de la estrella Vega en la Araña (Rete).',
          '2. Girás la Araña hasta que la punta de Vega coincida exactamente con el almucantarate de 35° en el Tímpano.',
          '3. Alineás la Regla (Rule) con la posición del Sol para la fecha de hoy en la Eclíptica.',
          '4. Leés la hora local directamente en el limbo exterior de la Madre.'
        ]
      },
      'solar-noon': {
        title: 'Misión 2: Determinar la hora del mediodía solar verdadero',
        desc: 'El mediodía solar ocurre en el instante exacto en que el Sol cruza el meridiano local (la línea vertical superior del tímpano).',
        steps: [
          '1. Determiná el grado del zodíaco en que se encuentra el Sol en la fecha deseada.',
          '2. Girás la Araña hasta que ese punto exacto de la eclíptica toque la línea del meridiano vertical.',
          '3. Apoyás la Regla sobre ese punto y comprobás que marca exactamente las XII horas solares en el limbo.',
          '4. La altitud máxima que alcanza el Sol en ese momento se lee sobre el almucantarate correspondiente.'
        ]
      },
      'tower-height': {
        title: 'Misión 3: Medir la altura de una torre usando el Cuadrado de Sombras',
        desc: 'El dorso del astrolabio se usaba en agrimensura y balística medieval como teodolito trigonométrico.',
        steps: [
          '1. Te parás a 24 metros de la base de la torre y suspendés el astrolabio por su anilla.',
          '2. Girás la Alhidada hasta divisar el remate superior de la torre a través de las dos pínulas de mira.',
          '3. La línea de fe de la alhidada corta el Cuadrado de Sombras en 6 dígitos de Umbra Versa.',
          '4. Por semejanza de triángulos: Altura = Distancia × (Dígitos / 12) = 24 m × (6 / 12) = 12 m (+ altura del ojo).'
        ]
      }
    };

    const m = missions[missionKey];
    if (m) {
      let stepsHtml = m.steps.map(s => `<li style="margin-bottom: 0.4rem;">${s}</li>`).join('');
      this.dom.missionCard.innerHTML = `
        <div style="background: rgba(56, 189, 248, 0.06); border-left: 4px solid var(--cyan); padding: 1rem; border-radius: 6px;">
          <h4 style="color: #fff; margin-bottom: 0.5rem;">${m.title}</h4>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 0.75rem;">${m.desc}</p>
          <ol style="padding-left: 1.25rem; font-size: 0.82rem; color: #cbd5e1;">${stepsHtml}</ol>
        </div>
      `;
    }
  }

  exportSVG(layerName, filename) {
    const svgContent = this.renderer.generateLayerSVG(layerName);
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  exportSessionJSON() {
    const data = {
      project: 'Astrolabium',
      version: '1.5.0',
      timestamp: new Date().toISOString(),
      location: {
        latitude: this.model.latitude,
        longitude: parseFloat(this.dom.inputLon?.value) || -58.38,
        hemisphere: this.model.hemisphere
      },
      astronomy: {
        julian_date: getJulianDate(this.currentDate),
        lst_deg: getLST(getJulianDate(this.currentDate), parseFloat(this.dom.inputLon?.value) || -58.38),
        sun_ecliptic_lon: getSolarEclipticLongitude(getJulianDate(this.currentDate))
      }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `astrolabio_sesion_lat_${this.model.latitude.toFixed(1)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Iniciar aplicación al cargar el DOM
window.addEventListener('DOMContentLoaded', () => {
  window.astrolabiumApp = new AstrolabiumApp();
});
