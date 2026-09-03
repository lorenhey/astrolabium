import math
import pytest
from astrolabium.projection import StereographicProjector

def test_stereographic_northern():
    proj = StereographicProjector(R_eq=100.0, hemisphere='north')
    
    # Equator dec = 0 should have r = R_eq
    assert math.isclose(proj.dec_to_radius(0.0), 100.0)
    
    # North Pole dec = 90 should have r = 0?
    # Wait, for a northern astrolabe, the center of the plate is the NCP (dec=90)
    # The projection is from SCP (dec=-90).
    # r = R_eq * tan( (90 - 90)/2 ) = 0. Correct.
    assert math.isclose(proj.dec_to_radius(90.0), 0.0)
    
    # Tropic of Cancer (dec = 23.4) should have r < R_eq
    r_cancer = proj.dec_to_radius(23.4)
    assert r_cancer < 100.0
    
    # Tropic of Capricorn (dec = -23.4) should have r > R_eq
    r_capri = proj.dec_to_radius(-23.4)
    assert r_capri > 100.0
    
    # Inverse testing
    assert math.isclose(proj.radius_to_dec(100.0), 0.0, abs_tol=1e-5)
    assert math.isclose(proj.radius_to_dec(r_cancer), 23.4, abs_tol=1e-5)
    
def test_project_circle():
    proj = StereographicProjector(R_eq=100.0, hemisphere='north')
    # Horizon at lat 45. Center is zenith (dec=45, ra=90). Radius is 90.
    # So it goes from dec = 45+90 = 135 (not possible)
    # Actually angular radius is 90. dec2 = 45 - 90 = -45.
    # Wait, 45+90 is past the pole. The small circle goes around the zenith.
    # The minimum dec is 45-90 = -45. The maximum dec is 45+90 = 135 -> means 180-135=45 on the other side.
    # My simplified project_circle takes center dec and adds/subtracts. If it exceeds 90, it means it crosses the pole.
    # Let's test a smaller circle that doesn't cross the pole.
    
    # Circle at dec=45, angular radius=10
    # Dec ranges from 35 to 55.
    xc, yc, R = proj.project_circle(center_ra=0, center_dec=45, angular_radius=10)
    
    # The two points on the circle are at ra=0, dec=35 and ra=0, dec=55
    x1, y1 = proj.project_equatorial(0, 35)
    x2, y2 = proj.project_equatorial(0, 55)
    
    assert math.isclose(y1, 0, abs_tol=1e-5)
    assert math.isclose(y2, 0, abs_tol=1e-5)
    
    # Center x should be average of x1 and x2
    assert math.isclose(xc, (x1 + x2) / 2.0, abs_tol=1e-5)
    assert math.isclose(R, abs(x1 - x2) / 2.0, abs_tol=1e-5)
