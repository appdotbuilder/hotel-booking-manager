
import { db } from '../db';
import { bookingsTable } from '../db/schema';
import { type BookingsSummaryReport, type ReportDateRangeInput } from '../schema';
import { sql, gte, lte, and, type SQL } from 'drizzle-orm';

export async function getBookingsSummaryReport(dateRange?: ReportDateRangeInput): Promise<BookingsSummaryReport[]> {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];
    if (dateRange?.start_date) {
      const startDate = new Date(dateRange.start_date);
      conditions.push(gte(bookingsTable.created_at, startDate));
    }
    if (dateRange?.end_date) {
      const endDate = new Date(dateRange.end_date);
      // Set end date to end of day
      endDate.setHours(23, 59, 59, 999);
      conditions.push(lte(bookingsTable.created_at, endDate));
    }

    // Build the complete query in one go
    const baseQuery = db.select({
      date: sql<string>`DATE(${bookingsTable.created_at})`.as('date'),
      total_bookings: sql<string>`COUNT(*)`.as('total_bookings'),
      total_revenue: sql<string>`SUM(${bookingsTable.total_amount})`.as('total_revenue'),
      total_rooms: sql<string>`SUM(${bookingsTable.room_quantity})`.as('total_rooms')
    }).from(bookingsTable);

    // Apply where clause if conditions exist
    const query = conditions.length > 0
      ? baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions))
      : baseQuery;

    // Execute query with groupBy and orderBy
    const results = await query
      .groupBy(sql`DATE(${bookingsTable.created_at})`)
      .orderBy(sql`DATE(${bookingsTable.created_at}) ASC`)
      .execute();

    // Convert all fields to proper types
    return results.map(result => ({
      date: new Date(result.date), // Convert string date to Date object
      total_bookings: parseInt(result.total_bookings), // Convert string to number
      total_revenue: parseFloat(result.total_revenue), // Convert string to number
      total_rooms: parseInt(result.total_rooms) // Convert string to number
    }));
  } catch (error) {
    console.error('Bookings summary report generation failed:', error);
    throw error;
  }
}
