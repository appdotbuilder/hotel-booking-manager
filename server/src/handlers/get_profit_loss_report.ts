
import { db } from '../db';
import { bookingsTable, customersTable, hotelsTable, servicesTable, bookingServicesTable } from '../db/schema';
import { type ProfitLossReport, type ReportDateRangeInput } from '../schema';
import { eq, gte, lte, and, SQL } from 'drizzle-orm';

export async function getProfitLossReport(dateRange?: ReportDateRangeInput): Promise<ProfitLossReport[]> {
  try {
    // Build conditions array first
    const conditions: SQL<unknown>[] = [];
    
    if (dateRange?.start_date) {
      const startDate = new Date(dateRange.start_date);
      conditions.push(gte(bookingsTable.created_at, startDate));
    }
    
    if (dateRange?.end_date) {
      const endDate = new Date(dateRange.end_date);
      conditions.push(lte(bookingsTable.created_at, endDate));
    }

    // Build base query with joins and optional where clause
    const baseQuery = db.select({
      invoice_number: bookingsTable.invoice_number,
      customer_name: customersTable.name,
      hotel_subtotal: bookingsTable.hotel_subtotal,
      services_total: bookingsTable.services_total,
      total_amount: bookingsTable.total_amount,
      hotel_cost_price: hotelsTable.cost_price,
      room_quantity: bookingsTable.room_quantity,
      check_in_date: bookingsTable.check_in_date,
      check_out_date: bookingsTable.check_out_date,
      booking_date: bookingsTable.created_at
    })
    .from(bookingsTable)
    .innerJoin(customersTable, eq(bookingsTable.customer_id, customersTable.id))
    .innerJoin(hotelsTable, eq(bookingsTable.hotel_id, hotelsTable.id));

    // Apply where conditions if any exist
    const query = conditions.length > 0 
      ? baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions))
      : baseQuery;

    const bookingResults = await query.execute();

    // Get service costs for each booking
    const bookingIds = bookingResults.map(booking => booking.invoice_number);
    let serviceCosts: Record<string, number> = {};

    if (bookingIds.length > 0) {
      const serviceCostResults = await db.select({
        invoice_number: bookingsTable.invoice_number,
        service_cost_price: servicesTable.cost_price,
        quantity: bookingServicesTable.quantity
      })
      .from(bookingServicesTable)
      .innerJoin(bookingsTable, eq(bookingServicesTable.booking_id, bookingsTable.id))
      .innerJoin(servicesTable, eq(bookingServicesTable.service_id, servicesTable.id))
      .execute();

      // Calculate total service costs per booking
      serviceCostResults.forEach(result => {
        const invoiceNumber = result.invoice_number;
        const serviceCost = parseFloat(result.service_cost_price) * result.quantity;
        
        if (!serviceCosts[invoiceNumber]) {
          serviceCosts[invoiceNumber] = 0;
        }
        serviceCosts[invoiceNumber] += serviceCost;
      });
    }

    // Calculate profit/loss for each booking
    return bookingResults.map(booking => {
      // Calculate hotel cost (cost price * room quantity * nights)
      const checkInDate = new Date(booking.check_in_date);
      const checkOutDate = new Date(booking.check_out_date);
      const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
      const hotelCost = parseFloat(booking.hotel_cost_price) * booking.room_quantity * nights;
      
      // Get service costs for this booking
      const serviceCost = serviceCosts[booking.invoice_number] || 0;
      
      // Calculate totals
      const totalRevenue = parseFloat(booking.total_amount);
      const totalCost = hotelCost + serviceCost;
      const profit = totalRevenue - totalCost;

      return {
        invoice_number: booking.invoice_number,
        customer_name: booking.customer_name,
        total_revenue: totalRevenue,
        total_cost: totalCost,
        profit: profit,
        booking_date: booking.booking_date
      };
    });
  } catch (error) {
    console.error('Profit/loss report generation failed:', error);
    throw error;
  }
}
