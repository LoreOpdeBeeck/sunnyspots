# Sunnyspots ☀

Sunny cafés and coffee bars in Antwerp: a map with live building shadows, an hour slider, today's cloud forecast, opening hours, terraces, and a "best pick" near you.

**Live app:** https://loreopdebeeck.github.io/sunnyspots/

## How it works
- `index.html` is the whole app. It runs entirely in the browser.
  - **Map and buildings:** OpenFreeMap vector tiles (OpenStreetMap data). Shadows are drawn on the graphics card from each building's footprint and height.
  - **Sun position:** calculated in the browser for Antwerp.
  - **Clouds:** hourly forecast from Open-Meteo.
- `antwerp-cafes.json` is the list of cafés and coffee bars, with opening hours and terrace info. It's created by `update-cafes.mjs` from OpenStreetMap.
- `.github/workflows/deploy.yml` refreshes that list every morning and publishes the site to GitHub Pages. It also runs on every push to `main`, and you can start it by hand from the **Actions** tab ("Run workflow").

## Run it on your own computer
```
node update-cafes.mjs          # creates antwerp-cafes.json (Node.js 18+)
python3 -m http.server 8000    # then open http://localhost:8000
```

## Credits and licences
- Map and café data © OpenStreetMap contributors (ODbL). Map tiles by OpenFreeMap / OpenMapTiles.
- Weather data by Open-Meteo.com (CC BY 4.0). The free Open-Meteo service is for **non-commercial** use. A commercial website needs a paid plan: https://open-meteo.com/en/pricing
