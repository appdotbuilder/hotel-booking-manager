
import { db } from '../db';
import { bookingsTable, bookingServicesTable, paymentsTable, expensesTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function deleteBooking(id: number): Promise<boolean> {
  try {
    // Delete in order to respect foreign key constraints
    // 1. Delete booking services (references booking_id)
    await db.delete(bookingServicesTable)
      .where(eq(bookingServicesTable.booking_id, id))
      .execute();

    // 2. Delete payments (references booking_id)
    await db.delete(paymentsTable)
      .where(eq(paymentsTable.booking_id, id))
      .execute();

    // 3. Delete expenses (references booking_id)
    await db.delete(expensesTable)
      .where(eq(expensesTable.booking_id, id))
      .execute();

    // 4. Finally delete the booking itself
    const result = await db.delete(bookingsTable)
      .where(eq(bookingsTable.id, id))
      .execute();

    // Return true if booking was actually deleted
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Booking deletion failed:', error);
    throw error;
  }
}
