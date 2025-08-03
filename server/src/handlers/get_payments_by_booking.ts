
import { db } from '../db';
import { paymentsTable } from '../db/schema';
import { type Payment } from '../schema';
import { eq } from 'drizzle-orm';

export async function getPaymentsByBooking(booking_id: number): Promise<Payment[]> {
  try {
    const results = await db.select()
      .from(paymentsTable)
      .where(eq(paymentsTable.booking_id, booking_id))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(payment => ({
      ...payment,
      amount: parseFloat(payment.amount),
      amount_in_sar: parseFloat(payment.amount_in_sar)
    }));
  } catch (error) {
    console.error('Failed to fetch payments by booking:', error);
    throw error;
  }
}
