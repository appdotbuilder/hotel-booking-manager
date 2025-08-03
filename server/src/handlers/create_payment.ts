
import { db } from '../db';
import { paymentsTable, currencyConversionsTable, bookingsTable } from '../db/schema';
import { type CreatePaymentInput, type Payment } from '../schema';
import { eq } from 'drizzle-orm';

export const createPayment = async (input: CreatePaymentInput): Promise<Payment> => {
  try {
    // Verify booking exists
    const booking = await db.select()
      .from(bookingsTable)
      .where(eq(bookingsTable.id, input.booking_id))
      .execute();

    if (booking.length === 0) {
      throw new Error(`Booking with id ${input.booking_id} not found`);
    }

    // Get conversion rate if currency is not SAR
    let amount_in_sar = input.amount;
    
    if (input.currency !== 'SAR') {
      const currencyConversion = await db.select()
        .from(currencyConversionsTable)
        .where(eq(currencyConversionsTable.currency_name, input.currency))
        .execute();

      if (currencyConversion.length === 0) {
        throw new Error(`Currency conversion rate for ${input.currency} not found`);
      }

      const conversionRate = parseFloat(currencyConversion[0].conversion_rate);
      amount_in_sar = input.amount * conversionRate;
    }

    // Insert payment record
    const result = await db.insert(paymentsTable)
      .values({
        booking_id: input.booking_id,
        amount: input.amount.toString(),
        currency: input.currency,
        amount_in_sar: amount_in_sar.toString(),
        payment_method: input.payment_method,
        payment_date: new Date()
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const payment = result[0];
    return {
      ...payment,
      amount: parseFloat(payment.amount),
      amount_in_sar: parseFloat(payment.amount_in_sar)
    };
  } catch (error) {
    console.error('Payment creation failed:', error);
    throw error;
  }
};
