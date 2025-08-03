
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { travelAgencySettingsTable } from '../db/schema';
import { type UpdateTravelAgencySettingsInput, type CreateTravelAgencySettingsInput } from '../schema';
import { updateTravelAgencySettings } from '../handlers/update_travel_agency_settings';
import { eq } from 'drizzle-orm';

// Test inputs
const createInput: CreateTravelAgencySettingsInput = {
  name: 'Original Travel Agency',
  address: 'Original Address'
};

const updateInput: UpdateTravelAgencySettingsInput = {
  id: 1,
  name: 'Updated Travel Agency',
  address: 'Updated Address'
};

describe('updateTravelAgencySettings', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update travel agency settings', async () => {
    // Create initial record
    const created = await db.insert(travelAgencySettingsTable)
      .values(createInput)
      .returning()
      .execute();

    const settingsId = created[0].id;

    // Update the record
    const result = await updateTravelAgencySettings({
      ...updateInput,
      id: settingsId
    });

    // Verify updated fields
    expect(result.id).toEqual(settingsId);
    expect(result.name).toEqual('Updated Travel Agency');
    expect(result.address).toEqual('Updated Address');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(result.created_at.getTime());
  });

  it('should update only provided fields', async () => {
    // Create initial record
    const created = await db.insert(travelAgencySettingsTable)
      .values(createInput)
      .returning()
      .execute();

    const settingsId = created[0].id;

    // Update only name
    const result = await updateTravelAgencySettings({
      id: settingsId,
      name: 'Partially Updated Name'
    });

    // Verify only name was updated
    expect(result.name).toEqual('Partially Updated Name');
    expect(result.address).toEqual('Original Address'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updated data to database', async () => {
    // Create initial record
    const created = await db.insert(travelAgencySettingsTable)
      .values(createInput)
      .returning()
      .execute();

    const settingsId = created[0].id;

    // Update the record
    await updateTravelAgencySettings({
      ...updateInput,
      id: settingsId
    });

    // Query database to verify changes were saved
    const settings = await db.select()
      .from(travelAgencySettingsTable)
      .where(eq(travelAgencySettingsTable.id, settingsId))
      .execute();

    expect(settings).toHaveLength(1);
    expect(settings[0].name).toEqual('Updated Travel Agency');
    expect(settings[0].address).toEqual('Updated Address');
    expect(settings[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when settings not found', async () => {
    const nonExistentInput: UpdateTravelAgencySettingsInput = {
      id: 999,
      name: 'Non-existent Settings'
    };

    await expect(updateTravelAgencySettings(nonExistentInput))
      .rejects.toThrow(/not found/i);
  });
});
