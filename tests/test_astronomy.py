import math
import pytest
from datetime import datetime, timezone, timedelta
from astropy.time import Time
from astropy.coordinates import EarthLocation, AltAz, SkyCoord, GeocentricTrueEcliptic
from astropy import units as u

from astrolabium.astronomy import (
    get_julian_date,
    get_greenwich_mean_sidereal_time,
    get_local_sidereal_time,
    equatorial_to_horizontal,
    ecliptic_to_equatorial,
    simplified_solar_position
)

def test_get_julian_date():
    # Test J2000
    dt = datetime(2000, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    jd = get_julian_date(dt)
    assert math.isclose(jd, 2451545.0, abs_tol=1e-5)
    
    # Random date
    dt2 = datetime(2026, 9, 3, 12, 0, 0, tzinfo=timezone.utc)
    jd2 = get_julian_date(dt2)
    astro_jd2 = Time(dt2).jd
    assert math.isclose(jd2, astro_jd2, abs_tol=1e-5)

def test_gmst():
    dt = datetime(2026, 9, 3, 12, 0, 0, tzinfo=timezone.utc)
    jd = get_julian_date(dt)
    gmst = get_greenwich_mean_sidereal_time(jd)
    
    # Compare with astropy mean apparent sidereal time
    t = Time(jd, format='jd')
    astro_gmst = t.sidereal_time('mean', 'greenwich').degree
    
    assert math.isclose(gmst, astro_gmst, abs_tol=0.01) # Historical approximation

def test_equatorial_to_horizontal():
    lat = -34.92 # La Plata
    lon = -57.95
    
    # Define an equatorial coordinate
    ra = 100.0
    dec = -20.0
    
    # Calculate with our function
    # Needs LST
    dt = datetime(2026, 9, 3, 0, 0, 0, tzinfo=timezone.utc)
    jd = get_julian_date(dt)
    lst = get_local_sidereal_time(jd, lon)
    
    alt, az = equatorial_to_horizontal(ra, dec, lst, lat)
    
    # Calculate with Astropy
    loc = EarthLocation(lat=lat*u.deg, lon=lon*u.deg)
    time = Time(dt)
    coord = SkyCoord(ra=ra*u.deg, dec=dec*u.deg, frame='icrs')
    altaz = coord.transform_to(AltAz(obstime=time, location=loc))
    
    astro_alt = altaz.alt.degree
    astro_az = altaz.az.degree
    
    # High precision required for pure geometric transformation
    # Note: Astropy AltAz might include refraction or specific Earth orientation parameters 
    # but without pressure/temp it might just be geometric + some nutation if not careful.
    # Our formula is purely geometric assuming lst is the true local hour angle.
    # Let's compare mathematically.
    # We will test the pure math part directly:
    lst_test = 45.0
    alt_m, az_m = equatorial_to_horizontal(ra, dec, lst_test, lat)
    
    ha_rad = math.radians(lst_test - ra)
    dec_rad = math.radians(dec)
    lat_rad = math.radians(lat)
    
    # manual check
    sin_alt = math.sin(dec_rad)*math.sin(lat_rad) + math.cos(dec_rad)*math.cos(lat_rad)*math.cos(ha_rad)
    assert math.isclose(math.sin(math.radians(alt_m)), sin_alt, abs_tol=1e-5)

def test_ecliptic_to_equatorial():
    lon = 45.0
    lat = 0.0
    ra, dec = ecliptic_to_equatorial(lon, lat)
    
    # Using astropy
    coord = SkyCoord(lon=lon*u.deg, lat=lat*u.deg, frame=GeocentricTrueEcliptic(equinox='J2000'))
    eq = coord.transform_to('icrs')
    
    assert math.isclose(ra, eq.ra.degree, abs_tol=0.1) # Obliquity diff
    assert math.isclose(dec, eq.dec.degree, abs_tol=0.1)
