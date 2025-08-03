
import { db } from '../db';
import { bookingsTable } from '../db/schema';
import { type Booking } from '../schema';
import { eq } from 'drizzle-orm';

export const getBooking = async (id: number): Promise<Booking | null> => {
  try {
    const results = await db.select()
      .from(bookingsTable)
      .where(eq(bookingsTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const booking = results[0];
    
    // Convert numeric fields back to numbers
    return {
      ...booking,
      hotel_subtotal: parseFloat(booking.hotel_subtotal),
      services_total: parseFloat(booking.services_total),
      total_amount: parseFloat(booking.total_amount)
    };
  } catch (error) {
    console.error('Booking retrieval failed:', error);
    throw error;
  }
};
