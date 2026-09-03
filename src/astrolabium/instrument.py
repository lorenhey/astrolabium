import math
from typing import List, Tuple, Literal
from astrolabium.projection import StereographicProjector

class Tympan:
    def __init__(self, latitude: float, projector: StereographicProjector):
        self.latitude = latitude
        self.projector = projector
        # By convention, Meridian is along the y-axis.
        # South is +y (RA=90), North is -y (RA=270).
        self.meridian_ra_south = 90.0
        self.meridian_ra_north = 270.0
        
    def get_equator(self) -> float:
        """Returns radius of the equator."""
        return self.projector.dec_to_radius(0.0)
        
    def get_tropic_of_cancer(self, obliquity: float = 23.439) -> float:
        return self.projector.dec_to_radius(obliquity)
        
    def get_tropic_of_capricorn(self, obliquity: float = 23.439) -> float:
        return self.projector.dec_to_radius(-obliquity)
        
    def get_almucantar(self, altitude: float) -> Tuple[float, float, float]:
        """
        Returns (x_center, y_center, radius) of the almucantar circle for a given altitude.
        """
        # The center of the small circle is the Zenith
        zenith_dec = self.latitude
        zenith_ra = self.meridian_ra_south if self.latitude >= 0 else self.meridian_ra_north
        # Angular radius of the circle on the sphere
        angular_radius = 90.0 - altitude
        
        # We must adjust for Southern hemisphere: if lat < 0, South is still +y?
        # Standard Southern Astrolabe: projection from NCP, center is SCP.
        # Zenith is at dec = lat (negative).
        # Meridian: Zenith is towards the North for observers south of Tropic of Capricorn.
        # Let's keep Zenith RA at +y for now. So Zenith is at +y axis.
        if self.projector.hemisphere == 'south':
            zenith_ra = self.meridian_ra_north if self.latitude < 0 else self.meridian_ra_south

        return self.projector.project_circle(zenith_ra, zenith_dec, angular_radius)
        
    def get_zenith_nadir_projected(self) -> Tuple[Tuple[float, float], Tuple[float, float]]:
        zenith_dec = self.latitude
        zenith_ra = self.meridian_ra_south if (self.latitude >= 0 and self.projector.hemisphere == 'north') or (self.latitude < 0 and self.projector.hemisphere == 'south') else self.meridian_ra_north
        nadir_dec = -self.latitude
        nadir_ra = (zenith_ra + 180.0) % 360.0
        
        # Override Zenith RA logic to ensure standard placement:
        if self.projector.hemisphere == 'north':
            zenith_ra = 90.0
            nadir_ra = 270.0
        else:
            zenith_ra = 270.0 # North is +y? Wait.
            # Let's fix Northern first.
            zenith_ra = 90.0
            nadir_ra = 270.0
            
        z_x, z_y = self.projector.project_equatorial(zenith_ra, zenith_dec)
        n_x, n_y = self.projector.project_equatorial(nadir_ra, nadir_dec)
        return (z_x, z_y), (n_x, n_y)

    def get_azimuth_circle(self, azimuth: float) -> Tuple[float, float, float]:
        """
        Returns (x_center, y_center, radius) of the azimuth circle.
        Azimuth is measured from North (0) towards East (90).
        """
        (z_x, z_y), (n_x, n_y) = self.get_zenith_nadir_projected()
        
        # Centers lie on the perpendicular bisector of Z'N'
        y_c = (z_y + n_y) / 2.0
        
        # The angle of the tangent at Z' with the y-axis is A (azimuth).
        # Wait, Azimuth 0 is North. Zenith is on the South meridian (+y) or North meridian.
        # In a Northern Astrolabe, Zenith is on the South meridian (y-axis).
        # When facing South, East is left (-x).
        # So Azimuth 90 (East) corresponds to a circle that curves to the left.
        A_rad = math.radians(azimuth)
        
        # x_c = (y_Z - y_c) * tan(Azimuth from South)
        # Azimuth from South is A - 180.
        A_from_south = azimuth - 180.0
        A_fs_rad = math.radians(A_from_south)
        
        # But let's use a robust trigonometric approach based on stereographic projection properties:
        # A great circle passing through Z and N has its poles on the horizon.
        # The center of the projected circle is at x_c = (y_z - y_c) * tan(Az_from_meridian)
        
        if self.projector.hemisphere == 'north':
            x_c = (z_y - y_c) * math.tan(A_fs_rad)
        else:
            x_c = (z_y - y_c) * math.tan(math.radians(azimuth)) # Simplified for now
            
        R = math.hypot(x_c, z_y - y_c)
        return x_c, y_c, R

import math
from typing import List, Tuple
from astrolabium.projection import StereographicProjector
from astrolabium.astronomy import ecliptic_to_equatorial

class Star:
    def __init__(self, name: str, ra: float, dec: float, magnitude: float):
        self.name = name
        self.ra = ra
        self.dec = dec
        self.magnitude = magnitude

class Rete:
    def __init__(self, projector: StereographicProjector, obliquity: float = 23.439):
        self.projector = projector
        self.obliquity = obliquity
        self.stars: List[Star] = []
        
    def add_star(self, name: str, ra: float, dec: float, magnitude: float):
        self.stars.append(Star(name, ra, dec, magnitude))
        
    def get_ecliptic_circle(self) -> Tuple[float, float, float]:
        """
        Returns (x_center, y_center, radius) of the projected ecliptic.
        The ecliptic is a great circle (angular_radius = 90).
        Its pole is at RA = 270 (18h), Dec = 90 - obliquity (North Ecliptic Pole)
        or RA = 90 (6h), Dec = obliquity - 90 (South Ecliptic Pole).
        """
        if self.projector.hemisphere == 'north':
            center_ra = 270.0
            center_dec = 90.0 - self.obliquity
        else:
            center_ra = 90.0
            center_dec = self.obliquity - 90.0
            
        return self.projector.project_circle(center_ra, center_dec, 90.0)
        
    def get_projected_stars(self) -> List[Tuple[str, float, float, float]]:
        """
        Returns a list of (name, x, y, magnitude) for all stars.
        """
        projected = []
        for star in self.stars:
            # For a southern astrolabe, stars with dec > equator (up to tropic of cancer) might be included.
            # Rete usually goes up to Tropic of Capricorn (dec=-obliquity) for North,
            # and Tropic of Cancer (dec=obliquity) for South.
            # But the projector will handle the math, we can clip during SVG generation.
            x, y = self.projector.project_equatorial(star.ra, star.dec)
            projected.append((star.name, x, y, star.magnitude))
        return projected
