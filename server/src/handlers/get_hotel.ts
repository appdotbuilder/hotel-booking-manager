
import { db } from '../db';
import { hotelsTable } from '../db/schema';
import { type Hotel } from '../schema';
import { eq } from 'drizzle-orm';

export const getHotel = async (id: number): Promise<Hotel | null> => {
  try {
    const results = await db.select()
      .from(hotelsTable)
      .where(eq(hotelsTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const hotel = results[0];
    return {
      ...hotel,
      cost_price: parseFloat(hotel.cost_price),
      markup_percentage: parseFloat(hotel.markup_percentage),
      selling_price: parseFloat(hotel.selling_price)
    };
  } catch (error) {
    console.error('Hotel retrieval failed:', error);
    throw error;
  }
};
