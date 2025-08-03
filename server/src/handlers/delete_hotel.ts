
import { db } from '../db';
import { hotelsTable, bookingsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function deleteHotel(id: number): Promise<boolean> {
  try {
    // Check if hotel exists
    const hotel = await db.select()
      .from(hotelsTable)
      .where(eq(hotelsTable.id, id))
      .execute();

    if (hotel.length === 0) {
      throw new Error('Hotel not found');
    }

    // Check for related bookings
    const relatedBookings = await db.select()
      .from(bookingsTable)
      .where(eq(bookingsTable.hotel_id, id))
      .execute();

    if (relatedBookings.length > 0) {
      throw new Error('Cannot delete hotel with existing bookings');
    }

    // Delete the hotel
    const result = await db.delete(hotelsTable)
      .where(eq(hotelsTable.id, id))
      .execute();

    return true;
  } catch (error) {
    console.error('Hotel deletion failed:', error);
    throw error;
  }
}
