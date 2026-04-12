import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

// ==========================================
// VENUES (16 stadiums)
// ==========================================
const venues = [
  // USA (11)
  { name: "MetLife Stadium", city: "New York/New Jersey", country: "USA" },
  { name: "AT&T Stadium", city: "Dallas", country: "USA" },
  { name: "SoFi Stadium", city: "Los Angeles", country: "USA" },
  { name: "NRG Stadium", city: "Houston", country: "USA" },
  { name: "Mercedes-Benz Stadium", city: "Atlanta", country: "USA" },
  { name: "Lincoln Financial Field", city: "Philadelphia", country: "USA" },
  { name: "Hard Rock Stadium", city: "Miami", country: "USA" },
  { name: "Lumen Field", city: "Seattle", country: "USA" },
  { name: "Levi's Stadium", city: "San Francisco", country: "USA" },
  { name: "Gillette Stadium", city: "Boston", country: "USA" },
  {
    name: "GEHA Field at Arrowhead Stadium",
    city: "Kansas City",
    country: "USA",
  },
  // Mexico (3)
  { name: "Estadio Azteca", city: "Mexico City", country: "Mexico" },
  { name: "Estadio Akron", city: "Guadalajara", country: "Mexico" },
  { name: "Estadio BBVA", city: "Monterrey", country: "Mexico" },
  // Canada (2)
  { name: "BMO Field", city: "Toronto", country: "Canada" },
  { name: "BC Place", city: "Vancouver", country: "Canada" },
];

// ==========================================
// GROUPS (A-L)
// ==========================================
const groups = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
];

// ==========================================
// TEAMS (48 teams) - grouped by their World Cup group
// flag uses country code emoji pattern
// ==========================================
interface TeamData {
  name: string;
  code: string;
  flag: string;
  group: string;
}

const teams: TeamData[] = [
  // Group A
  { name: "Mexico", code: "MEX", flag: "🇲🇽", group: "A" },
  { name: "South Africa", code: "RSA", flag: "🇿🇦", group: "A" },
  { name: "Korea Republic", code: "KOR", flag: "🇰🇷", group: "A" },
  { name: "UEFA Playoff D", code: "PLD", flag: "🏳️", group: "A" },
  // Group B
  { name: "Canada", code: "CAN", flag: "🇨🇦", group: "B" },
  { name: "UEFA Playoff A", code: "PLA", flag: "🏳️", group: "B" },
  { name: "Qatar", code: "QAT", flag: "🇶🇦", group: "B" },
  { name: "Switzerland", code: "SUI", flag: "🇨🇭", group: "B" },
  // Group C
  { name: "Brazil", code: "BRA", flag: "🇧🇷", group: "C" },
  { name: "Morocco", code: "MAR", flag: "🇲🇦", group: "C" },
  { name: "Haiti", code: "HAI", flag: "🇭🇹", group: "C" },
  { name: "Scotland", code: "SCO", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", group: "C" },
  // Group D
  { name: "United States", code: "USA", flag: "🇺🇸", group: "D" },
  { name: "Paraguay", code: "PAR", flag: "🇵🇾", group: "D" },
  { name: "Australia", code: "AUS", flag: "🇦🇺", group: "D" },
  { name: "UEFA Playoff C", code: "PLC", flag: "🏳️", group: "D" },
  // Group E
  { name: "Germany", code: "GER", flag: "🇩🇪", group: "E" },
  { name: "Curacao", code: "CUW", flag: "🇨🇼", group: "E" },
  { name: "Ivory Coast", code: "CIV", flag: "🇨🇮", group: "E" },
  { name: "Ecuador", code: "ECU", flag: "🇪🇨", group: "E" },
  // Group F
  { name: "Netherlands", code: "NED", flag: "🇳🇱", group: "F" },
  { name: "Japan", code: "JPN", flag: "🇯🇵", group: "F" },
  { name: "UEFA Playoff B", code: "PLB", flag: "🏳️", group: "F" },
  { name: "Tunisia", code: "TUN", flag: "🇹🇳", group: "F" },
  // Group G
  { name: "Belgium", code: "BEL", flag: "🇧🇪", group: "G" },
  { name: "Egypt", code: "EGY", flag: "🇪🇬", group: "G" },
  { name: "Iran", code: "IRN", flag: "🇮🇷", group: "G" },
  { name: "New Zealand", code: "NZL", flag: "🇳🇿", group: "G" },
  // Group H
  { name: "Spain", code: "ESP", flag: "🇪🇸", group: "H" },
  { name: "Cabo Verde", code: "CPV", flag: "🇨🇻", group: "H" },
  { name: "Saudi Arabia", code: "KSA", flag: "🇸🇦", group: "H" },
  { name: "Uruguay", code: "URU", flag: "🇺🇾", group: "H" },
  // Group I
  { name: "France", code: "FRA", flag: "🇫🇷", group: "I" },
  { name: "Senegal", code: "SEN", flag: "🇸🇳", group: "I" },
  { name: "Interconf Playoff 2", code: "PF2", flag: "🏳️", group: "I" },
  { name: "Norway", code: "NOR", flag: "🇳🇴", group: "I" },
  // Group J
  { name: "Argentina", code: "ARG", flag: "🇦🇷", group: "J" },
  { name: "Algeria", code: "ALG", flag: "🇩🇿", group: "J" },
  { name: "Austria", code: "AUT", flag: "🇦🇹", group: "J" },
  { name: "Jordan", code: "JOR", flag: "🇯🇴", group: "J" },
  // Group K
  { name: "Portugal", code: "POR", flag: "🇵🇹", group: "K" },
  { name: "Interconf Playoff 1", code: "PF1", flag: "🏳️", group: "K" },
  { name: "Uzbekistan", code: "UZB", flag: "🇺🇿", group: "K" },
  { name: "Colombia", code: "COL", flag: "🇨🇴", group: "K" },
  // Group L
  { name: "England", code: "ENG", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", group: "L" },
  { name: "Croatia", code: "CRO", flag: "🇭🇷", group: "L" },
  { name: "Ghana", code: "GHA", flag: "🇬🇭", group: "L" },
  { name: "Panama", code: "PAN", flag: "🇵🇦", group: "L" },
];

// ==========================================
// MATCHES (104 total)
// All times are ET (Eastern Time), converted to UTC
// ==========================================
interface MatchData {
  matchNumber: number;
  phase: string;
  group?: string;
  homeTeam?: string; // team code
  awayTeam?: string; // team code
  dateTimeET: string; // e.g. "2026-06-11T15:00"
  venue: string; // venue name
}

// Helper: ET to UTC (+4 hours during EDT)
function etToUTC(etDateTime: string): Date {
  const d = new Date(etDateTime + ":00.000Z");
  d.setHours(d.getHours() + 4); // EDT is UTC-4
  return d;
}

const matchesData: MatchData[] = [
  // ========== GROUP STAGE (48 matches) ==========
  // Group A
  {
    matchNumber: 1,
    phase: "GROUP_STAGE",
    group: "A",
    homeTeam: "MEX",
    awayTeam: "RSA",
    dateTimeET: "2026-06-11T15:00",
    venue: "Estadio Azteca",
  },
  {
    matchNumber: 2,
    phase: "GROUP_STAGE",
    group: "A",
    homeTeam: "KOR",
    awayTeam: "PLD",
    dateTimeET: "2026-06-11T22:00",
    venue: "Estadio Akron",
  },
  {
    matchNumber: 3,
    phase: "GROUP_STAGE",
    group: "A",
    homeTeam: "PLD",
    awayTeam: "RSA",
    dateTimeET: "2026-06-18T12:00",
    venue: "Mercedes-Benz Stadium",
  },
  {
    matchNumber: 4,
    phase: "GROUP_STAGE",
    group: "A",
    homeTeam: "MEX",
    awayTeam: "KOR",
    dateTimeET: "2026-06-18T21:00",
    venue: "Estadio Akron",
  },
  {
    matchNumber: 5,
    phase: "GROUP_STAGE",
    group: "A",
    homeTeam: "PLD",
    awayTeam: "MEX",
    dateTimeET: "2026-06-24T21:00",
    venue: "Estadio Azteca",
  },
  {
    matchNumber: 6,
    phase: "GROUP_STAGE",
    group: "A",
    homeTeam: "RSA",
    awayTeam: "KOR",
    dateTimeET: "2026-06-24T21:00",
    venue: "Estadio BBVA",
  },

  // Group B
  {
    matchNumber: 7,
    phase: "GROUP_STAGE",
    group: "B",
    homeTeam: "CAN",
    awayTeam: "PLA",
    dateTimeET: "2026-06-12T15:00",
    venue: "BMO Field",
  },
  {
    matchNumber: 8,
    phase: "GROUP_STAGE",
    group: "B",
    homeTeam: "QAT",
    awayTeam: "SUI",
    dateTimeET: "2026-06-13T15:00",
    venue: "Levi's Stadium",
  },
  {
    matchNumber: 9,
    phase: "GROUP_STAGE",
    group: "B",
    homeTeam: "SUI",
    awayTeam: "PLA",
    dateTimeET: "2026-06-18T15:00",
    venue: "SoFi Stadium",
  },
  {
    matchNumber: 10,
    phase: "GROUP_STAGE",
    group: "B",
    homeTeam: "CAN",
    awayTeam: "QAT",
    dateTimeET: "2026-06-18T18:00",
    venue: "BC Place",
  },
  {
    matchNumber: 11,
    phase: "GROUP_STAGE",
    group: "B",
    homeTeam: "SUI",
    awayTeam: "CAN",
    dateTimeET: "2026-06-24T15:00",
    venue: "BC Place",
  },
  {
    matchNumber: 12,
    phase: "GROUP_STAGE",
    group: "B",
    homeTeam: "PLA",
    awayTeam: "QAT",
    dateTimeET: "2026-06-24T15:00",
    venue: "Lumen Field",
  },

  // Group C
  {
    matchNumber: 13,
    phase: "GROUP_STAGE",
    group: "C",
    homeTeam: "BRA",
    awayTeam: "MAR",
    dateTimeET: "2026-06-13T18:00",
    venue: "MetLife Stadium",
  },
  {
    matchNumber: 14,
    phase: "GROUP_STAGE",
    group: "C",
    homeTeam: "HAI",
    awayTeam: "SCO",
    dateTimeET: "2026-06-13T21:00",
    venue: "Gillette Stadium",
  },
  {
    matchNumber: 15,
    phase: "GROUP_STAGE",
    group: "C",
    homeTeam: "SCO",
    awayTeam: "MAR",
    dateTimeET: "2026-06-19T18:00",
    venue: "Gillette Stadium",
  },
  {
    matchNumber: 16,
    phase: "GROUP_STAGE",
    group: "C",
    homeTeam: "BRA",
    awayTeam: "HAI",
    dateTimeET: "2026-06-19T21:00",
    venue: "Lincoln Financial Field",
  },
  {
    matchNumber: 17,
    phase: "GROUP_STAGE",
    group: "C",
    homeTeam: "SCO",
    awayTeam: "BRA",
    dateTimeET: "2026-06-24T18:00",
    venue: "Hard Rock Stadium",
  },
  {
    matchNumber: 18,
    phase: "GROUP_STAGE",
    group: "C",
    homeTeam: "MAR",
    awayTeam: "HAI",
    dateTimeET: "2026-06-24T18:00",
    venue: "Mercedes-Benz Stadium",
  },

  // Group D
  {
    matchNumber: 19,
    phase: "GROUP_STAGE",
    group: "D",
    homeTeam: "USA",
    awayTeam: "PAR",
    dateTimeET: "2026-06-12T21:00",
    venue: "SoFi Stadium",
  },
  {
    matchNumber: 20,
    phase: "GROUP_STAGE",
    group: "D",
    homeTeam: "AUS",
    awayTeam: "PLC",
    dateTimeET: "2026-06-13T00:00",
    venue: "BC Place",
  },
  {
    matchNumber: 21,
    phase: "GROUP_STAGE",
    group: "D",
    homeTeam: "USA",
    awayTeam: "AUS",
    dateTimeET: "2026-06-19T15:00",
    venue: "Lumen Field",
  },
  {
    matchNumber: 22,
    phase: "GROUP_STAGE",
    group: "D",
    homeTeam: "PLC",
    awayTeam: "PAR",
    dateTimeET: "2026-06-20T00:00",
    venue: "Levi's Stadium",
  },
  {
    matchNumber: 23,
    phase: "GROUP_STAGE",
    group: "D",
    homeTeam: "PLC",
    awayTeam: "USA",
    dateTimeET: "2026-06-25T22:00",
    venue: "SoFi Stadium",
  },
  {
    matchNumber: 24,
    phase: "GROUP_STAGE",
    group: "D",
    homeTeam: "PAR",
    awayTeam: "AUS",
    dateTimeET: "2026-06-25T22:00",
    venue: "Levi's Stadium",
  },

  // Group E
  {
    matchNumber: 25,
    phase: "GROUP_STAGE",
    group: "E",
    homeTeam: "GER",
    awayTeam: "CUW",
    dateTimeET: "2026-06-14T13:00",
    venue: "NRG Stadium",
  },
  {
    matchNumber: 26,
    phase: "GROUP_STAGE",
    group: "E",
    homeTeam: "CIV",
    awayTeam: "ECU",
    dateTimeET: "2026-06-14T19:00",
    venue: "Lincoln Financial Field",
  },
  {
    matchNumber: 27,
    phase: "GROUP_STAGE",
    group: "E",
    homeTeam: "GER",
    awayTeam: "CIV",
    dateTimeET: "2026-06-20T16:00",
    venue: "BMO Field",
  },
  {
    matchNumber: 28,
    phase: "GROUP_STAGE",
    group: "E",
    homeTeam: "ECU",
    awayTeam: "CUW",
    dateTimeET: "2026-06-20T20:00",
    venue: "GEHA Field at Arrowhead Stadium",
  },
  {
    matchNumber: 29,
    phase: "GROUP_STAGE",
    group: "E",
    homeTeam: "ECU",
    awayTeam: "GER",
    dateTimeET: "2026-06-25T16:00",
    venue: "MetLife Stadium",
  },
  {
    matchNumber: 30,
    phase: "GROUP_STAGE",
    group: "E",
    homeTeam: "CUW",
    awayTeam: "CIV",
    dateTimeET: "2026-06-25T16:00",
    venue: "Lincoln Financial Field",
  },

  // Group F
  {
    matchNumber: 31,
    phase: "GROUP_STAGE",
    group: "F",
    homeTeam: "NED",
    awayTeam: "JPN",
    dateTimeET: "2026-06-14T16:00",
    venue: "AT&T Stadium",
  },
  {
    matchNumber: 32,
    phase: "GROUP_STAGE",
    group: "F",
    homeTeam: "PLB",
    awayTeam: "TUN",
    dateTimeET: "2026-06-14T22:00",
    venue: "Estadio BBVA",
  },
  {
    matchNumber: 33,
    phase: "GROUP_STAGE",
    group: "F",
    homeTeam: "NED",
    awayTeam: "PLB",
    dateTimeET: "2026-06-20T13:00",
    venue: "NRG Stadium",
  },
  {
    matchNumber: 34,
    phase: "GROUP_STAGE",
    group: "F",
    homeTeam: "TUN",
    awayTeam: "JPN",
    dateTimeET: "2026-06-21T00:00",
    venue: "Estadio BBVA",
  },
  {
    matchNumber: 35,
    phase: "GROUP_STAGE",
    group: "F",
    homeTeam: "JPN",
    awayTeam: "PLB",
    dateTimeET: "2026-06-25T19:00",
    venue: "AT&T Stadium",
  },
  {
    matchNumber: 36,
    phase: "GROUP_STAGE",
    group: "F",
    homeTeam: "TUN",
    awayTeam: "NED",
    dateTimeET: "2026-06-25T19:00",
    venue: "GEHA Field at Arrowhead Stadium",
  },

  // Group G
  {
    matchNumber: 37,
    phase: "GROUP_STAGE",
    group: "G",
    homeTeam: "BEL",
    awayTeam: "EGY",
    dateTimeET: "2026-06-15T15:00",
    venue: "Lumen Field",
  },
  {
    matchNumber: 38,
    phase: "GROUP_STAGE",
    group: "G",
    homeTeam: "IRN",
    awayTeam: "NZL",
    dateTimeET: "2026-06-15T21:00",
    venue: "SoFi Stadium",
  },
  {
    matchNumber: 39,
    phase: "GROUP_STAGE",
    group: "G",
    homeTeam: "BEL",
    awayTeam: "IRN",
    dateTimeET: "2026-06-21T15:00",
    venue: "SoFi Stadium",
  },
  {
    matchNumber: 40,
    phase: "GROUP_STAGE",
    group: "G",
    homeTeam: "NZL",
    awayTeam: "EGY",
    dateTimeET: "2026-06-21T21:00",
    venue: "BC Place",
  },
  {
    matchNumber: 41,
    phase: "GROUP_STAGE",
    group: "G",
    homeTeam: "EGY",
    awayTeam: "IRN",
    dateTimeET: "2026-06-26T23:00",
    venue: "Lumen Field",
  },
  {
    matchNumber: 42,
    phase: "GROUP_STAGE",
    group: "G",
    homeTeam: "NZL",
    awayTeam: "BEL",
    dateTimeET: "2026-06-26T23:00",
    venue: "BC Place",
  },

  // Group H
  {
    matchNumber: 43,
    phase: "GROUP_STAGE",
    group: "H",
    homeTeam: "ESP",
    awayTeam: "CPV",
    dateTimeET: "2026-06-15T12:00",
    venue: "Mercedes-Benz Stadium",
  },
  {
    matchNumber: 44,
    phase: "GROUP_STAGE",
    group: "H",
    homeTeam: "KSA",
    awayTeam: "URU",
    dateTimeET: "2026-06-15T18:00",
    venue: "Hard Rock Stadium",
  },
  {
    matchNumber: 45,
    phase: "GROUP_STAGE",
    group: "H",
    homeTeam: "ESP",
    awayTeam: "KSA",
    dateTimeET: "2026-06-21T12:00",
    venue: "Mercedes-Benz Stadium",
  },
  {
    matchNumber: 46,
    phase: "GROUP_STAGE",
    group: "H",
    homeTeam: "URU",
    awayTeam: "CPV",
    dateTimeET: "2026-06-21T18:00",
    venue: "Hard Rock Stadium",
  },
  {
    matchNumber: 47,
    phase: "GROUP_STAGE",
    group: "H",
    homeTeam: "CPV",
    awayTeam: "KSA",
    dateTimeET: "2026-06-26T20:00",
    venue: "NRG Stadium",
  },
  {
    matchNumber: 48,
    phase: "GROUP_STAGE",
    group: "H",
    homeTeam: "URU",
    awayTeam: "ESP",
    dateTimeET: "2026-06-26T20:00",
    venue: "Estadio Akron",
  },

  // Group I
  {
    matchNumber: 49,
    phase: "GROUP_STAGE",
    group: "I",
    homeTeam: "FRA",
    awayTeam: "SEN",
    dateTimeET: "2026-06-16T15:00",
    venue: "MetLife Stadium",
  },
  {
    matchNumber: 50,
    phase: "GROUP_STAGE",
    group: "I",
    homeTeam: "PF2",
    awayTeam: "NOR",
    dateTimeET: "2026-06-16T18:00",
    venue: "Gillette Stadium",
  },
  {
    matchNumber: 51,
    phase: "GROUP_STAGE",
    group: "I",
    homeTeam: "FRA",
    awayTeam: "PF2",
    dateTimeET: "2026-06-22T17:00",
    venue: "Lincoln Financial Field",
  },
  {
    matchNumber: 52,
    phase: "GROUP_STAGE",
    group: "I",
    homeTeam: "NOR",
    awayTeam: "SEN",
    dateTimeET: "2026-06-22T20:00",
    venue: "MetLife Stadium",
  },
  {
    matchNumber: 53,
    phase: "GROUP_STAGE",
    group: "I",
    homeTeam: "NOR",
    awayTeam: "FRA",
    dateTimeET: "2026-06-26T15:00",
    venue: "Gillette Stadium",
  },
  {
    matchNumber: 54,
    phase: "GROUP_STAGE",
    group: "I",
    homeTeam: "SEN",
    awayTeam: "PF2",
    dateTimeET: "2026-06-26T15:00",
    venue: "BMO Field",
  },

  // Group J
  {
    matchNumber: 55,
    phase: "GROUP_STAGE",
    group: "J",
    homeTeam: "ARG",
    awayTeam: "ALG",
    dateTimeET: "2026-06-16T21:00",
    venue: "GEHA Field at Arrowhead Stadium",
  },
  {
    matchNumber: 56,
    phase: "GROUP_STAGE",
    group: "J",
    homeTeam: "AUT",
    awayTeam: "JOR",
    dateTimeET: "2026-06-17T00:00",
    venue: "Levi's Stadium",
  },
  {
    matchNumber: 57,
    phase: "GROUP_STAGE",
    group: "J",
    homeTeam: "ARG",
    awayTeam: "AUT",
    dateTimeET: "2026-06-22T13:00",
    venue: "AT&T Stadium",
  },
  {
    matchNumber: 58,
    phase: "GROUP_STAGE",
    group: "J",
    homeTeam: "JOR",
    awayTeam: "ALG",
    dateTimeET: "2026-06-22T23:00",
    venue: "Levi's Stadium",
  },
  {
    matchNumber: 59,
    phase: "GROUP_STAGE",
    group: "J",
    homeTeam: "ALG",
    awayTeam: "AUT",
    dateTimeET: "2026-06-27T22:00",
    venue: "GEHA Field at Arrowhead Stadium",
  },
  {
    matchNumber: 60,
    phase: "GROUP_STAGE",
    group: "J",
    homeTeam: "JOR",
    awayTeam: "ARG",
    dateTimeET: "2026-06-27T22:00",
    venue: "AT&T Stadium",
  },

  // Group K
  {
    matchNumber: 61,
    phase: "GROUP_STAGE",
    group: "K",
    homeTeam: "POR",
    awayTeam: "PF1",
    dateTimeET: "2026-06-17T13:00",
    venue: "NRG Stadium",
  },
  {
    matchNumber: 62,
    phase: "GROUP_STAGE",
    group: "K",
    homeTeam: "UZB",
    awayTeam: "COL",
    dateTimeET: "2026-06-17T22:00",
    venue: "Estadio Azteca",
  },
  {
    matchNumber: 63,
    phase: "GROUP_STAGE",
    group: "K",
    homeTeam: "POR",
    awayTeam: "UZB",
    dateTimeET: "2026-06-23T13:00",
    venue: "NRG Stadium",
  },
  {
    matchNumber: 64,
    phase: "GROUP_STAGE",
    group: "K",
    homeTeam: "COL",
    awayTeam: "PF1",
    dateTimeET: "2026-06-23T22:00",
    venue: "Estadio Akron",
  },
  {
    matchNumber: 65,
    phase: "GROUP_STAGE",
    group: "K",
    homeTeam: "COL",
    awayTeam: "POR",
    dateTimeET: "2026-06-27T19:30",
    venue: "Hard Rock Stadium",
  },
  {
    matchNumber: 66,
    phase: "GROUP_STAGE",
    group: "K",
    homeTeam: "PF1",
    awayTeam: "UZB",
    dateTimeET: "2026-06-27T19:30",
    venue: "Mercedes-Benz Stadium",
  },

  // Group L
  {
    matchNumber: 67,
    phase: "GROUP_STAGE",
    group: "L",
    homeTeam: "ENG",
    awayTeam: "CRO",
    dateTimeET: "2026-06-17T16:00",
    venue: "AT&T Stadium",
  },
  {
    matchNumber: 68,
    phase: "GROUP_STAGE",
    group: "L",
    homeTeam: "GHA",
    awayTeam: "PAN",
    dateTimeET: "2026-06-17T19:00",
    venue: "BMO Field",
  },
  {
    matchNumber: 69,
    phase: "GROUP_STAGE",
    group: "L",
    homeTeam: "ENG",
    awayTeam: "GHA",
    dateTimeET: "2026-06-23T16:00",
    venue: "Gillette Stadium",
  },
  {
    matchNumber: 70,
    phase: "GROUP_STAGE",
    group: "L",
    homeTeam: "PAN",
    awayTeam: "CRO",
    dateTimeET: "2026-06-23T19:00",
    venue: "BMO Field",
  },
  {
    matchNumber: 71,
    phase: "GROUP_STAGE",
    group: "L",
    homeTeam: "PAN",
    awayTeam: "ENG",
    dateTimeET: "2026-06-27T17:00",
    venue: "MetLife Stadium",
  },
  {
    matchNumber: 72,
    phase: "GROUP_STAGE",
    group: "L",
    homeTeam: "CRO",
    awayTeam: "GHA",
    dateTimeET: "2026-06-27T17:00",
    venue: "Lincoln Financial Field",
  },

  // ========== ROUND OF 32 (16 matches) ==========
  {
    matchNumber: 73,
    phase: "ROUND_OF_32",
    dateTimeET: "2026-06-28T15:00",
    venue: "SoFi Stadium",
  },
  {
    matchNumber: 74,
    phase: "ROUND_OF_32",
    dateTimeET: "2026-06-29T16:30",
    venue: "Gillette Stadium",
  },
  {
    matchNumber: 75,
    phase: "ROUND_OF_32",
    dateTimeET: "2026-06-29T21:00",
    venue: "Estadio BBVA",
  },
  {
    matchNumber: 76,
    phase: "ROUND_OF_32",
    dateTimeET: "2026-06-29T13:00",
    venue: "NRG Stadium",
  },
  {
    matchNumber: 77,
    phase: "ROUND_OF_32",
    dateTimeET: "2026-06-30T17:00",
    venue: "MetLife Stadium",
  },
  {
    matchNumber: 78,
    phase: "ROUND_OF_32",
    dateTimeET: "2026-06-30T13:00",
    venue: "AT&T Stadium",
  },
  {
    matchNumber: 79,
    phase: "ROUND_OF_32",
    dateTimeET: "2026-06-30T21:00",
    venue: "Estadio Azteca",
  },
  {
    matchNumber: 80,
    phase: "ROUND_OF_32",
    dateTimeET: "2026-07-01T12:00",
    venue: "Mercedes-Benz Stadium",
  },
  {
    matchNumber: 81,
    phase: "ROUND_OF_32",
    dateTimeET: "2026-07-01T20:00",
    venue: "Levi's Stadium",
  },
  {
    matchNumber: 82,
    phase: "ROUND_OF_32",
    dateTimeET: "2026-07-01T16:00",
    venue: "Lumen Field",
  },
  {
    matchNumber: 83,
    phase: "ROUND_OF_32",
    dateTimeET: "2026-07-02T19:00",
    venue: "BMO Field",
  },
  {
    matchNumber: 84,
    phase: "ROUND_OF_32",
    dateTimeET: "2026-07-02T15:00",
    venue: "SoFi Stadium",
  },
  {
    matchNumber: 85,
    phase: "ROUND_OF_32",
    dateTimeET: "2026-07-02T23:00",
    venue: "BC Place",
  },
  {
    matchNumber: 86,
    phase: "ROUND_OF_32",
    dateTimeET: "2026-07-03T18:00",
    venue: "Hard Rock Stadium",
  },
  {
    matchNumber: 87,
    phase: "ROUND_OF_32",
    dateTimeET: "2026-07-03T21:30",
    venue: "GEHA Field at Arrowhead Stadium",
  },
  {
    matchNumber: 88,
    phase: "ROUND_OF_32",
    dateTimeET: "2026-07-03T14:00",
    venue: "AT&T Stadium",
  },

  // ========== ROUND OF 16 (8 matches) ==========
  {
    matchNumber: 89,
    phase: "ROUND_OF_16",
    dateTimeET: "2026-07-04T17:00",
    venue: "Lincoln Financial Field",
  },
  {
    matchNumber: 90,
    phase: "ROUND_OF_16",
    dateTimeET: "2026-07-04T13:00",
    venue: "NRG Stadium",
  },
  {
    matchNumber: 91,
    phase: "ROUND_OF_16",
    dateTimeET: "2026-07-05T16:00",
    venue: "MetLife Stadium",
  },
  {
    matchNumber: 92,
    phase: "ROUND_OF_16",
    dateTimeET: "2026-07-05T20:00",
    venue: "Estadio Azteca",
  },
  {
    matchNumber: 93,
    phase: "ROUND_OF_16",
    dateTimeET: "2026-07-06T15:00",
    venue: "AT&T Stadium",
  },
  {
    matchNumber: 94,
    phase: "ROUND_OF_16",
    dateTimeET: "2026-07-06T20:00",
    venue: "Lumen Field",
  },
  {
    matchNumber: 95,
    phase: "ROUND_OF_16",
    dateTimeET: "2026-07-07T12:00",
    venue: "Mercedes-Benz Stadium",
  },
  {
    matchNumber: 96,
    phase: "ROUND_OF_16",
    dateTimeET: "2026-07-07T16:00",
    venue: "BC Place",
  },

  // ========== QUARTER-FINALS (4 matches) ==========
  {
    matchNumber: 97,
    phase: "QUARTER_FINALS",
    dateTimeET: "2026-07-09T16:00",
    venue: "Gillette Stadium",
  },
  {
    matchNumber: 98,
    phase: "QUARTER_FINALS",
    dateTimeET: "2026-07-10T15:00",
    venue: "SoFi Stadium",
  },
  {
    matchNumber: 99,
    phase: "QUARTER_FINALS",
    dateTimeET: "2026-07-11T17:00",
    venue: "Hard Rock Stadium",
  },
  {
    matchNumber: 100,
    phase: "QUARTER_FINALS",
    dateTimeET: "2026-07-11T21:00",
    venue: "GEHA Field at Arrowhead Stadium",
  },

  // ========== SEMI-FINALS (2 matches) ==========
  {
    matchNumber: 101,
    phase: "SEMI_FINALS",
    dateTimeET: "2026-07-14T15:00",
    venue: "AT&T Stadium",
  },
  {
    matchNumber: 102,
    phase: "SEMI_FINALS",
    dateTimeET: "2026-07-15T15:00",
    venue: "Mercedes-Benz Stadium",
  },

  // ========== THIRD PLACE (1 match) ==========
  {
    matchNumber: 103,
    phase: "THIRD_PLACE",
    dateTimeET: "2026-07-18T17:00",
    venue: "Hard Rock Stadium",
  },

  // ========== FINAL (1 match) ==========
  {
    matchNumber: 104,
    phase: "FINAL",
    dateTimeET: "2026-07-19T15:00",
    venue: "MetLife Stadium",
  },
];

// ==========================================
// SEED FUNCTION
// ==========================================
async function main() {
  console.log("Starting seed...");

  // Clear existing data in reverse dependency order
  console.log("Clearing existing data...");
  await prisma.adminLog.deleteMany();
  await prisma.telegramSubscription.deleteMany();
  await prisma.tournamentResult.deleteMany();
  await prisma.quinielaScore.deleteMany();
  await prisma.paymentReport.deleteMany();
  await prisma.quiniela.deleteMany();
  await prisma.tournamentPrediction.deleteMany();
  await prisma.prediction.deleteMany();
  await prisma.match.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.team.deleteMany();
  await prisma.group.deleteMany();

  // 1. Create groups
  console.log("Creating 12 groups...");
  const groupMap = new Map<string, string>();
  for (const groupName of groups) {
    const group = await prisma.group.create({
      data: { name: groupName },
    });
    groupMap.set(groupName, group.id);
  }

  // 2. Create venues
  console.log("Creating 16 venues...");
  const venueMap = new Map<string, string>();
  for (const v of venues) {
    const venue = await prisma.venue.create({
      data: { name: v.name, city: v.city, country: v.country },
    });
    venueMap.set(v.name, venue.id);
  }

  // 3. Create teams
  console.log("Creating 48 teams...");
  const teamMap = new Map<string, string>();
  for (const t of teams) {
    const team = await prisma.team.create({
      data: {
        name: t.name,
        code: t.code,
        flag: t.flag,
        groupId: groupMap.get(t.group)!,
      },
    });
    teamMap.set(t.code, team.id);
  }

  // 4. Create matches
  console.log("Creating 104 matches...");
  for (const m of matchesData) {
    await prisma.match.create({
      data: {
        matchNumber: m.matchNumber,
        phase: m.phase as any,
        groupId: m.group ? groupMap.get(m.group) : null,
        venueId: venueMap.get(m.venue)!,
        dateTime: etToUTC(m.dateTimeET),
        homeTeamId: m.homeTeam ? teamMap.get(m.homeTeam) ?? null : null,
        awayTeamId: m.awayTeam ? teamMap.get(m.awayTeam) ?? null : null,
      },
    });
  }

  console.log("Seed completed!");
  console.log(`  - ${groups.length} groups`);
  console.log(`  - ${venues.length} venues`);
  console.log(`  - ${teams.length} teams`);
  console.log(`  - ${matchesData.length} matches`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
