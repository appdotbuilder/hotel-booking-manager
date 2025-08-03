
import { db } from '../db';
import { customersTable, bookingsTable, paymentsTable, hotelsTable, servicesTable, bookingServicesTable } from '../db/schema';
import { type DashboardStats } from '../schema';
import { count, sum, eq, sql } from 'drizzle-orm';

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Get total customers count
    const customersResult = await db.select({ count: count() })
      .from(customersTable)
      .execute();
    const totalCustomers = customersResult[0].count;

    // Get total bookings count
    const bookingsResult = await db.select({ count: count() })
      .from(bookingsTable)
      .execute();
    const totalBookings = bookingsResult[0].count;

    // Calculate total profit (revenue - cost)
    // Revenue comes from bookings total_amount
    // Cost comes from hotel cost_price * room_quantity * nights + services cost_price * quantity
    const profitQuery = await db.select({
      totalRevenue: sum(bookingsTable.total_amount),
      totalHotelCost: sql<string>`COALESCE(SUM(${hotelsTable.cost_price} * ${bookingsTable.room_quantity} * EXTRACT(DAY FROM (${bookingsTable.check_out_date} - ${bookingsTable.check_in_date}))), 0)`,
      totalServiceCost: sql<string>`COALESCE(SUM(${servicesTable.cost_price} * ${bookingServicesTable.quantity}), 0)`
    })
    .from(bookingsTable)
    .leftJoin(hotelsTable, eq(bookingsTable.hotel_id, hotelsTable.id))
    .leftJoin(bookingServicesTable, eq(bookingsTable.id, bookingServicesTable.booking_id))
    .leftJoin(servicesTable, eq(bookingServicesTable.service_id, servicesTable.id))
    .execute();

    const totalRevenue = parseFloat(profitQuery[0].totalRevenue || '0');
    const totalHotelCost = parseFloat(profitQuery[0].totalHotelCost || '0');
    const totalServiceCost = parseFloat(profitQuery[0].totalServiceCost || '0');
    const totalProfit = totalRevenue - (totalHotelCost + totalServiceCost);

    // Count unpaid bookings (bookings where total payments < total amount)
    const unpaidBookingsQuery = await db.select({
      bookingId: bookingsTable.id,
      totalAmount: bookingsTable.total_amount,
      paidAmount: sql<string>`COALESCE(SUM(${paymentsTable.amount_in_sar}), 0)`
    })
    .from(bookingsTable)
    .leftJoin(paymentsTable, eq(bookingsTable.id, paymentsTable.booking_id))
    .groupBy(bookingsTable.id, bookingsTable.total_amount)
    .execute();

    const unpaidBookings = unpaidBookingsQuery.filter(booking => {
      const totalAmount = parseFloat(booking.totalAmount);
      const paidAmount = parseFloat(booking.paidAmount);
      return paidAmount < totalAmount;
    }).length;

    return {
      total_customers: totalCustomers,
      total_bookings: totalBookings,
      total_profit: totalProfit,
      unpaid_bookings: unpaidBookings
    };
  } catch (error) {
    console.error('Dashboard stats calculation failed:', error);
    throw error;
  }
}
