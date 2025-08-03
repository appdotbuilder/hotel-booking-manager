
import { db } from '../db';
import { travelAgencySettingsTable } from '../db/schema';
import { type TravelAgencySettings } from '../schema';

export const getTravelAgencySettings = async (): Promise<TravelAgencySettings | null> => {
  try {
    // Get the first (and typically only) travel agency settings record
    const results = await db.select()
      .from(travelAgencySettingsTable)
      .limit(1)
      .execute();

    if (results.length === 0) {
      return null;
    }

    // Return the settings record - no numeric conversions needed as all fields are text/timestamp
    return results[0];
  } catch (error) {
    console.error('Failed to fetch travel agency settings:', error);
    throw error;
  }
};
