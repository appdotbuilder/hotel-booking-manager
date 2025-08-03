
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { travelAgencySettingsTable } from '../db/schema';
import { getTravelAgencySettings } from '../handlers/get_travel_agency_settings';

describe('getTravelAgencySettings', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null when no settings exist', async () => {
    const result = await getTravelAgencySettings();
    expect(result).toBeNull();
  });

  it('should return the travel agency settings when they exist', async () => {
    // Create test settings record
    await db.insert(travelAgencySettingsTable)
      .values({
        name: 'Al-Hijra Travel Agency',
        address: 'Riyadh, Saudi Arabia'
      })
      .execute();

    const result = await getTravelAgencySettings();

    expect(result).not.toBeNull();
    expect(result!.name).toBe('Al-Hijra Travel Agency');
    expect(result!.address).toBe('Riyadh, Saudi Arabia');
    expect(result!.id).toBeDefined();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return the first record when multiple settings exist', async () => {
    // Create multiple settings records (should not happen in practice)
    await db.insert(travelAgencySettingsTable)
      .values([
        {
          name: 'First Travel Agency',
          address: 'First Address'
        },
        {
          name: 'Second Travel Agency', 
          address: 'Second Address'
        }
      ])
      .execute();

    const result = await getTravelAgencySettings();

    expect(result).not.toBeNull();
    expect(result!.name).toBe('First Travel Agency');
    expect(result!.address).toBe('First Address');
  });

  it('should have correct field types', async () => {
    // Create test settings record
    await db.insert(travelAgencySettingsTable)
      .values({
        name: 'Test Agency',
        address: 'Test Address'
      })
      .execute();

    const result = await getTravelAgencySettings();

    expect(result).not.toBeNull();
    expect(typeof result!.id).toBe('number');
    expect(typeof result!.name).toBe('string');
    expect(typeof result!.address).toBe('string');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });
});
