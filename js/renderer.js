/**
 * Astrolabium - Renderizador Gráfico en Canvas y Exportador SVG
 * 
 * Dibuja en tiempo real (60 FPS):
 * - Frente del astrolabio: Madre, Tímpano para cualquier latitud, Araña rotatoria con la Eclíptica y Estrellas, y Regla delantera.
 * - Dorso del astrolabio: Cuadrante de sombras (Umbra Recta y Versa), calendario zodiacal y Alhidada con pínulas de mira.
 * - Soporte para arrastre táctil y con mouse (Drag & Drop de la Araña, Regla y Alhidada).
 * - Exportación vectorial limpia en SVG paramétrico listo para corte láser o impresión.
 */

export class AstrolabeRenderer {
  constructor(canvasElement, model) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.model = model;

    // Estado de rotaciones y vista
    this.state = {
      viewMode: 'front', // 'front' | 'back'
      reteRotationDeg: 0, // Rotación de la araña (tiempo sideral)
      ruleRotationDeg: 90, // Rotación de la regla delantera
      alidadeRotationDeg: 45, // Rotación de la alhidada trasera
      sunLongitudeDeg: 0, // Longitud del Sol en la eclíptica
      showAlmucantars: true,
      showAzimuths: true,
      showStarLabels: true,
      showUnequalHours: true,
      showSun: true,
      antiqueTheme: true
    };

    // Parámetros de arrastre
    this.isDragging = false;
    this.dragTarget = null; // 'rete' | 'rule' | 'alidade'
    this.dragStartAngle = 0;
    this.startElemAngle = 0;

    this.initEvents();
    this.resize();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    const size = Math.min(rect.width || 600, rect.height || 600);

    this.canvas.width = size * dpr;
    this.canvas.height = size * dpr;
    this.ctx.resetTransform();
    this.ctx.scale(dpr, dpr);

    this.size = size;
    this.centerX = size / 2;
    this.centerY = size / 2 + 15; // Dejar espacio superior para el trono
    this.baseRadius = size * 0.41;

    // Actualizar Req del modelo acorde a la escala
    this.model.setReq(this.baseRadius * 0.65);

    this.render();
  }

  initEvents() {
    window.addEventListener('resize', () => this.resize());

    const getAngleFromCenter = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const x = clientX - rect.left - this.centerX;
      const y = clientY - rect.top - this.centerY;
      let angle = Math.atan2(y, x) * (180 / Math.PI);
      return angle;
    };

    const handlePointerDown = (e) => {
      const angle = getAngleFromCenter(e);
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const dist = Math.hypot(clientX - rect.left - this.centerX, clientY - rect.top - this.centerY);

      if (dist <= this.baseRadius * 1.15) {
        this.isDragging = true;
        this.dragStartAngle = angle;

        if (this.state.viewMode === 'front') {
          // Si hace clic cerca del ángulo de la regla, arrastra la regla; de lo contrario, la araña
          const ruleDiff = Math.abs(((angle - this.state.ruleRotationDeg + 180) % 360) - 180);
          if (ruleDiff < 18) {
            this.dragTarget = 'rule';
            this.startElemAngle = this.state.ruleRotationDeg;
          } else {
            this.dragTarget = 'rete';
            this.startElemAngle = this.state.reteRotationDeg;
          }
        } else {
          this.dragTarget = 'alidade';
          this.startElemAngle = this.state.alidadeRotationDeg;
        }

        this.canvas.style.cursor = 'grabbing';
        e.preventDefault();
      }
    };

    const handlePointerMove = (e) => {
      if (this.isDragging && this.dragTarget) {
        const currentAngle = getAngleFromCenter(e);
        const delta = currentAngle - this.dragStartAngle;

        if (this.dragTarget === 'rete') {
          this.state.reteRotationDeg = (this.startElemAngle + delta) % 360;
        } else if (this.dragTarget === 'rule') {
          this.state.ruleRotationDeg = (this.startElemAngle + delta) % 360;
        } else if (this.dragTarget === 'alidade') {
          this.state.alidadeRotationDeg = (this.startElemAngle + delta) % 360;
        }

        this.render();
        if (this.onAngleChange) {
          this.onAngleChange({
            rete: this.state.reteRotationDeg,
            rule: this.state.ruleRotationDeg,
            alidade: this.state.alidadeRotationDeg
          });
        }
      }
    };

    const handlePointerUp = () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.dragTarget = null;
        this.canvas.style.cursor = 'grab';
      }
    };

    this.canvas.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);

    this.canvas.addEventListener('touchstart', handlePointerDown, { passive: false });
    window.addEventListener('touchmove', handlePointerMove, { passive: false });
    window.addEventListener('touchend', handlePointerUp);
  }

  render() {
    const { ctx, size, centerX, centerY } = this;
    if (!size) return;

    // 1. Fondo oscuro de observatorio astronómico
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, size, size);

    ctx.save();
    ctx.translate(centerX, centerY);

    if (this.state.viewMode === 'front') {
      this.drawFront();
    } else {
      this.drawBack();
    }

    ctx.restore();
  }

  // =========================================================================
  // FRENTE DEL ASTROLABIO: MADRE, TÍMPANO, ARAÑA Y REGLA
  // =========================================================================

  drawFront() {
    // 1. Trono y Anilla de suspensión superior
    this.drawThrone();

    // 2. Limbo exterior de la Madre (Mater) graduado en 360° y 24 Horas
    this.drawMaterLimb();

    // 3. Tímpano (Placa astronómica fija para la latitud)
    this.drawTympan();

    // 4. Araña (Rete) rotatoria con Eclíptica y Estrellas
    this.drawRete();

    // 5. Regla (Rule) delantera
    this.drawRule();

    // 6. Caballo / Perno central de fijación
    this.drawCentralPin();
  }

  drawThrone() {
    const { ctx, baseRadius } = this;
    const rLimb = baseRadius * 1.14;

    ctx.save();
    // Corona / Trono barroco tallado en latón
    ctx.fillStyle = '#b48a3c';
    ctx.strokeStyle = '#684d1a';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(-rLimb * 0.35, -rLimb);
    ctx.bezierCurveTo(-rLimb * 0.25, -rLimb - 32, -rLimb * 0.1, -rLimb - 42, 0, -rLimb - 42);
    ctx.bezierCurveTo(rLimb * 0.1, -rLimb - 42, rLimb * 0.25, -rLimb - 32, rLimb * 0.35, -rLimb);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Anilla de suspensión (Armilla)
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, -rLimb - 54, 18, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  drawMaterLimb() {
    const { ctx, baseRadius } = this;
    const rOuter = baseRadius * 1.14;
    const rInner = baseRadius;

    ctx.save();

    // Disco de fondo de la Madre
    const grad = ctx.createRadialGradient(0, 0, rInner * 0.8, 0, 0, rOuter);
    grad.addColorStop(0, '#1c2230');
    grad.addColorStop(0.85, '#2a2318');
    grad.addColorStop(1, '#684d1a');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, rOuter, 0, Math.PI * 2);
    ctx.fill();

    // Anillo exterior de latón bruñido
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, rOuter, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#8c6b23';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, rInner, 0, Math.PI * 2);
    ctx.stroke();

    // Graduaciones en el limbo: 360 grados y 24 horas
    const hours = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI',
                   'XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];

    for (let deg = 0; deg < 360; deg++) {
      const angle = (deg - 90) * (Math.PI / 180);
      const isHour = deg % 15 === 0;
      const is5Deg = deg % 5 === 0;

      const r1 = rInner;
      const r2 = isHour ? rOuter - 2 : (is5Deg ? rInner + (rOuter - rInner) * 0.45 : rInner + (rOuter - rInner) * 0.25);

      ctx.strokeStyle = isHour ? '#fef08a' : (is5Deg ? '#d4af37' : '#9a7b2c');
      ctx.lineWidth = isHour ? 1.5 : 0.8;

      ctx.beginPath();
      ctx.moveTo(r1 * Math.cos(angle), r1 * Math.sin(angle));
      ctx.lineTo(r2 * Math.cos(angle), r2 * Math.sin(angle));
      ctx.stroke();

      // Números de hora romanos cada 15°
      if (isHour) {
        const hourIdx = deg / 15;
        const rText = rInner + (rOuter - rInner) * 0.65;
        const tx = rText * Math.cos(angle);
        const ty = rText * Math.sin(angle);

        ctx.font = 'bold 8px serif';
        ctx.fillStyle = '#fef08a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(hours[hourIdx], tx, ty);
      }
    }

    ctx.restore();
  }

  drawTympan() {
    const { ctx, model } = this;
    const rOuter = model.getOuterTympanRadius();

    ctx.save();

    // Recorte circular del tímpano (el tímpano encaja en la madre)
    ctx.beginPath();
    ctx.arc(0, 0, rOuter, 0, Math.PI * 2);
    ctx.clip();

    // Fondo marfil / pergamino antiguo del tímpano
    ctx.fillStyle = '#f7f4ea';
    ctx.fillRect(-rOuter, -rOuter, rOuter * 2, rOuter * 2);

    // 1. Círculos fundamentales: Trópico de Cáncer, Ecuador, Trópico de Capricornio
    const rCancer = model.getTropicOfCancerRadius();
    const rEquator = model.getEquatorRadius();
    const rCap = model.getTropicOfCapricornRadius();

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;

    // Trópico de Cáncer
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(0, 0, rCancer, 0, Math.PI * 2);
    ctx.stroke();

    // Ecuador Celeste
    ctx.setLineDash([]);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#334155';
    ctx.beginPath();
    ctx.arc(0, 0, rEquator, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Línea del Meridiano y Línea Este-Oeste
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -rOuter);
    ctx.lineTo(0, rOuter);
    ctx.moveTo(-rOuter, 0);
    ctx.lineTo(rOuter, 0);
    ctx.stroke();

    // 3. Almucantarates (Círculos de Altitud Igual)
    if (this.state.showAlmucantars) {
      const almucantars = model.getAlmucantarList(5);
      almucantars.forEach(alm => {
        const isHorizon = alm.alt === 0;
        ctx.strokeStyle = isHorizon ? '#0f172a' : '#94a3b8';
        ctx.lineWidth = isHorizon ? 2.2 : 0.6;
        ctx.beginPath();
        ctx.arc(alm.xc, -alm.yc, alm.rProj, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Línea de crepúsculo (-18°)
      try {
        const twi = model.getTwilightCircle(-18);
        ctx.strokeStyle = '#cbd5e1';
        ctx.setLineDash([2, 4]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(twi.xc, -twi.yc, twi.rProj, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      } catch (e) {}
    }

    // 4. Arcos de Acimut
    if (this.state.showAzimuths) {
      const azimuths = model.getAzimuthList(15);
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.4)';
      ctx.lineWidth = 0.5;
      azimuths.forEach(az => {
        ctx.beginPath();
        ctx.arc(az.xc, -az.yc, az.rProj, 0, Math.PI * 2);
        ctx.stroke();
      });
    }

    // Rotulación de la placa: Latitud del Tímpano
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 9px serif';
    ctx.textAlign = 'center';
    ctx.fillText(`PLACA LAT ${model.latitude >= 0 ? '+' : ''}${model.latitude.toFixed(1)}°`, 0, rOuter * 0.85);

    ctx.restore();
  }

  drawRete() {
    const { ctx, model } = this;
    const rot = (this.state.reteRotationDeg * Math.PI) / 180;
    const rOuter = model.getOuterTympanRadius();

    ctx.save();
    ctx.rotate(rot);

    // 1. Anillo excéntrico de la Eclíptica
    const ecl = model.getEclipticCircle();
    const eclR = ecl.rProj;

    ctx.save();
    // Borde exterior e interior de la banda zodiacal
    ctx.strokeStyle = '#b48a3c';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(ecl.xc, -ecl.yc, eclR, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(ecl.xc, -ecl.yc, eclR - 4, 0, Math.PI * 2);
    ctx.arc(ecl.xc, -ecl.yc, eclR + 4, 0, Math.PI * 2);
    ctx.stroke();

    // Marcas de los 12 signos del zodíaco en la eclíptica
    const zodiacs = model.getZodiacMarkings();
    zodiacs.forEach(z => {
      if (z.isSignBoundary) {
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 9px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(z.symbol, z.x, -z.y);
      } else {
        ctx.fillStyle = '#d4af37';
        ctx.beginPath();
        ctx.arc(z.x, -z.y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // 2. Estructura calada de filigrana gótica (arcos de sostén)
    ctx.strokeStyle = '#b48a3c';
    ctx.lineWidth = 2.5;

    // Arco de apoyo central
    ctx.beginPath();
    ctx.arc(0, 0, model.getEquatorRadius(), 0, Math.PI);
    ctx.stroke();

    // Punteros y Agujas de las Estrellas
    const stars = model.getProjectedStars();
    stars.forEach(s => {
      // Aguja flamígera / puntero desde la base
      ctx.fillStyle = '#d4af37';
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.arc(s.x, -s.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Puntero triangular
      const pLen = 7;
      const angle = Math.atan2(-s.y, s.x);
      ctx.beginPath();
      ctx.moveTo(s.x, -s.y);
      ctx.lineTo(s.x + pLen * Math.cos(angle - 0.3), -s.y + pLen * Math.sin(angle - 0.3));
      ctx.lineTo(s.x + (pLen + 2) * Math.cos(angle), -s.y + (pLen + 2) * Math.sin(angle));
      ctx.lineTo(s.x + pLen * Math.cos(angle + 0.3), -s.y + pLen * Math.sin(angle + 0.3));
      ctx.closePath();
      ctx.fill();

      // Nombre de la estrella
      if (this.state.showStarLabels && s.mag < 1.3) {
        ctx.font = 'bold 8px serif';
        ctx.fillStyle = '#451a03';
        ctx.textAlign = 'left';
        ctx.fillText(s.name, s.x + 5, -s.y - 3);
      }
    });

    // 3. Indicador del Sol en la Eclíptica (si está activado)
    if (this.state.showSun) {
      const sunEq = eclipticToEquatorial(this.state.sunLongitudeDeg, 0, model.obliquity);
      const sunProj = model.projector.projectEquatorial(sunEq.ra, sunEq.dec);

      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#fbbf24';
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.arc(sunProj.x, -sunProj.y, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Rayos solares
      for (let a = 0; a < 8; a++) {
        const ang = (a * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(sunProj.x + 6 * Math.cos(ang), -sunProj.y + 6 * Math.sin(ang));
        ctx.lineTo(sunProj.x + 9 * Math.cos(ang), -sunProj.y + 9 * Math.sin(ang));
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    }

    ctx.restore();
    ctx.restore();
  }

  drawRule() {
    const { ctx, model } = this;
    const rOuter = model.getOuterTympanRadius() * 1.05;
    const rot = (this.state.ruleRotationDeg * Math.PI) / 180;

    ctx.save();
    ctx.rotate(rot);

    // Regla biselada de latón semitransparente con graduación de declinaciones
    ctx.fillStyle = 'rgba(212, 175, 55, 0.75)';
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.2;

    ctx.fillRect(0, -3.5, rOuter, 7);
    ctx.strokeRect(0, -3.5, rOuter, 7);

    // Línea de fe (fiducial center line)
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(rOuter, 0);
    ctx.stroke();

    // Puntero extremo de lectura sobre el limbo
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.moveTo(rOuter, -5);
    ctx.lineTo(rOuter + 8, 0);
    ctx.lineTo(rOuter, 5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  drawCentralPin() {
    const { ctx } = this;
    ctx.save();

    // Perno central / Caballo (fijación)
    ctx.fillStyle = '#d4af37';
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // =========================================================================
  // DORSO DEL ASTROLABIO: CUADRADO DE SOMBRAS, CALENDARIO Y ALHIDADA
  // =========================================================================

  drawBack() {
    const { ctx, baseRadius, model } = this;
    const rOuter = baseRadius * 1.14;
    const rInner = baseRadius;

    // 1. Trono y suspensión
    this.drawThrone();

    // 2. Limbo graduado exterior (360° para medir altitud con la Alhidada)
    ctx.save();
    const grad = ctx.createRadialGradient(0, 0, rInner * 0.8, 0, 0, rOuter);
    grad.addColorStop(0, '#1c2230');
    grad.addColorStop(0.85, '#2a2318');
    grad.addColorStop(1, '#684d1a');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, rOuter, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Escala de altitud de 0° a 90° en los 4 cuadrantes
    for (let deg = 0; deg < 360; deg++) {
      const angle = (deg - 90) * (Math.PI / 180);
      const is10 = deg % 10 === 0;
      const is5 = deg % 5 === 0;

      const r1 = rInner;
      const r2 = is10 ? rOuter - 3 : (is5 ? rInner + (rOuter - rInner) * 0.45 : rInner + (rOuter - rInner) * 0.25);

      ctx.strokeStyle = is10 ? '#fef08a' : '#9a7b2c';
      ctx.lineWidth = is10 ? 1.5 : 0.8;

      ctx.beginPath();
      ctx.moveTo(r1 * Math.cos(angle), r1 * Math.sin(angle));
      ctx.lineTo(r2 * Math.cos(angle), r2 * Math.sin(angle));
      ctx.stroke();

      // Cuadrantes de altitud: 0° en el horizonte a 90° en el cenit
      if (is10) {
        let quadAlt = deg % 90;
        if (Math.floor(deg / 90) % 2 === 1) quadAlt = 90 - quadAlt;
        const rText = rInner + (rOuter - rInner) * 0.65;
        ctx.font = '8px monospace';
        ctx.fillStyle = '#fef08a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${quadAlt}°`, rText * Math.cos(angle), rText * Math.sin(angle));
      }
    }

    // 3. Disco interior marfil
    ctx.fillStyle = '#f7f4ea';
    ctx.beginPath();
    ctx.arc(0, 0, rInner, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#684d1a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Ejes horizontal y vertical
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -rInner); ctx.lineTo(0, rInner);
    ctx.moveTo(-rInner, 0); ctx.lineTo(rInner, 0);
    ctx.stroke();

    // 4. Cuadrante de Sombras (Shadow Square)
    const sqSize = rInner * 0.55;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-sqSize / 2, 0, sqSize, sqSize / 2);

    // Graduación de 12 dígitos de sombra (Umbra Recta y Umbra Versa)
    for (let p = 1; p <= 12; p++) {
      const stepX = (sqSize / 2) * (p / 12);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 0.8;

      // Líneas de umbra recta
      ctx.beginPath();
      ctx.moveTo(-sqSize / 2 + stepX, 0);
      ctx.lineTo(-sqSize / 2 + stepX, 6);
      ctx.moveTo(sqSize / 2 - stepX, 0);
      ctx.lineTo(sqSize / 2 - stepX, 6);
      ctx.stroke();

      // Líneas de umbra versa (laterales verticales)
      const stepY = (sqSize / 2) * (p / 12);
      ctx.beginPath();
      ctx.moveTo(-sqSize / 2, stepY);
      ctx.lineTo(-sqSize / 2 + 6, stepY);
      ctx.moveTo(sqSize / 2, stepY);
      ctx.lineTo(sqSize / 2 - 6, stepY);
      ctx.stroke();
    }

    ctx.font = 'bold 9px serif';
    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'center';
    ctx.fillText('UMBRA RECTA', 0, 14);
    ctx.fillText('UMBRA VERSA', -sqSize / 2 + 35, sqSize / 4);
    ctx.fillText('UMBRA VERSA', sqSize / 2 - 35, sqSize / 4);

    // 5. Alhidada giratoria con pínulas de mira
    this.drawAlidade();

    // 6. Perno central
    this.drawCentralPin();

    ctx.restore();
  }

  drawAlidade() {
    const { ctx, baseRadius } = this;
    const rOuter = baseRadius * 1.12;
    const rot = (this.state.alidadeRotationDeg * Math.PI) / 180;

    ctx.save();
    ctx.rotate(rot);

    // Cuerpo de la alhidada
    ctx.fillStyle = '#b48a3c';
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(-rOuter, -5);
    ctx.lineTo(rOuter, -5);
    ctx.lineTo(rOuter + 6, 0);
    ctx.lineTo(rOuter, 5);
    ctx.lineTo(-rOuter, 5);
    ctx.lineTo(-rOuter - 6, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Línea de mira central
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-rOuter, 0);
    ctx.lineTo(rOuter, 0);
    ctx.stroke();

    // Pínulas de mira con visor (paletas perforadas para apuntar a astros)
    const pinulaDist = rOuter * 0.65;
    [-pinulaDist, pinulaDist].forEach(px => {
      ctx.fillStyle = '#78350f';
      ctx.fillRect(px - 3, -12, 6, 24);
      // Orificio estenopeico de observación
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(px, 0, 1.5, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  // =========================================================================
  // EXPORTACIÓN A SVG VECTORIAL PARAMÉTRICO (Corte Láser y Fabricación)
  // =========================================================================

  generateLayerSVG(layerName) {
    const { model, baseRadius } = this;
    const rOuter = model.getOuterTympanRadius();
    const size = rOuter * 2.3;
    const center = size / 2;

    let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    svg += `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}mm" height="${size}mm">\n`;
    svg += `  <style>\n`;
    svg += `    .cut { stroke: #ff0000; stroke-width: 0.1; fill: none; }\n`;
    svg += `    .engrave { stroke: #000000; stroke-width: 0.2; fill: none; }\n`;
    svg += `    .text { font-family: serif; font-size: 3px; fill: #000; text-anchor: middle; }\n`;
    svg += `  </style>\n`;
    svg += `  <g transform="translate(${center}, ${center})">\n`;

    if (layerName === 'tympan') {
      // Corte perimetral
      svg += `    <circle r="${rOuter}" class="cut"/>\n`;
      svg += `    <circle r="2" class="cut"/>\n`; // Agujero del perno

      // Almucantarates
      model.getAlmucantarList(5).forEach(alm => {
        svg += `    <circle cx="${alm.xc.toFixed(2)}" cy="${(-alm.yc).toFixed(2)}" r="${alm.rProj.toFixed(2)}" class="engrave"/>\n`;
      });
      // Ejes
      svg += `    <line x1="0" y1="${-rOuter}" x2="0" y2="${rOuter}" class="engrave"/>\n`;
      svg += `    <line x1="${-rOuter}" y1="0" x2="${rOuter}" y2="0" class="engrave"/>\n`;
    } else if (layerName === 'rete') {
      // Eclíptica
      const ecl = model.getEclipticCircle();
      svg += `    <circle cx="${ecl.xc.toFixed(2)}" cy="${(-ecl.yc).toFixed(2)}" r="${ecl.rProj.toFixed(2)}" class="cut"/>\n`;
      svg += `    <circle r="2" class="cut"/>\n`;

      // Estrellas
      model.getProjectedStars().forEach(s => {
        svg += `    <circle cx="${s.x.toFixed(2)}" cy="${(-s.y).toFixed(2)}" r="1" class="cut"/>\n`;
        svg += `    <text x="${(s.x + 3).toFixed(2)}" y="${(-s.y).toFixed(2)}" class="text">${s.name}</text>\n`;
      });
    }

    svg += `  </g>\n</svg>`;
    return svg;
  }
}
