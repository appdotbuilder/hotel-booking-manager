
import { db } from '../db';
import { bookingsTable, paymentsTable } from '../db/schema';
import { eq, sum } from 'drizzle-orm';

export interface BookingPaymentStatus {
    booking_id: number;
    total_amount: number;
    total_paid: number;
    outstanding_balance: number;
    is_fully_paid: boolean;
}

export async function getBookingPaymentStatus(booking_id: number): Promise<BookingPaymentStatus> {
    try {
        // Get booking total amount
        const bookingResult = await db.select({
            total_amount: bookingsTable.total_amount
        })
        .from(bookingsTable)
        .where(eq(bookingsTable.id, booking_id))
        .execute();

        if (bookingResult.length === 0) {
            throw new Error(`Booking with ID ${booking_id} not found`);
        }

        // Get total paid amount (sum of all payments for this booking)
        const paymentsResult = await db.select({
            total_paid: sum(paymentsTable.amount_in_sar)
        })
        .from(paymentsTable)
        .where(eq(paymentsTable.booking_id, booking_id))
        .execute();

        // Convert numeric values to numbers
        const total_amount = parseFloat(bookingResult[0].total_amount);
        const total_paid = paymentsResult[0].total_paid ? parseFloat(paymentsResult[0].total_paid) : 0;
        const outstanding_balance = total_amount - total_paid;
        const is_fully_paid = outstanding_balance <= 0;

        return {
            booking_id,
            total_amount,
            total_paid,
            outstanding_balance,
            is_fully_paid
        };
    } catch (error) {
        console.error('Failed to get booking payment status:', error);
        throw error;
    }
}
