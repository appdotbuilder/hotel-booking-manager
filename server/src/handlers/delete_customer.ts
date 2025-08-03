
import { db } from '../db';
import { customersTable, bookingsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function deleteCustomer(id: number): Promise<boolean> {
  try {
    // First check if customer exists
    const existingCustomer = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, id))
      .execute();

    if (existingCustomer.length === 0) {
      return false; // Customer not found
    }

    // Check if customer has any bookings
    const relatedBookings = await db.select()
      .from(bookingsTable)
      .where(eq(bookingsTable.customer_id, id))
      .execute();

    if (relatedBookings.length > 0) {
      throw new Error('Cannot delete customer with existing bookings');
    }

    // Delete customer
    const result = await db.delete(customersTable)
      .where(eq(customersTable.id, id))
      .execute();

    return true;
  } catch (error) {
    console.error('Customer deletion failed:', error);
    throw error;
  }
}
