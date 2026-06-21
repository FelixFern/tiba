import { describe, it, expect } from 'bun:test';
import { checkAlarmTrigger, calculateStationsRemaining } from '../lib/alarm';
import { Station, Line } from '../lib/types';

describe('Alarm Trigger Logic', () => {
  // Mock line object
  const bogorLine: Line = {
    id: 'bogor',
    name: 'Bogor Line',
    color: '#00FF00',
    stations: ['JAKK', 'BLK', 'KMN', 'CKN'],
  };

  // Mock station objects (from actual data/stations.json)
  const jakartaKota: Station = {
    id: 'JAKK',
    name: 'Jakarta Kota',
    lat: -6.137499,
    lon: 106.813904,
    lines: ['bogor', 'cikarang'],
    sequences: { bogor: 1, cikarang: 1 },
  };

  const cikini: Station = {
    id: 'CKN',
    name: 'Cikini',
    lat: -6.121944,
    lon: 106.825278,
    lines: ['bogor'],
    sequences: { bogor: 4 },
  };

  const krt: Station = {
    id: 'KRT',
    name: 'Kramat',
    lat: -6.128611,
    lon: 106.830278,
    lines: ['bogor'],
    sequences: { bogor: 5 },
  };

  const juanda: Station = {
    id: 'JUR',
    name: 'Juanda',
    lat: -6.123611,
    lon: 106.843889,
    lines: ['tanjungpriok'],
    sequences: { tanjungpriok: 1 },
  };

  const depok: Station = {
    id: 'DPK',
    name: 'Depok',
    lat: -6.285833,
    lon: 106.830278,
    lines: ['bogor'],
    sequences: { bogor: 21 },
  };

  const bojongGede: Station = {
    id: 'GDG',
    name: 'Gedang',
    lat: -6.480556,
    lon: 106.803333,
    lines: ['bogor'],
    sequences: { bogor: 23 },
  };

  const bogor: Station = {
    id: 'BOG',
    name: 'Bogor',
    lat: -6.594167,
    lon: 106.790833,
    lines: ['bogor'],
    sequences: { bogor: 25 },
  };

  describe('calculateStationsRemaining', () => {
    it('should calculate correct stations remaining when increasing direction', () => {
      const remaining = calculateStationsRemaining(
        cikini,
        bogor,
        bogorLine,
        'increasing'
      );
      expect(remaining).toBe(21); // 25 - 4 = 21
    });

    it('should calculate correct stations remaining when decreasing direction', () => {
      const remaining = calculateStationsRemaining(
        depok,
        jakartaKota,
        bogorLine,
        'decreasing'
      );
      expect(remaining).toBe(20); // 21 - 1 = 20
    });

    it('should return null if currentStation is null', () => {
      const remaining = calculateStationsRemaining(
        null,
        bogor,
        bogorLine,
        'increasing'
      );
      expect(remaining).toBeNull();
    });

    it('should return null if destination is null', () => {
      const remaining = calculateStationsRemaining(
        cikini,
        null,
        bogorLine,
        'increasing'
      );
      expect(remaining).toBeNull();
    });

    it('should return null if line is null', () => {
      const remaining = calculateStationsRemaining(
        cikini,
        bogor,
        null,
        'increasing'
      );
      expect(remaining).toBeNull();
    });

    it('should return null if station does not have sequence for line', () => {
      const remaining = calculateStationsRemaining(
        juanda,
        bogor,
        bogorLine,
        'increasing'
      );
      expect(remaining).toBeNull();
    });

    it('should return null for invalid direction', () => {
      const remaining = calculateStationsRemaining(
        cikini,
        bogor,
        bogorLine,
        'invalid'
      );
      expect(remaining).toBeNull();
    });
  });

  describe('checkAlarmTrigger', () => {
    it('should return false when 17 stations left and threshold is 3', () => {
      const shouldTrigger = checkAlarmTrigger(
        cikini,
        bogor,
        bogorLine,
        'increasing',
        3
      );
      expect(shouldTrigger).toBe(false);
    });

    it('should return true when 2 stations left and threshold is 3', () => {
      const shouldTrigger = checkAlarmTrigger(
        bojongGede,
        bogor,
        bogorLine,
        'increasing',
        3
      );
      expect(shouldTrigger).toBe(true);
    });

    it('should return false when 20 stations left (decreasing) and threshold is 5', () => {
      const shouldTrigger = checkAlarmTrigger(
        depok,
        jakartaKota,
        bogorLine,
        'decreasing',
        5
      );
      expect(shouldTrigger).toBe(false);
    });

    it('should return true when 4 stations left (decreasing) and threshold is 5', () => {
      const shouldTrigger = checkAlarmTrigger(
        krt,
        jakartaKota,
        bogorLine,
        'decreasing',
        5
      );
      expect(shouldTrigger).toBe(true); // 5 - 1 = 4 stations left, threshold 5
    });

    it('should return false when destination is null', () => {
      const shouldTrigger = checkAlarmTrigger(
        cikini,
        null,
        bogorLine,
        'increasing',
        3
      );
      expect(shouldTrigger).toBe(false);
    });

    it('should return false when currentStation is null', () => {
      const shouldTrigger = checkAlarmTrigger(
        null,
        bogor,
        bogorLine,
        'increasing',
        3
      );
      expect(shouldTrigger).toBe(false);
    });

    it('should return false when line is null', () => {
      const shouldTrigger = checkAlarmTrigger(
        cikini,
        bogor,
        null,
        'increasing',
        3
      );
      expect(shouldTrigger).toBe(false);
    });

    it('should return false when direction is null', () => {
      const shouldTrigger = checkAlarmTrigger(
        cikini,
        bogor,
        bogorLine,
        null as any,
        3
      );
      expect(shouldTrigger).toBe(false);
    });

    it('should return false when threshold is null', () => {
      const shouldTrigger = checkAlarmTrigger(
        cikini,
        bogor,
        bogorLine,
        'increasing',
        null as any
      );
      expect(shouldTrigger).toBe(false);
    });

    it('should return false when at destination (0 stations remaining)', () => {
      const shouldTrigger = checkAlarmTrigger(
        bogor,
        bogor,
        bogorLine,
        'increasing',
        3
      );
      expect(shouldTrigger).toBe(false);
    });

    it('should return false when past destination (negative stations)', () => {
      const shouldTrigger = checkAlarmTrigger(
        bogor,
        cikini,
        bogorLine,
        'increasing',
        3
      );
      expect(shouldTrigger).toBe(false);
    });

    it('should return true when exactly at threshold', () => {
      const shouldTrigger = checkAlarmTrigger(
        bojongGede,
        bogor,
        bogorLine,
        'increasing',
        2
      );
      expect(shouldTrigger).toBe(true); // 2 stations left, threshold 2
    });

    it('should return false when 1 station above threshold', () => {
      const shouldTrigger = checkAlarmTrigger(
        bojongGede,
        bogor,
        bogorLine,
        'increasing',
        1
      );
      expect(shouldTrigger).toBe(false); // 2 stations left, threshold 1
    });
  });
});
