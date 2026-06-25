import { describe, it, expect } from 'bun:test';
import { planRoute } from '../lib/transit';
import { getTripView } from '../lib/trip-view';
import { getStationById } from '../lib/data';

describe('getTripView', () => {
  const plan = planRoute('RK', 'BOG')!; // rangkasbitung → cikarang → bogor (2 transfers)
  const bog = getStationById('BOG')!;

  it('describes the first leg as a transfer toward the interchange', () => {
    const view = getTripView({
      tripPlan: plan,
      currentLegIndex: 0,
      nearestStationId: 'RK',
      destination: bog,
      stationsRemaining: null,
    })!;
    expect(view.isTransfer).toBe(true);
    expect(view.target?.id).toBe('THB');
    expect(view.legCount).toBe(3);
    expect(view.nextLineName).toBe('Cikarang Line');
    expect(view.progress.current).toBe(0);
    expect(view.progress.total).toBe(plan.legs[0].stationIds.length - 1);
    expect(view.stopsLeft).toBe(view.progress.total);
    expect(view.status).toBe('armed');
  });

  it('marks transfer status at the interchange (0 stops left on a transfer leg)', () => {
    const view = getTripView({
      tripPlan: plan,
      currentLegIndex: 0,
      nearestStationId: 'THB',
      destination: bog,
      stationsRemaining: 0,
    })!;
    expect(view.stopsLeft).toBe(0);
    expect(view.status).toBe('transfer');
  });

  it('marks arrived on the final leg at the destination', () => {
    const lastIdx = plan.legs.length - 1;
    const view = getTripView({
      tripPlan: plan,
      currentLegIndex: lastIdx,
      nearestStationId: 'BOG',
      destination: bog,
      stationsRemaining: 0,
    })!;
    expect(view.isTransfer).toBe(false);
    expect(view.target?.id).toBe('BOG');
    expect(view.status).toBe('arrived');
  });

  it('falls back to the destination when no plan is set', () => {
    const view = getTripView({
      tripPlan: null,
      currentLegIndex: 0,
      nearestStationId: null,
      destination: bog,
      stationsRemaining: 5,
    })!;
    expect(view.leg).toBeNull();
    expect(view.target?.id).toBe('BOG');
    expect(view.stopsLeft).toBe(5);
  });

  it('returns null with neither plan nor destination', () => {
    expect(
      getTripView({
        tripPlan: null,
        currentLegIndex: 0,
        nearestStationId: null,
        destination: null,
        stationsRemaining: null,
      })
    ).toBeNull();
  });
});
