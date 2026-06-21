import { describe, it, expect } from "bun:test";
import { detectDirection, inferLineFromStation } from "../lib/direction";
import type { Station, Line, LineId } from "../lib/types";

describe("Direction Detection", () => {
  // Test stations with actual sequence data from data/stations.json
  const cikini: Station = {
    id: "CKN",
    name: "Cikini",
    lat: -6.121944,
    lon: 106.825278,
    lines: ["bogor"],
    sequences: { bogor: 4 },
  };

  const kramat: Station = {
    id: "KRT",
    name: "Kramat",
    lat: -6.128611,
    lon: 106.830278,
    lines: ["bogor"],
    sequences: { bogor: 5 },
  };

  const manggarai: Station = {
    id: "MRI",
    name: "Manggarai",
    lat: -6.210556,
    lon: 106.850278,
    lines: ["bogor", "cikarang"],
    sequences: { bogor: 9, cikarang: 13 },
  };

  const tebet: Station = {
    id: "TBT",
    name: "Tebet",
    lat: -6.232222,
    lon: 106.854722,
    lines: ["bogor"],
    sequences: { bogor: 10 },
  };

  // Test line objects
  const bogorLine: Line = {
    id: "bogor",
    name: "Bogor Line",
    color: "#FF6B6B",
    stations: [],
  };

  const cikarangLine: Line = {
    id: "cikarang",
    name: "Cikarang Line",
    color: "#4ECDC4",
    stations: [],
  };

  describe("detectDirection", () => {
    it("should return 'increasing' for sequence Cikini(4) -> Manggarai(9) -> Tebet(10) on Bogor line", () => {
      const history = [tebet, manggarai, cikini]; // Most recent first
      const result = detectDirection(history, bogorLine);
      expect(result).toBe("increasing");
    });

    it("should return 'decreasing' for sequence Tebet(10) -> Manggarai(9) -> Cikini(4) on Bogor line", () => {
      const history = [cikini, manggarai, tebet]; // Most recent first
      const result = detectDirection(history, bogorLine);
      expect(result).toBe("decreasing");
    });

    it("should return null for inconsistent sequence Manggarai(9) -> Kramat(5) -> Manggarai(9) on Bogor line", () => {
      const history = [manggarai, kramat, manggarai]; // Most recent first
      const result = detectDirection(history, bogorLine);
      expect(result).toBeNull();
    });

    it("should return null when station does not have sequence on line", () => {
      const stationWithoutSequence: Station = {
        id: "UNKNOWN",
        name: "Unknown Station",
        lat: 0,
        lon: 0,
        lines: ["bogor"],
        sequences: {}, // No sequence defined for bogor
      };
      const history = [stationWithoutSequence, manggarai, tebet];
      const result = detectDirection(history, bogorLine);
      expect(result).toBeNull();
    });

    it("should return null when history has fewer than 3 stations", () => {
      const history = [manggarai, tebet];
      const result = detectDirection(history, bogorLine);
      expect(result).toBeNull();
    });

    it("should detect Manggarai's correct line (bogor) when it appears in multi-line station sequence", () => {
      // Cikini(bogor:4) -> Manggarai(bogor:9) -> Tebet(bogor:10)
      // Even though Manggarai is on both lines, sequences on bogor are 4->9->10
      const history = [tebet, manggarai, cikini];
      const result = detectDirection(history, bogorLine);
      expect(result).toBe("increasing");
    });

    it("should work correctly with Manggarai on cikarang line", () => {
      // Test with cikarang line (Manggarai seq=13)
      // Since we only have Manggarai with cikarang sequence, this tests the multi-line capability
      const history = [manggarai, manggarai, manggarai];
      const result = detectDirection(history, cikarangLine);
      // All sequences are 13, so it's neither increasing nor decreasing
      expect(result).toBeNull();
    });
  });

  describe("inferLineFromStation", () => {
    it("should return the only line for single-line stations", () => {
      const result = inferLineFromStation(cikini, []);
      expect(result).toBe("bogor");
    });

    it("should return bogor when it is most common in history for Manggarai", () => {
      const lineHistory: LineId[] = ["bogor", "bogor", "cikarang"];
      const result = inferLineFromStation(manggarai, lineHistory);
      expect(result).toBe("bogor");
    });

    it("should return cikarang when it is most common in history for Manggarai", () => {
      const lineHistory: LineId[] = ["cikarang", "cikarang", "bogor"];
      const result = inferLineFromStation(manggarai, lineHistory);
      expect(result).toBe("cikarang");
    });

    it("should return first available line when history is empty", () => {
      const result = inferLineFromStation(manggarai, []);
      expect(result).toBe("bogor"); // First line in array
    });

    it("should return first available line when most common line is not in station's lines", () => {
      // This shouldn't happen in practice, but tests the fallback
      const lineHistory: LineId[] = ["rangkasbitung", "rangkasbitung"];
      const result = inferLineFromStation(manggarai, lineHistory);
      expect(result).toBe("bogor"); // Falls back to first line
    });
  });
});
