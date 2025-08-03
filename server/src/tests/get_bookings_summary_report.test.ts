
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, hotelsTable, bookingsTable } from '../db/schema';
import { type ReportDateRangeInput } from '../schema';
import { getBookingsSummaryReport } from '../handlers/get_bookings_summary_report';

// Test data
const testCustomer = {
  name: 'Test Customer',
  address: '123 Test St',
  phone: '1234567890',
  email: 'test@example.com'
};

const testHotel = {
  name: 'Test Hotel',
  location: 'Test City',
  room_type: 'Double' as const,
  meal_package: 'Full Board' as const,
  cost_price: '100.00',
  markup_percentage: '20.00',
  selling_price: '120.00'
};

describe('getBookingsSummaryReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no bookings exist', async () => {
    const result = await getBookingsSummaryReport();
    expect(result).toEqual([]);
  });

  it('should generate summary report for bookings', async () => {
    // Create prerequisite data
    const [customer] = await db.insert(customersTable).values(testCustomer).returning();
    const [hotel] = await db.insert(hotelsTable).values(testHotel).returning();

    // Create test bookings on same date
    const today = new Date();
    today.setHours(10, 0, 0, 0);

    await db.insert(bookingsTable).values([
      {
        invoice_number: 'INV-001',
        customer_id: customer.id,
        hotel_id: hotel.id,
        check_in_date: today,
        check_out_date: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        room_quantity: 2,
        hotel_subtotal: '240.00',
        services_total: '50.00',
        total_amount: '290.00',
        created_at: today
      },
      {
        invoice_number: 'INV-002',
        customer_id: customer.id,
        hotel_id: hotel.id,
        check_in_date: today,
        check_out_date: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        room_quantity: 1,
        hotel_subtotal: '120.00',
        services_total: '25.00',
        total_amount: '145.00',
        created_at: today
      }
    ]);

    const result = await getBookingsSummaryReport();

    expect(result).toHaveLength(1);
    expect(result[0].date).toBeInstanceOf(Date);
    expect(result[0].total_bookings).toBe(2);
    expect(result[0].total_revenue).toBe(435.00); // 290 + 145
    expect(result[0].total_rooms).toBe(3); // 2 + 1
    expect(typeof result[0].total_revenue).toBe('number');
    expect(typeof result[0].total_bookings).toBe('number');
  });

  it('should group bookings by date correctly', async () => {
    // Create prerequisite data
    const [customer] = await db.insert(customersTable).values(testCustomer).returning();
    const [hotel] = await db.insert(hotelsTable).values(testHotel).returning();

    // Create bookings on different dates
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    
    today.setHours(10, 0, 0, 0);
    yesterday.setHours(15, 0, 0, 0);

    await db.insert(bookingsTable).values([
      {
        invoice_number: 'INV-001',
        customer_id: customer.id,
        hotel_id: hotel.id,
        check_in_date: today,
        check_out_date: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        room_quantity: 2,
        hotel_subtotal: '240.00',
        services_total: '50.00',
        total_amount: '290.00',
        created_at: today
      },
      {
        invoice_number: 'INV-002',
        customer_id: customer.id,
        hotel_id: hotel.id,
        check_in_date: yesterday,
        check_out_date: today,
        room_quantity: 1,
        hotel_subtotal: '120.00',
        services_total: '25.00',
        total_amount: '145.00',
        created_at: yesterday
      }
    ]);

    const result = await getBookingsSummaryReport();

    expect(result).toHaveLength(2);
    
    // Results should be ordered by date (ASC)
    const earlierDate = result[0];
    const laterDate = result[1];
    
    expect(earlierDate.date < laterDate.date).toBe(true);
    expect(earlierDate.total_bookings).toBe(1);
    expect(earlierDate.total_revenue).toBe(145.00);
    expect(earlierDate.total_rooms).toBe(1);
    
    expect(laterDate.total_bookings).toBe(1);
    expect(laterDate.total_revenue).toBe(290.00);
    expect(laterDate.total_rooms).toBe(2);
  });

  it('should filter by date range when provided', async () => {
    // Create prerequisite data
    const [customer] = await db.insert(customersTable).values(testCustomer).returning();
    const [hotel] = await db.insert(hotelsTable).values(testHotel).returning();

    // Create bookings across multiple days
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);

    await db.insert(bookingsTable).values([
      {
        invoice_number: 'INV-001',
        customer_id: customer.id,
        hotel_id: hotel.id,
        check_in_date: twoDaysAgo,
        check_out_date: yesterday,
        room_quantity: 1,
        hotel_subtotal: '120.00',
        services_total: '0.00',
        total_amount: '120.00',
        created_at: twoDaysAgo
      },
      {
        invoice_number: 'INV-002',
        customer_id: customer.id,
        hotel_id: hotel.id,
        check_in_date: yesterday,
        check_out_date: today,
        room_quantity: 1,
        hotel_subtotal: '120.00',
        services_total: '25.00',
        total_amount: '145.00',
        created_at: yesterday
      },
      {
        invoice_number: 'INV-003',
        customer_id: customer.id,
        hotel_id: hotel.id,
        check_in_date: today,
        check_out_date: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        room_quantity: 2,
        hotel_subtotal: '240.00',
        services_total: '50.00',
        total_amount: '290.00',
        created_at: today
      }
    ]);

    // Filter for yesterday and today only
    const dateRange: ReportDateRangeInput = {
      start_date: yesterday.toISOString().split('T')[0],
      end_date: today.toISOString().split('T')[0]
    };

    const result = await getBookingsSummaryReport(dateRange);

    expect(result).toHaveLength(2);
    expect(result[0].total_revenue).toBe(145.00); // Yesterday's booking
    expect(result[1].total_revenue).toBe(290.00); // Today's booking
  });

  it('should handle start_date filter only', async () => {
    // Create prerequisite data
    const [customer] = await db.insert(customersTable).values(testCustomer).returning();
    const [hotel] = await db.insert(hotelsTable).values(testHotel).returning();

    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    await db.insert(bookingsTable).values([
      {
        invoice_number: 'INV-001',
        customer_id: customer.id,
        hotel_id: hotel.id,
        check_in_date: yesterday,
        check_out_date: today,
        room_quantity: 1,
        hotel_subtotal: '120.00',
        services_total: '25.00',
        total_amount: '145.00',
        created_at: yesterday
      },
      {
        invoice_number: 'INV-002',
        customer_id: customer.id,
        hotel_id: hotel.id,
        check_in_date: today,
        check_out_date: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        room_quantity: 2,
        hotel_subtotal: '240.00',
        services_total: '50.00',
        total_amount: '290.00',
        created_at: today
      }
    ]);

    // Filter from today onwards
    const dateRange: ReportDateRangeInput = {
      start_date: today.toISOString().split('T')[0]
    };

    const result = await getBookingsSummaryReport(dateRange);

    expect(result).toHaveLength(1);
    expect(result[0].total_revenue).toBe(290.00); // Only today's booking
    expect(result[0].total_bookings).toBe(1);
  });
});
