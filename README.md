# ASTROLABIUM

> An astrolabe compresses a surprising amount of astronomy into two rotating pieces of metal.

Before clocks became cheap and telescopes existed at all, somebody discovered that a stereographic projection of the sky could be turned into a machine. **ASTROLABIUM** is an open-source project that reconstructs the planispheric astrolabe from its geometric and astronomical first principles. 

It is simultaneously:
- A mathematically correct planispheric astrolabe generator.
- An astronomical library and simulator.
- A physical instrument builder (SVG/PDF output).
- An exploration of the history of practical astronomy.

## Features

- **Astronomical Core**: Implements Julian dates, sidereal time, equatorial, horizontal, and ecliptic coordinates.
- **Scientific Validation**: Math is rigorously cross-validated against modern astronomical reference libraries (Astropy).
- **Stereographic Projection Engine**: Derives the instrument's geometry purely from projection mathematics, not manual drawing.
- **Parametric Generation**: Generate a Tympan (plate) for any latitude, including robust support for the Southern Hemisphere.
- **Rete Generation**: Calculates the ecliptic and projects verified star catalogs (accounting for precession/epochs).
- **CLI & Python API**: Easy-to-use commands for building SVGs.
- **Web Simulator**: A clean, interactive web interface to explore the instrument.

## Architecture

Astrolabium separates the **Historical Model** (how the instrument traditionally calculates and approximates) from the **Modern Reference** (how modern astronomy calculates it), allowing for direct comparison and error analysis.

- strolabium.astronomy: Core coordinate transformations and time calculations.
- strolabium.projection: Stereographic projection mapping the celestial sphere to a 2D plane.
- strolabium.instrument: Mathematical definitions of the Tympan, Rete, Mater, and Rule.
- strolabium.generators: SVG generation for physical fabrication.

## Installation

\\\ash
git clone https://github.com/lorenhey/astrolabium.git
cd astrolabium
python -m venv venv
source venv/bin/activate  # Or .\venv\Scripts\Activate.ps1 on Windows
pip install -e .
\\\

## Usage

### Command Line Interface

Generate a tympan (plate) for a specific latitude (e.g., La Plata, Argentina):
\\\ash
astrolabium plate --latitude -34.92 --output laplata_tympan.svg
\\\

Generate a rete for the northern hemisphere:
\\\ash
astrolabium rete --hemisphere north --output northern_rete.svg
\\\

Build a complete physical astrolabe (all pieces):
\\\ash
astrolabium build --latitude 51.48 --output-dir build/greenwich/
\\\

## Historical and Mathematical Documentation

Please refer to the docs/ directory for in-depth explorations:
- docs/mathematics/stereographic_projection.md: Why circles project to circles.
- docs/astrolabe/anatomy.md: The components of the astrolabe.
- docs/fabrication/laser_cutting.md: How to take the SVG outputs and build a physical instrument.

## License

Code is licensed under the MIT License. Documentation is licensed under CC BY 4.0.
