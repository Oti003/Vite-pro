import { counties as rawCounties, subCounties as rawSubCounties, wards as rawWards } from "osm-kenya-boundaries"

export const counties = rawCounties;

export const subCounties = rawSubCounties.map(s => 
  s.name === "Lang" ? { ...s, name: "Langata" } : s
);

export const wards = rawWards.map(w => {
  let name = w.name === "Lang" ? "Langata" : w.name;
  let constituency = w.constituency === "Lang" ? "Langata" : w.constituency;
  return { ...w, name, constituency };
});
