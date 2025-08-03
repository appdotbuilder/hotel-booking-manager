
import { db } from '../db';
import { bookingsTable, customersTable, hotelsTable } from '../db/schema';
import { type Booking } from '../schema';
import { eq } from 'drizzle-orm';

export async function getBookings(): Promise<Booking[]> {
  try {
    // Query bookings with joins to get customer and hotel information
    const results = await db.select()
      .from(bookingsTable)
      .innerJoin(customersTable, eq(bookingsTable.customer_id, customersTable.id))
      .innerJoin(hotelsTable, eq(bookingsTable.hotel_id, hotelsTable.id))
      .execute();

    // Transform the nested result structure and convert numeric fields
    return results.map(result => ({
      id: result.bookings.id,
      invoice_number: result.bookings.invoice_number,
      customer_id: result.bookings.customer_id,
      hotel_id: result.bookings.hotel_id,
      check_in_date: result.bookings.check_in_date,
      check_out_date: result.bookings.check_out_date,
      room_quantity: result.bookings.room_quantity,
      hotel_subtotal: parseFloat(result.bookings.hotel_subtotal),
      services_total: parseFloat(result.bookings.services_total),
      total_amount: parseFloat(result.bookings.total_amount),
      created_at: result.bookings.created_at,
      updated_at: result.bookings.updated_at
    }));
  } catch (error) {
    console.error('Get bookings failed:', error);
    throw error;
  }
}
