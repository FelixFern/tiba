import { describe, it, expect } from "bun:test";
import {
  haversine,
  equirectangular,
  findNearestStations,
  type Station,
} from "../lib/distance";

describe("Distance Functions", () => {
  // Test coordinates
  const JAKARTA_KOTA = { lat: -6.137499, lon: 106.813904 };
  const MANGGARAI = { lat: -6.210556, lon: 106.850278 };
  const BOGOR = { lat: -6.594167, lon: 106.790833 };
  const NAMBO = { lat: -6.528056, lon: 106.916944 };

  describe("haversine", () => {
    it("should calculate distance Jakarta Kota to Manggarai ≈ 9064m", () => {
      const distance = haversine(
        JAKARTA_KOTA.lat,
        JAKARTA_KOTA.lon,
        MANGGARAI.lat,
        MANGGARAI.lon
      );
      expect(distance).toBeGreaterThan(9014);
      expect(distance).toBeLessThan(9114);
    });

    it("should calculate distance Bogor to Nambo ≈ 15752m", () => {
      const distance = haversine(
        BOGOR.lat,
        BOGOR.lon,
        NAMBO.lat,
        NAMBO.lon
      );
      expect(distance).toBeGreaterThan(15650);
      expect(distance).toBeLessThan(15850);
    });

    it("should return 0 for same point", () => {
      const distance = haversine(
        JAKARTA_KOTA.lat,
        JAKARTA_KOTA.lon,
        JAKARTA_KOTA.lat,
        JAKARTA_KOTA.lon
      );
      expect(distance).toBeLessThan(1); // Should be very close to 0
    });

    it("should be symmetric", () => {
      const d1 = haversine(
        JAKARTA_KOTA.lat,
        JAKARTA_KOTA.lon,
        MANGGARAI.lat,
        MANGGARAI.lon
      );
      const d2 = haversine(
        MANGGARAI.lat,
        MANGGARAI.lon,
        JAKARTA_KOTA.lat,
        JAKARTA_KOTA.lon
      );
      expect(Math.abs(d1 - d2)).toBeLessThan(1); // Within 1 meter
    });
  });

  describe("equirectangular", () => {
    it("should calculate distance with <1% error for short distances", () => {
      const hav = haversine(
        JAKARTA_KOTA.lat,
        JAKARTA_KOTA.lon,
        MANGGARAI.lat,
        MANGGARAI.lon
      );
      const equi = equirectangular(
        JAKARTA_KOTA.lat,
        JAKARTA_KOTA.lon,
        MANGGARAI.lat,
        MANGGARAI.lon
      );
      const errorPercent = Math.abs(hav - equi) / hav;
      expect(errorPercent).toBeLessThan(0.01); // <1% error
    });

    it("should return 0 for same point", () => {
      const distance = equirectangular(
        JAKARTA_KOTA.lat,
        JAKARTA_KOTA.lon,
        JAKARTA_KOTA.lat,
        JAKARTA_KOTA.lon
      );
      expect(distance).toBeLessThan(1);
    });

    it("should be symmetric", () => {
      const d1 = equirectangular(
        JAKARTA_KOTA.lat,
        JAKARTA_KOTA.lon,
        MANGGARAI.lat,
        MANGGARAI.lon
      );
      const d2 = equirectangular(
        MANGGARAI.lat,
        MANGGARAI.lon,
        JAKARTA_KOTA.lat,
        JAKARTA_KOTA.lon
      );
      expect(Math.abs(d1 - d2)).toBeLessThan(1); // Within 1 meter
    });
  });

  describe("findNearestStations", () => {
    const stations: Station[] = [
      { id: "1", name: "Jakarta Kota", lat: JAKARTA_KOTA.lat, lon: JAKARTA_KOTA.lon },
      { id: "2", name: "Manggarai", lat: MANGGARAI.lat, lon: MANGGARAI.lon },
      { id: "3", name: "Bogor", lat: BOGOR.lat, lon: BOGOR.lon },
      { id: "4", name: "Nambo", lat: NAMBO.lat, lon: NAMBO.lon },
      {
        id: "5",
        name: "Bandung",
        lat: -6.928889,
        lon: 107.611667,
      },
    ];

    it("should return correct nearest station when limit=1", () => {
      const result = findNearestStations(
        JAKARTA_KOTA.lat,
        JAKARTA_KOTA.lon,
        stations,
        1
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1"); // Jakarta Kota itself
      expect(result[0].distance).toBeLessThan(1);
    });

    it("should return nearest 5 stations when limit=5", () => {
      const result = findNearestStations(
        JAKARTA_KOTA.lat,
        JAKARTA_KOTA.lon,
        stations,
        5
      );
      expect(result).toHaveLength(5);
      // Should be sorted by distance ascending
      for (let i = 1; i < result.length; i++) {
        expect(result[i].distance).toBeGreaterThanOrEqual(result[i - 1].distance);
      }
    });

    it("should return correct 2 nearest stations to Bogor", () => {
      const result = findNearestStations(BOGOR.lat, BOGOR.lon, stations, 2);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("3"); // Bogor itself
      expect(result[1].id).toBe("4"); // Nambo is closer to Bogor than others
    });

    it("should respect limit parameter", () => {
      const result3 = findNearestStations(
        JAKARTA_KOTA.lat,
        JAKARTA_KOTA.lon,
        stations,
        3
      );
      const result5 = findNearestStations(
        JAKARTA_KOTA.lat,
        JAKARTA_KOTA.lon,
        stations,
        5
      );
      expect(result3).toHaveLength(3);
      expect(result5).toHaveLength(5);
    });

    it("should handle limit greater than array length", () => {
      const result = findNearestStations(
        JAKARTA_KOTA.lat,
        JAKARTA_KOTA.lon,
        stations,
        100
      );
      expect(result).toHaveLength(5); // Should return all stations
    });

    it("should include distance property in results", () => {
      const result = findNearestStations(
        JAKARTA_KOTA.lat,
        JAKARTA_KOTA.lon,
        stations,
        2
      );
      result.forEach((station) => {
        expect(station.distance).toBeDefined();
        expect(typeof station.distance).toBe("number");
        expect(station.distance).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe("Distance accuracy edge cases", () => {
    it("should handle coordinates at the equator", () => {
      const distance = haversine(0, 0, 0, 1);
      // At equator, 1 degree longitude ≈ 111.32 km
      expect(distance).toBeGreaterThan(111000);
      expect(distance).toBeLessThan(112000);
    });

    it("should handle coordinates at prime meridian", () => {
      const distance = haversine(0, 0, 1, 0);
      // 1 degree latitude ≈ 111.32 km everywhere
      expect(distance).toBeGreaterThan(111000);
      expect(distance).toBeLessThan(112000);
    });

    it("should handle negative coordinates", () => {
      const d1 = haversine(-10, -20, -11, -21);
      const d2 = haversine(10, 20, 11, 21);
      // Distance should be the same regardless of hemisphere
      expect(Math.abs(d1 - d2)).toBeLessThan(1);
    });
  });
});
