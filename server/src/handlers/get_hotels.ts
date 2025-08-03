
import { db } from '../db';
import { hotelsTable } from '../db/schema';
import { type Hotel } from '../schema';

export const getHotels = async (): Promise<Hotel[]> => {
  try {
    const results = await db.select()
      .from(hotelsTable)
      .execute();

    // Convert numeric fields back to numbers
    return results.map(hotel => ({
      ...hotel,
      cost_price: parseFloat(hotel.cost_price),
      markup_percentage: parseFloat(hotel.markup_percentage),
      selling_price: parseFloat(hotel.selling_price)
    }));
  } catch (error) {
    console.error('Failed to fetch hotels:', error);
    throw error;
  }
};
