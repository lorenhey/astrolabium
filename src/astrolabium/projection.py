import math
from typing import Tuple, Literal

class StereographicProjector:
    """
    Handles the stereographic projection from the celestial sphere to the astrolabe plane.
    
    A standard planispheric astrolabe uses stereographic projection from one of the poles.
    - Northern Astrolabe: Projects from the South Celestial Pole (SCP) onto the plane of the equator.
    - Southern Astrolabe: Projects from the North Celestial Pole (NCP) onto the plane of the equator.
    """
    
    def __init__(self, R_eq: float, hemisphere: Literal['north', 'south'] = 'north'):
        self.R_eq = R_eq
        self.hemisphere = hemisphere
        
    def dec_to_radius(self, dec: float) -> float:
        """
        Convert declination to radial distance on the projection plane.
        """
        dec_rad = math.radians(dec)
        if self.hemisphere == 'north':
            # Projection from SCP. dec = +90 is r=0, dec = 0 is r=R_eq, dec = -90 is r=inf
            # r = R_eq * tan( (90 - dec) / 2 )
            return self.R_eq * math.tan(math.pi/4 - dec_rad/2)
        else:
            # Projection from NCP. dec = -90 is r=0, dec = 0 is r=R_eq, dec = +90 is r=inf
            # r = R_eq * tan( (90 + dec) / 2 )
            return self.R_eq * math.tan(math.pi/4 + dec_rad/2)

    def radius_to_dec(self, r: float) -> float:
        """
        Convert radial distance back to declination.
        """
        if self.hemisphere == 'north':
            dec_rad = math.pi/2 - 2 * math.atan(r / self.R_eq)
        else:
            dec_rad = 2 * math.atan(r / self.R_eq) - math.pi/2
        return math.degrees(dec_rad)

    def project_equatorial(self, ra: float, dec: float) -> Tuple[float, float]:
        """
        Project (RA, Dec) to cartesian (x, y).
        For an astrolabe, looking at the face:
        Usually, Right Ascension increases counter-clockwise (since stars move East to West,
        and the rete rotates clockwise to simulate diurnal motion).
        RA = 0 is traditionally at the top or bottom depending on convention.
        Let's place RA = 0 along the positive x-axis, increasing counter-clockwise.
        """
        r = self.dec_to_radius(dec)
        ra_rad = math.radians(ra)
        
        # On a northern astrolabe, viewed from above the NCP, RA increases counter-clockwise.
        # So x = r * cos(ra), y = r * sin(ra)
        # However, many historical astrolabes have the First Point of Aries (RA=0)
        # on the right or top. We will use standard mathematical polar coordinates.
        
        # NOTE: For a Southern astrolabe, viewed from above the SCP, if we want East to be
        # consistent, RA would increase CLOCKWISE.
        # Let's keep it simple: the network (rete) is just a projection.
        if self.hemisphere == 'north':
            x = r * math.cos(ra_rad)
            y = r * math.sin(ra_rad)
        else:
            # In south hemisphere, to keep the East-West motion correct when looking at the plate,
            # we need to invert the angle.
            x = r * math.cos(-ra_rad)
            y = r * math.sin(-ra_rad)
            
        return x, y

    def unproject_equatorial(self, x: float, y: float) -> Tuple[float, float]:
        r = math.hypot(x, y)
        dec = self.radius_to_dec(r)
        theta = math.atan2(y, x)
        
        if self.hemisphere == 'north':
            ra = math.degrees(theta) % 360.0
        else:
            ra = math.degrees(-theta) % 360.0
            
        return ra, dec
        
    def project_circle(self, center_ra: float, center_dec: float, angular_radius: float) -> Tuple[float, float, float]:
        """
        A fundamental property of stereographic projection is that circles on the sphere
        project to circles on the plane (unless they pass through the projection pole, 
        in which case they project to lines).
        
        This method calculates the center (x, y) and radius R of a projected circle.
        """
        # The easiest way to find the projected circle is to find the two points
        # on the circle that lie on the meridian passing through the circle's center.
        # These two points will define the diameter of the projected circle.
        
        dec1 = center_dec + angular_radius
        dec2 = center_dec - angular_radius
        
        # Careful if the circle encompasses the projection pole.
        # For northern astrolabe, pole is dec = -90.
        if self.hemisphere == 'north' and dec2 <= -90:
            raise ValueError("Circle passes through or encloses the projection pole (SCP). Projects to line or outside.")
        if self.hemisphere == 'south' and dec1 >= 90:
            raise ValueError("Circle passes through or encloses the projection pole (NCP). Projects to line or outside.")
            
        r1 = self.dec_to_radius(dec1)
        r2 = self.dec_to_radius(dec2)
        
        # The projected center is halfway between r1 and r2 along the same RA line
        # Wait, the center of the projected circle is NOT the projection of the center of the circle!
        # It is shifted.
        
        # Along the RA line:
        R_proj = abs(r2 - r1) / 2.0
        # The distance from the origin to the center of the projected circle:
        r_center = (r1 + r2) / 2.0
        
        ra_rad = math.radians(center_ra)
        if self.hemisphere == 'south':
            ra_rad = -ra_rad
            
        x_center = r_center * math.cos(ra_rad)
        y_center = r_center * math.sin(ra_rad)
        
        return x_center, y_center, R_proj
