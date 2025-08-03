
import { db } from '../db';
import { travelAgencySettingsTable } from '../db/schema';
import { type CreateTravelAgencySettingsInput, type TravelAgencySettings } from '../schema';

export const createTravelAgencySettings = async (input: CreateTravelAgencySettingsInput): Promise<TravelAgencySettings> => {
  try {
    // Insert travel agency settings record
    const result = await db.insert(travelAgencySettingsTable)
      .values({
        name: input.name,
        address: input.address
      })
      .returning()
      .execute();

    // Return the created record
    const settings = result[0];
    return settings;
  } catch (error) {
    console.error('Travel agency settings creation failed:', error);
    throw error;
  }
};
