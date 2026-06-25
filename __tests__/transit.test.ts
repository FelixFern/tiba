import { describe, it, expect } from 'bun:test';
import { planRoute, legStations } from '../lib/transit';

describe('Transit route planning', () => {
  it('returns a single leg for a same-line trip', () => {
    // Citayam (CTA) → Bogor (BOG), both on the Bogor line.
    const plan = planRoute('CTA', 'BOG');
    expect(plan).not.toBeNull();
    expect(plan!.legs).toHaveLength(1);

    const [leg] = plan!.legs;
    expect(leg.lineId).toBe('bogor');
    expect(leg.fromStationId).toBe('CTA');
    expect(leg.toStationId).toBe('BOG');
    expect(leg.isTransfer).toBe(false);
    // Ordered, inclusive of both ends.
    expect(leg.stationIds[0]).toBe('CTA');
    expect(leg.stationIds[leg.stationIds.length - 1]).toBe('BOG');
  });

  it('routes across lines via interchange stations, fewest transfers', () => {
    // Rangkasbitung (RK) → Bogor (BOG): no direct/1-transfer path exists, so the
    // minimum is 2 transfers — change at Tanah Abang (THB) to Cikarang, then at
    // Manggarai (MRI) to Bogor.
    const plan = planRoute('RK', 'BOG');
    expect(plan).not.toBeNull();
    expect(plan!.legs).toHaveLength(3);

    const lines = plan!.legs.map((l) => l.lineId);
    expect(lines).toEqual(['rangkasbitung', 'cikarang', 'bogor']);

    // Transfer points are the alight stations of the non-final legs.
    expect(plan!.legs[0].toStationId).toBe('THB');
    expect(plan!.legs[0].isTransfer).toBe(true);
    expect(plan!.legs[1].fromStationId).toBe('THB');
    expect(plan!.legs[1].toStationId).toBe('MRI');
    expect(plan!.legs[1].isTransfer).toBe(true);
    expect(plan!.legs[2].fromStationId).toBe('MRI');
    expect(plan!.legs[2].toStationId).toBe('BOG');
    expect(plan!.legs[2].isTransfer).toBe(false);
  });

  it('chains legs so each transfer station joins adjacent legs', () => {
    const plan = planRoute('RK', 'BOG');
    expect(plan).not.toBeNull();
    for (let i = 1; i < plan!.legs.length; i++) {
      expect(plan!.legs[i].fromStationId).toBe(plan!.legs[i - 1].toStationId);
    }
  });

  it('resolves a leg to ordered Station objects', () => {
    const plan = planRoute('CTA', 'BOG')!;
    const stations = legStations(plan.legs[0]);
    expect(stations.length).toBe(plan.legs[0].stationIds.length);
    expect(stations[0].id).toBe('CTA');
    expect(stations[stations.length - 1].id).toBe('BOG');
  });

  it('returns null for identical origin and destination', () => {
    expect(planRoute('BOG', 'BOG')).toBeNull();
  });

  it('returns null for unknown stations', () => {
    expect(planRoute('NOPE', 'BOG')).toBeNull();
    expect(planRoute('BOG', 'NOPE')).toBeNull();
  });
});
