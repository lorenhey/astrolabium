import typer
import os
from astrolabium.projection import StereographicProjector
from astrolabium.instrument import Tympan, Rete
from astrolabium.generators import SVGGenerator

app = typer.Typer()

@app.command(name="plate")
def plate(latitude: float = typer.Option(..., help="Latitude of the observer (degrees)"),
          output: str = typer.Option("tympan.svg", help="Output SVG filename"),
          radius: float = typer.Option(100.0, help="Equatorial radius in arbitrary units")):
    hemisphere = 'north' if latitude >= 0 else 'south'
    projector = StereographicProjector(R_eq=radius, hemisphere=hemisphere)
    tympan = Tympan(latitude=latitude, projector=projector)
    generator = SVGGenerator(filename=output, R_eq=radius)
    generator.draw_tympan(tympan)
    typer.echo(f"Generated plate for latitude {latitude} at {output}")

@app.command(name="rete")
def rete(output: str = typer.Option("rete.svg", help="Output SVG filename"),
         radius: float = typer.Option(100.0, help="Equatorial radius in arbitrary units"),
         hemisphere: str = typer.Option("north", help="Hemisphere: north or south")):
    projector = StereographicProjector(R_eq=radius, hemisphere=hemisphere)
    rete_obj = Rete(projector=projector)
    stars = [("Sirius", 101.287, -16.716, -1.46), ("Betelgeuse", 88.793, 7.407, 0.5), ("Rigel", 78.634, -8.201, 0.12), ("Aldebaran", 68.98, 16.509, 0.85), ("Vega", 279.233, 38.783, 0.03), ("Arcturus", 213.915, 19.182, -0.04)]
    for name, ra, dec, mag in stars: rete_obj.add_star(name, ra, dec, mag)
    generator = SVGGenerator(filename=output, R_eq=radius)
    generator.draw_rete(rete_obj)
    typer.echo(f"Generated rete for {hemisphere} hemisphere at {output}")

@app.command(name="build")
def build(latitude: float = typer.Option(..., help="Latitude of the observer (degrees)"),
          output_dir: str = typer.Option("build", help="Output directory"),
          radius: float = typer.Option(100.0, help="Equatorial radius in arbitrary units")):
    if not os.path.exists(output_dir): os.makedirs(output_dir)
    hemisphere = 'north' if latitude >= 0 else 'south'
    projector = StereographicProjector(R_eq=radius, hemisphere=hemisphere)
    
    tympan = Tympan(latitude=latitude, projector=projector)
    gen_t = SVGGenerator(filename=os.path.join(output_dir, "tympan.svg"), R_eq=radius)
    gen_t.draw_tympan(tympan)
    
    rete_obj = Rete(projector=projector)
    stars = [("Sirius", 101.287, -16.716, -1.46), ("Betelgeuse", 88.793, 7.407, 0.5), ("Rigel", 78.634, -8.201, 0.12), ("Aldebaran", 68.98, 16.509, 0.85), ("Vega", 279.233, 38.783, 0.03), ("Arcturus", 213.915, 19.182, -0.04)]
    for name, ra, dec, mag in stars: rete_obj.add_star(name, ra, dec, mag)
    gen_r = SVGGenerator(filename=os.path.join(output_dir, "rete.svg"), R_eq=radius)
    gen_r.draw_rete(rete_obj)
    
    gen_m = SVGGenerator(filename=os.path.join(output_dir, "mater.svg"), R_eq=radius)
    gen_m.draw_mater(tympan)
    
    gen_ru = SVGGenerator(filename=os.path.join(output_dir, "rule.svg"), R_eq=radius)
    gen_ru.draw_rule(radius, projector)
    
    typer.echo(f"Built complete astrolabe for latitude {latitude} in {output_dir}/")

@app.command(name="simulate")
def simulate():
    typer.echo("Simulation not yet implemented.")

if __name__ == "__main__":
    app()
