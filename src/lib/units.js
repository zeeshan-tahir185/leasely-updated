import { bedsForType } from "./constants";

export const BULK_DEFAULTS = { floors: "1", perFloor: "4", startFloor: "1", unitType: "1BHK", baths: "1", sqft: "800", annualRent: "90000" };

// Generate a batch of units for a tower: `floors` × `perFloor`, numbered
// floor-first (floor 1 → 101, 102 … ; floor 12 → 1204), all sharing the given
// defaults (each can be edited individually afterwards). Bedroom count is
// implied by the unit type (1BHK → 1, Studio/Office → 0, …).
export function buildUnits({ floors, perFloor, startFloor, unitType, baths, sqft, annualRent }) {
  const F = Math.max(1, Number(floors) || 1);
  const P = Math.max(1, Number(perFloor) || 1);
  const S = Number(startFloor) || 1;
  const type = unitType || "1BHK";
  const out = [];
  for (let f = S; f < S + F; f++) {
    for (let i = 1; i <= P; i++) {
      out.push({
        label: `${f}${String(i).padStart(2, "0")}`,
        unitType: type,
        floor: f,
        beds: bedsForType(type),
        baths: Number(baths) || 1,
        sqft: Number(sqft) || 0,
        annualRent: Number(annualRent) || 0,
      });
    }
  }
  return out;
}
