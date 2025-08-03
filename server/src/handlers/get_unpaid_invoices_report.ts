
import { db } from '../db';
import { bookingsTable, customersTable, paymentsTable } from '../db/schema';
import { type UnpaidInvoicesReport } from '../schema';
import { eq, sum, sql } from 'drizzle-orm';

export async function getUnpaidInvoicesReport(): Promise<UnpaidInvoicesReport[]> {
  try {
    // Query to get all bookings with their customers and calculated payment totals
    const results = await db
      .select({
        invoice_number: bookingsTable.invoice_number,
        customer_name: customersTable.name,
        total_amount: bookingsTable.total_amount,
        paid_amount: sql<string>`COALESCE(${sum(paymentsTable.amount_in_sar)}, 0)`.as('paid_amount'),
        booking_date: bookingsTable.created_at,
      })
      .from(bookingsTable)
      .innerJoin(customersTable, eq(bookingsTable.customer_id, customersTable.id))
      .leftJoin(paymentsTable, eq(bookingsTable.id, paymentsTable.booking_id))
      .groupBy(
        bookingsTable.id,
        bookingsTable.invoice_number,
        customersTable.name,
        bookingsTable.total_amount,
        bookingsTable.created_at
      )
      .execute();

    // Filter only unpaid invoices and calculate outstanding balance
    return results
      .map(result => {
        const totalAmount = parseFloat(result.total_amount);
        const paidAmount = parseFloat(result.paid_amount);
        const outstandingBalance = totalAmount - paidAmount;

        return {
          invoice_number: result.invoice_number,
          customer_name: result.customer_name,
          total_amount: totalAmount,
          paid_amount: paidAmount,
          outstanding_balance: outstandingBalance,
          booking_date: result.booking_date,
        };
      })
      .filter(report => report.outstanding_balance > 0);
  } catch (error) {
    console.error('Failed to generate unpaid invoices report:', error);
    throw error;
  }
}
