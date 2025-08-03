
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { travelAgencySettingsTable } from '../db/schema';
import { type CreateTravelAgencySettingsInput } from '../schema';
import { createTravelAgencySettings } from '../handlers/create_travel_agency_settings';
import { eq } from 'drizzle-orm';

// Test input
const testInput: CreateTravelAgencySettingsInput = {
  name: 'Al Saif Travel Agency',
  address: '123 King Fahd Road, Riyadh, Saudi Arabia'
};

describe('createTravelAgencySettings', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create travel agency settings', async () => {
    const result = await createTravelAgencySettings(testInput);

    // Basic field validation
    expect(result.name).toEqual('Al Saif Travel Agency');
    expect(result.address).toEqual('123 King Fahd Road, Riyadh, Saudi Arabia');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save settings to database', async () => {
    const result = await createTravelAgencySettings(testInput);

    // Query using proper drizzle syntax
    const settings = await db.select()
      .from(travelAgencySettingsTable)
      .where(eq(travelAgencySettingsTable.id, result.id))
      .execute();

    expect(settings).toHaveLength(1);
    expect(settings[0].name).toEqual('Al Saif Travel Agency');
    expect(settings[0].address).toEqual('123 King Fahd Road, Riyadh, Saudi Arabia');
    expect(settings[0].created_at).toBeInstanceOf(Date);
    expect(settings[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle minimum required fields', async () => {
    const minimalInput: CreateTravelAgencySettingsInput = {
      name: 'A',
      address: 'B'
    };

    const result = await createTravelAgencySettings(minimalInput);

    expect(result.name).toEqual('A');
    expect(result.address).toEqual('B');
    expect(result.id).toBeDefined();
  });

  it('should create multiple settings records', async () => {
    // Create first settings
    const firstResult = await createTravelAgencySettings({
      name: 'First Agency',
      address: 'First Address'
    });

    // Create second settings
    const secondResult = await createTravelAgencySettings({
      name: 'Second Agency',
      address: 'Second Address'
    });

    // Verify both exist in database
    const allSettings = await db.select()
      .from(travelAgencySettingsTable)
      .execute();

    expect(allSettings).toHaveLength(2);
    expect(firstResult.id).not.toEqual(secondResult.id);
    
    const firstSettings = allSettings.find(s => s.id === firstResult.id);
    const secondSettings = allSettings.find(s => s.id === secondResult.id);
    
    expect(firstSettings?.name).toEqual('First Agency');
    expect(secondSettings?.name).toEqual('Second Agency');
  });
});
