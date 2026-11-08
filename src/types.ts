export interface Dose {
  id: string;
  timestamp: string; // ISO 8601 string
  volumeMl: number;  // Volume in mL (e.g. 0.25, 0.5, 1.0)
  oilName: string;   // e.g. "Balanced Oil 10:10"
  notes?: string;    // optional note like "took before sleep"
  timezone: string;  // e.g. "America/Los_Angeles"
  doseNumberToday?: number; // computed or recorded
}

export interface UserSettings {
  oilName: string;
  thcMgPerMl: number;
  cbdMgPerMl: number;
  defaultVolumeMl: number;
  bottleCapacityMl: number;
  bottleOpenedDate?: string;
  dailyTargetDoses: number;
  customTimezone: string; // empty string = automatic browser timezone
  timeFormat: '12h' | '24h';
  hapticsEnabled: boolean;
}

export interface DayDoseSummary {
  dateStr: string; // YYYY-MM-DD
  displayDate: string; // "Today", "Yesterday", "Wed, Nov 5"
  doses: Dose[];
  totalVolumeMl: number;
  totalThcMg: number;
  totalCbdMg: number;
}
