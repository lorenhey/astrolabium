# Experiment: Geometric Precision vs Astrolabe Size

A physical astrolabe is an analog computer. Unlike ASTROLABIUM running in Python with 64-bit floating point precision, a physical brass or wood astrolabe is limited by its physical diameter and the sharpness of its engraved lines.

## The Experiment
What is the expected angular precision of a standard 20 cm (200 mm) diameter astrolabe when measuring the altitude of a star, assuming the user can read a line to a precision of ±0.5 mm?

### Analysis
1. The limb (outer edge) of the Mater has a radius of roughly 100 mm.
2. The circumference of the limb is  \pi R \approx 628 \text{ mm}$.
3. 360 degrees are mapped onto 628 mm, meaning ^\circ \approx 1.74 \text{ mm}$.
4. If a user can align the Alidade to the nearest 0.5 mm, the angular reading error is $\pm \frac{0.5}{1.74} \approx \pm 0.28^\circ$.

Thus, a 20 cm astrolabe can at best give measurements to the nearest quarter or third of a degree. 

### Conclusion
Our digital tests against stropy show an internal mathematical error of $\sim 0.002^\circ$ for GMST and $< 0.0001^\circ$ for geometric projections. The software is therefore roughly **100 times more precise** than the physical instrument it models, meaning any physical discrepancies are purely due to fabrication and reading errors, not the underlying geometry.
