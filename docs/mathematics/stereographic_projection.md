# Stereographic Projection

The fundamental magic of the planispheric astrolabe lies in stereographic projection. 

## The Projection Concept

Stereographic projection maps a sphere onto a plane. For a standard **Northern Astrolabe**, the projection point is the South Celestial Pole (SCP, $\delta = -90^\circ$), and the projection plane is parallel to the celestial equator. 

Given a star with Right Ascension $\alpha$ and Declination $\delta$, its distance $ from the center of the astrolabe (the projected North Celestial Pole) is given by:

 R(\delta) = R_{eq} \tan\left(\frac{90^\circ - \delta}{2}\right) 

where {eq}$ is the arbitrary radius of the celestial equator on the instrument.

For a **Southern Astrolabe** (e.g., for La Plata, latitude -34.92°), the projection point is the North Celestial Pole (NCP), and the center of the instrument becomes the SCP. The radius function becomes:

 R(\delta) = R_{eq} \tan\left(\frac{90^\circ + \delta}{2}\right) 

## Conformal Property (Angle Preservation)

Stereographic projection is conformal. The angle between two intersecting curves on the celestial sphere is preserved in the projection. This means azimuth angles and hour angles can be read directly off the rim of the astrolabe without distortion.

## Circle Preservation

Perhaps the most important property for the physical construction of an astrolabe is that **circles on the sphere project to circles on the plane** (unless they pass through the projection pole, in which case they project to straight lines).

Because of this property, we do not need to plot points continuously to draw the Tropic of Cancer, the Ecliptic, or the local horizon. We only need to find their projected centers and radii, and we can draw them using a simple compass (or an SVG <circle> tag).

### Almucantars (Circles of Constant Altitude)
An almucantar for altitude $ is a small circle on the celestial sphere centered at the Zenith, with an angular radius of ^\circ - h$. In ASTROLABIUM, we compute the intersection of this circle with the local meridian, find the projected $-coordinates of these intersections, and easily derive the center and radius of the resulting projected circle.

### Azimuth Circles
Azimuth lines are great circles passing through the Zenith and Nadir. Because they pass through the projection pole only if the observer is at the equator, they generally project as arcs of circles. The centers of all azimuth circles lie on a single straight line: the perpendicular bisector of the line segment connecting the projected Zenith and Nadir.
