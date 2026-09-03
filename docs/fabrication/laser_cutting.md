# Fabrication: Laser Cutting

ASTROLABIUM is designed to generate files that can be directly used for manufacturing a physical astrolabe. 

## Digital to Physical

The CLI command strolabium build generates a complete suite of SVG files:

1. mater.svg
2. 	ympan.svg
3. ete.svg
4. ule.svg

### Laser Cutting Considerations

1. **Materials**: 
   - **Brass/Copper**: For a traditional feel, you can laser cut acrylic and paint it, or use a fiber laser for direct metal engraving and cutting.
   - **Wood (Plywood/MDF)**: A cheaper and highly accessible material. The rete must be delicate, so high-quality 3mm plywood is recommended.
   - **Acrylic**: Transparent acrylic for the Rete can be a modern twist, allowing the entire Tympan to be visible without needing to cut out vast "empty" spaces.

2. **Line Colors (Standard Convention)**:
   - Make sure to load the SVG in software like Inkscape or Illustrator.
   - Set all cutting paths (outer circles, rete cutouts) to **Red** (0.01mm or hairline stroke).
   - Set all engraving paths (lines, text, scales) to **Black** for raster engraving or **Blue** for vector engraving.

3. **Center Pin**:
   The generated SVGs include a small central circle. Size this hole in your vector software to exactly match the diameter of the brass pin, bolt, or rivet you intend to use for the central axis.

## Tolerances
An astrolabe is an analog computer. Its accuracy depends on:
- The alignment of the central hole.
- The sharpness of the engraving (thinner lines mean more precise readings).
- The friction of the Rete and Rule (it should hold its position but move smoothly).
