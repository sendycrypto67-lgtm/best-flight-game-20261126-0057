// config.js — tuning numbers and colours for Merapi Dawn Run, in one place.
export const CFG = {
  W: 1280, H: 720,
  horizonY: 300,
  // flight model
  cruiseSpeed: 110, minSpeed: 70, maxSpeed: 190,
  climbRate: 170, // ft per second at full pitch
  turnRate: 26, // deg per second at full bank
  lateralRate: 0.55, // corridor units per second at full bank
  throttleAccel: 26, // kt per second
  drag: 0.35,
  fuelMax: 100,
  fuelBurn: 1.1, // per second at cruise throttle, scaled by throttle
  boostBurn: 1.6,
  damageCloud: 18,
  // scoring
  ringBase: 250, ringCenterBonus: 250,
  landingBonus: 500, legTimeBonus: 300,
  // legs: length in nautical-ish units; speed kt -> units per second
  speedToUnits: 0.045,
  legs: [
    {
      name: 'LEG 1 — TERRACE VALLEY',
      sub: 'Yogyakarta strip to the foothills',
      palette: 'terraces',
      length: 260,
      rings: 5,
      terrainBase: 900, terrainAmp: 700,
      volcano: false,
    },
    {
      name: 'LEG 2 — MERAPI PASS',
      sub: 'Thread the rings around the smoking volcano',
      palette: 'volcano',
      length: 300,
      rings: 6,
      terrainBase: 1600, terrainAmp: 2600,
      volcano: true,
    },
    {
      name: 'LEG 3 — ISLAND STRIP',
      sub: 'Cross the strait and put her down on the island',
      palette: 'islands',
      length: 280,
      rings: 5,
      terrainBase: 200, terrainAmp: 260,
      volcano: false,
    },
  ],
  colours: {
    skyTop: '#2b1150', skyMid: '#7a2d6d', skyLow: '#ff7e3d', horizon: '#ffb36b',
    sun: '#ffd97a', sunGlow: 'rgba(255,180,90,0.55)',
    farRidge: '#4a2358', nearRidge: '#33183f',
    terraceA: '#3f7a3a', terraceB: '#6da344', terraceC: '#2c5a2e',
    sea: '#1d5f7a', seaDeep: '#123f57', sand: '#d9b77c',
    volcanoRock: '#3a2430', volcanoSnow: '#e8d9c8', ash: '#6b5a52',
    runway: '#3c3c46', runwayLine: '#f2e6b8',
    hudPanel: 'rgba(10,14,24,0.78)', hudLine: '#8ef0c0', hudAmber: '#ffc857',
    hudText: '#eaf6ff', hudDim: '#9fb8c8', hudRed: '#ff5a4e', hudGreen: '#7dff9a',
    ring: '#ffc857', ringPass: '#7dff9a', planeBody: '#e8e2d2', planeRed: '#c8352c',
  },
};
