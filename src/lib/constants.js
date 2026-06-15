// Shared property/unit vocabulary, used by the add-property, import, and
// unit-edit flows.
export const PROJECT_TYPES = ["Building", "House"];
export const UNIT_TYPES = ["Studio", "1BHK", "2BHK", "3BHK", "4BHK", "Office", "Retail Shop"];

const UNIT_BEDS = { Studio: 0, "1BHK": 1, "2BHK": 2, "3BHK": 3, "4BHK": 4, Office: 0, "Retail Shop": 0 };
export const bedsForType = (t) => (t in UNIT_BEDS ? UNIT_BEDS[t] : 1);
