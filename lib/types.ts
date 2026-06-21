export type LineId = "bogor" | "cikarang" | "rangkasbitung" | "tangerang" | "tanjungpriok";

export interface Station {
  id: string;
  name: string;
  lat: number;
  lon: number;
  lines: LineId[];
  sequences: Partial<Record<LineId, number>>;
}

export interface Line {
  id: LineId;
  name: string;
  color: string;
  stations: string[];
}
