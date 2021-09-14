import svgwrite
import math
from astrolabium.instrument import Tympan
from astrolabium.projection import StereographicProjector

class SVGGenerator:
    def __init__(self, filename: str, R_eq: float):
        self.filename = filename
        self.R_eq = R_eq
        self.viewbox_size = self.R_eq * 4 # Room for Capricorn and labels
        self.dwg = svgwrite.Drawing(filename, size=('100%', '100%'), viewBox=f"{-self.viewbox_size/2} {-self.viewbox_size/2} {self.viewbox_size} {self.viewbox_size}")
        self.dwg.add_stylesheet('style.css', title='astrolabium')
        
    def draw_tympan(self, tympan: Tympan, step_almucantars: int = 5, step_azimuths: int = 10):
        group = self.dwg.g(id="tympan")
        
        R_cap = tympan.get_tropic_of_capricorn()
        
        # Outer boundary (Tropic of Capricorn)
        group.add(self.dwg.circle(center=(0, 0), r=R_cap, fill='white', stroke='black', stroke_width=2))
        
        # Equator
        group.add(self.dwg.circle(center=(0, 0), r=tympan.get_equator(), fill='none', stroke='black', stroke_width=1, stroke_dasharray="5,5"))
        
        # Tropic of Cancer
        group.add(self.dwg.circle(center=(0, 0), r=tympan.get_tropic_of_cancer(), fill='none', stroke='black', stroke_width=1, stroke_dasharray="2,2"))
        
        # Meridian
        group.add(self.dwg.line(start=(0, -R_cap), end=(0, R_cap), stroke='black', stroke_width=1))
        # Horizon Line (East-West) Note: Not the celestial horizon, just the geometric horizontal line
        group.add(self.dwg.line(start=(-R_cap, 0), end=(R_cap, 0), stroke='black', stroke_width=1))
        
        # Draw Almucantars
        for alt in range(0, 90, step_almucantars):
            try:
                cx, cy, r = tympan.get_almucantar(alt)
                # Since Almucantars can go outside the Tropic of Capricorn, we might want to clip them.
                # Standard astrolabes only draw the portion inside Capricorn.
                # svgwrite allows clipping paths.
                clip_path = self.dwg.clipPath(id='capricorn_clip')
                clip_path.add(self.dwg.circle(center=(0, 0), r=R_cap))
                self.dwg.defs.add(clip_path)
                
                stroke_width = 1.5 if alt == 0 else 0.5
                group.add(self.dwg.circle(center=(cx, cy), r=r, fill='none', stroke='gray', stroke_width=stroke_width, clip_path="url(#capricorn_clip)"))
            except ValueError:
                pass # Skip if it passes through projection pole (though typically not for sensible latitudes)

        # Draw Azimuths
        for az in range(0, 360, step_azimuths):
            if az == 0 or az == 180:
                continue # Meridian is already drawn, though it's technically infinite r
            try:
                cx, cy, r = tympan.get_azimuth_circle(az)
                group.add(self.dwg.circle(center=(cx, cy), r=r, fill='none', stroke='lightgray', stroke_width=0.5, clip_path="url(#capricorn_clip)"))
            except Exception as e:
                pass
                
        self.dwg.add(group)
        self.dwg.save()


    def draw_rete(self, rete):
        group = self.dwg.g(id="rete")
        
        # Ecliptic
        try:
            cx, cy, r = rete.get_ecliptic_circle()
            group.add(self.dwg.circle(center=(cx, cy), r=r, fill='none', stroke='black', stroke_width=2))
            
            # Add some zodiac markings (every 30 degrees of ecliptic longitude)
            from astrolabium.astronomy import ecliptic_to_equatorial
            for lon in range(0, 360, 30):
                ra, dec = ecliptic_to_equatorial(lon, 0, rete.obliquity)
                x, y = rete.projector.project_equatorial(ra, dec)
                group.add(self.dwg.circle(center=(x, y), r=2, fill='black'))
                # group.add(self.dwg.text(str(lon), insert=(x+3, y+3), font_size="10px", fill="black"))
                
        except ValueError:
            pass

        # Stars
        for name, x, y, mag in rete.get_projected_stars():
            # Scale star radius based on magnitude
            r = max(0.5, 3.0 - mag / 2.0)
            group.add(self.dwg.circle(center=(x, y), r=r, fill='black'))
            group.add(self.dwg.text(name, insert=(x+4, y+4), font_size="8px", fill="black"))
            
        self.dwg.add(group)
        self.dwg.save()

    def draw_mater(self, tympan: Tympan):
        group = self.dwg.g(id="mater")
        
        # Outer boundary of the astrolabe
        R_cap = tympan.get_tropic_of_capricorn()
        R_outer = R_cap * 1.15 # Rim width
        
        group.add(self.dwg.circle(center=(0, 0), r=R_outer, fill='white', stroke='black', stroke_width=2))
        group.add(self.dwg.circle(center=(0, 0), r=R_cap, fill='none', stroke='black', stroke_width=2))
        
        # Degree scale (360 degrees)
        for deg in range(0, 360):
            angle = math.radians(deg - 90) # Start at top
            r1 = R_cap
            r2 = R_cap + (R_outer - R_cap) * 0.2 if deg % 5 != 0 else R_cap + (R_outer - R_cap) * 0.4
            if deg % 10 == 0:
                r2 = R_cap + (R_outer - R_cap) * 0.6
                x_text = (R_cap + (R_outer - R_cap) * 0.8) * math.cos(angle)
                y_text = (R_cap + (R_outer - R_cap) * 0.8) * math.sin(angle)
                # Rotate text so it's readable along the rim
                # angle_deg = deg if deg <= 180 else deg - 180
                group.add(self.dwg.text(str(deg), insert=(x_text-5, y_text+3), font_size="8px", fill="black"))
                
            x1 = r1 * math.cos(angle)
            y1 = r1 * math.sin(angle)
            x2 = r2 * math.cos(angle)
            y2 = r2 * math.sin(angle)
            group.add(self.dwg.line(start=(x1, y1), end=(x2, y2), stroke='black', stroke_width=0.5))
            
        self.dwg.add(group)
        self.dwg.save()

    def draw_rule(self, R_eq: float, projector: StereographicProjector):
        group = self.dwg.g(id="rule")
        R_cap = projector.dec_to_radius(-23.439) if projector.hemisphere == 'north' else projector.dec_to_radius(23.439)
        if R_cap < 0: R_cap = abs(R_cap)
        # The rule spans the diameter
        group.add(self.dwg.rect(insert=(-R_cap, -2), size=(2*R_cap, 4), fill='white', stroke='black', stroke_width=1))
        group.add(self.dwg.circle(center=(0, 0), r=4, fill='white', stroke='black', stroke_width=1)) # Center hole
        
        # Declination scale along one edge
        for dec in range(-20, 90, 10):
            try:
                r = projector.dec_to_radius(dec)
                if r <= R_cap:
                    group.add(self.dwg.line(start=(r, -2), end=(r, 0), stroke='black', stroke_width=0.5))
                    group.add(self.dwg.line(start=(-r, -2), end=(-r, 0), stroke='black', stroke_width=0.5))
            except:
                pass
                
        self.dwg.add(group)
        self.dwg.save()
