# ASTROLABIUM

> **Astronomía de Posición, Geometría y el Astrolabio Planisférico Reconstruido en Software.**
> 
> *Un instrumento analógico milenario que comprime la bóveda celeste en dos discos de latón.*

[![GitHub Pages](https://img.shields.io/badge/Demo%20En%20Vivo-GitHub%20Pages-d4af37?style=for-the-badge&logo=github)](https://lorenhey.github.io/astrolabium/)
[![Python](https://img.shields.io/badge/Python-3.12-blue?style=flat-square&logo=python)](https://python.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

---

## 🌐 Simulador Web Interactivo (Zero-Backend)

Probá el astrolabio directamente en tu navegador sin instalar dependencias:

👉 **[https://lorenhey.github.io/astrolabium/](https://lorenhey.github.io/astrolabium/)**

- **Simulación a 60 FPS:** Arrastrá libremente la Araña (*Rete*), la Regla delantera (*Rule*) y la Alhidada trasera con el mouse o pantalla táctil.
- **Doble Cara (Anverso y Reverso):** Alterná entre el frente (Tímpano de latitud, Eclíptica y Estrellas) y el dorso (Cuadrado de Sombras para agrimensura y calendario zodiacal).
- **Astrolabio Septentrional y Austral:** Soporte matemático riguroso para latitudes de ambos hemisferios (proyección desde el Polo Sur o Polo Norte Celeste).
- **Efemérides en Tiempo Real:** Cálculo instantáneo de Día Juliano (JD), Tiempo Sideral Local (LST), posición aparente del Sol y coordenadas horizontales (altitud y acimut) de las estrellas visibles.
- **Exportación Paramétrica para Corte Láser (SVG):** Generación de archivos vectoriales listos para CNC en madera, acrílico o latón.

---

## 🧭 ¿Qué es un Astrolabio Planisférico?

Antes de los relojes de péndulo y los telescopios, el astrolabio era la computadora astronómica de mano definitiva. Se basa en la **proyección estereográfica conforme** de la esfera celeste sobre el plano del ecuador:

$$R(\delta) = R_{\text{eq}} \tan\left(\frac{90^\circ \mp \delta}{2}\right)$$

### Propiedades Matemáticas Clave
1. **Preservación de Ángulos (Conformalidad):** Los acimutes y meridianos se cortan ortogonalmente sin distorsión angular.
2. **Preservación Circular:** Cualquier círculo sobre la esfera celeste proyecta como un círculo exacto en el plano, permitiendo trazar almucantarates y la eclíptica con compás o código vectorial puro.

---

## 📦 Biblioteca y CLI de Python (`astrolabium`)

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/lorenhey/astrolabium.git
cd astrolabium

# Crear entorno virtual e instalar con dependencias científicas
uv venv
source .venv/bin/activate  # En Windows: .venv\Scripts\Activate.ps1
uv pip install -e ".[dev]"
```

### Generación por Línea de Comandos

```bash
# Generar tímpano para La Plata / Buenos Aires (-34.92°)
astrolabium plate --latitude -34.92 --output tympan_laplata.svg

# Generar araña austral con catálogo estelar
astrolabium rete --hemisphere south --output rete_austral.svg

# Construir el astrolabio físico completo (Madre, Tímpano, Araña y Regla)
astrolabium build --latitude -34.92 --output-dir ./build/laplata/
```

### Validación de Precisión

Los algoritmos de `astrolabium` están validados contra la biblioteca de referencia astrofísica **Astropy** (error interno en GMST $< 0.00001^\circ$):

```bash
pytest
python scripts/validate.py
```

---

## 📚 Documentación Técnica e Histórica

- [`docs/mathematics/stereographic_projection.md`](docs/mathematics/stereographic_projection.md): Demostración analítica de la proyección.
- [`docs/astrolabe/anatomy.md`](docs/astrolabe/anatomy.md): Componentes físicos del instrumento.
- [`docs/fabrication/laser_cutting.md`](docs/fabrication/laser_cutting.md): Guía de corte láser y ensamblaje.
- [`examples/precision_experiment.md`](examples/precision_experiment.md): Análisis de precisión instrumental vs digital.

---

## 📄 Licencia

Código bajo licencia MIT. Documentación bajo CC BY 4.0.
