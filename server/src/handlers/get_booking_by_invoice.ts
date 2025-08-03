
import { db } from '../db';
import { bookingsTable } from '../db/schema';
import { type Booking } from '../schema';
import { eq } from 'drizzle-orm';

export const getBookingByInvoice = async (invoice_number: string): Promise<Booking | null> => {
  try {
    const results = await db.select()
      .from(bookingsTable)
      .where(eq(bookingsTable.invoice_number, invoice_number))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const booking = results[0];
    return {
      ...booking,
      hotel_subtotal: parseFloat(booking.hotel_subtotal),
      services_total: parseFloat(booking.services_total),
      total_amount: parseFloat(booking.total_amount)
    };
  } catch (error) {
    console.error('Failed to get booking by invoice:', error);
    throw error;
  }
};
