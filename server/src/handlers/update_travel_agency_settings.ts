
import { db } from '../db';
import { travelAgencySettingsTable } from '../db/schema';
import { type UpdateTravelAgencySettingsInput, type TravelAgencySettings } from '../schema';
import { eq } from 'drizzle-orm';

export const updateTravelAgencySettings = async (input: UpdateTravelAgencySettingsInput): Promise<TravelAgencySettings> => {
  try {
    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }

    if (input.address !== undefined) {
      updateData.address = input.address;
    }

    // Update travel agency settings record
    const result = await db.update(travelAgencySettingsTable)
      .set(updateData)
      .where(eq(travelAgencySettingsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Travel agency settings not found');
    }

    return result[0];
  } catch (error) {
    console.error('Travel agency settings update failed:', error);
    throw error;
  }
};
