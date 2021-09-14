import math
from datetime import datetime, timezone
from typing import Tuple

# Standard epoch J2000.0
J2000 = 2451545.0

# Obliquity of the ecliptic at J2000 (approx 23.4392911 degrees)
OBLIQUITY_J2000 = 23.4392911

def get_julian_date(dt: datetime) -> float:
    """
    Convert datetime to Julian Date.
    """
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    
    # JD formula
    y = dt.year
    m = dt.month
    d = dt.day + dt.hour / 24.0 + dt.minute / 1440.0 + dt.second / 86400.0
    
    if m <= 2:
        y -= 1
        m += 12
        
    A = math.floor(y / 100)
    B = 2 - A + math.floor(A / 4)
    
    JD = math.floor(365.25 * (y + 4716)) + math.floor(30.6001 * (m + 1)) + d + B - 1524.5
    return JD

def get_greenwich_mean_sidereal_time(jd: float) -> float:
    """
    Calculate Greenwich Mean Sidereal Time (GMST) in degrees for a given Julian Date.
    """
    T = (jd - 2451545.0) / 36525.0
    # GMST in degrees
    theta = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T**2 - (T**3) / 38710000.0
    return theta % 360.0

def get_local_sidereal_time(jd: float, longitude: float) -> float:
    """
    Calculate Local Sidereal Time (LST) in degrees.
    Longitude is positive East.
    """
    gmst = get_greenwich_mean_sidereal_time(jd)
    lst = (gmst + longitude) % 360.0
    return lst

def equatorial_to_horizontal(ra: float, dec: float, lst: float, lat: float) -> Tuple[float, float]:
    """
    Convert equatorial coordinates to horizontal coordinates.
    All inputs and outputs in degrees.
    ra: Right Ascension
    dec: Declination
    lst: Local Sidereal Time
    lat: Latitude of observer
    
    Returns (altitude, azimuth) in degrees. Azimuth is measured East from North (0-360).
    """
    # Hour angle
    ha = (lst - ra) % 360.0
    
    # Convert to radians
    ha_rad = math.radians(ha)
    dec_rad = math.radians(dec)
    lat_rad = math.radians(lat)
    
    sin_alt = math.sin(dec_rad) * math.sin(lat_rad) + math.cos(dec_rad) * math.cos(lat_rad) * math.cos(ha_rad)
    alt_rad = math.asin(sin_alt)
    
    cos_az_times_cos_alt = math.sin(dec_rad) * math.cos(lat_rad) - math.cos(dec_rad) * math.sin(lat_rad) * math.cos(ha_rad)
    sin_az_times_cos_alt = -math.cos(dec_rad) * math.sin(ha_rad)
    
    az_rad = math.atan2(sin_az_times_cos_alt, cos_az_times_cos_alt)
    
    alt = math.degrees(alt_rad)
    az = math.degrees(az_rad) % 360.0
    
    return alt, az

def ecliptic_to_equatorial(lon: float, lat: float = 0.0, obliquity: float = OBLIQUITY_J2000) -> Tuple[float, float]:
    """
    Convert ecliptic coordinates to equatorial coordinates.
    All inputs and outputs in degrees.
    lon: Ecliptic Longitude
    lat: Ecliptic Latitude
    obliquity: Obliquity of the ecliptic
    
    Returns (ra, dec) in degrees.
    """
    lon_rad = math.radians(lon)
    lat_rad = math.radians(lat)
    obl_rad = math.radians(obliquity)
    
    sin_dec = math.sin(lat_rad) * math.cos(obl_rad) + math.cos(lat_rad) * math.sin(obl_rad) * math.sin(lon_rad)
    dec_rad = math.asin(sin_dec)
    
    y = math.sin(lon_rad) * math.cos(obl_rad) - math.tan(lat_rad) * math.sin(obl_rad)
    x = math.cos(lon_rad)
    ra_rad = math.atan2(y, x)
    
    ra = math.degrees(ra_rad) % 360.0
    dec = math.degrees(dec_rad)
    
    return ra, dec

def simplified_solar_position(jd: float) -> float:
    """
    Calculate the simplified apparent ecliptic longitude of the Sun for a given Julian Date.
    This is suitable for historical astrolabe models (which are inherently approximate).
    Returns longitude in degrees (0-360).
    """
    n = jd - 2451545.0
    # Mean longitude of the Sun
    L = (280.460 + 0.9856474 * n) % 360.0
    # Mean anomaly of the Sun
    g = math.radians((357.528 + 0.9856003 * n) % 360.0)
    # Ecliptic longitude
    lam = L + 1.915 * math.sin(g) + 0.020 * math.sin(2 * g)
    return lam % 360.0
