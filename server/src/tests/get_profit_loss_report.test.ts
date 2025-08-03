
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, hotelsTable, servicesTable, bookingsTable, bookingServicesTable } from '../db/schema';
import { type ReportDateRangeInput } from '../schema';
import { getProfitLossReport } from '../handlers/get_profit_loss_report';

// Test data
const testCustomer = {
  name: 'John Doe',
  address: '123 Test St',
  phone: '+1234567890',
  email: 'john@example.com'
};

const testHotel = {
  name: 'Test Hotel',
  location: 'Test City',
  room_type: 'Double' as const,
  meal_package: 'Full Board' as const,
  cost_price: '100.00', // $100 per room per night
  markup_percentage: '20.00', // 20% markup
  selling_price: '120.00' // $120 per room per night
};

const testService = {
  name: 'Airport Transfer',
  cost_price: '30.00', // $30 cost
  markup_percentage: '25.00', // 25% markup
  selling_price: '37.50' // $37.50 selling price
};

describe('getProfitLossReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should generate profit/loss report for single booking without services', async () => {
    // Create prerequisite data
    const [customer] = await db.insert(customersTable).values(testCustomer).returning().execute();
    const [hotel] = await db.insert(hotelsTable).values(testHotel).returning().execute();

    // Create booking (2 rooms for 3 nights)
    const checkInDate = new Date('2024-01-01');
    const checkOutDate = new Date('2024-01-04'); // 3 nights
    const roomQuantity = 2;

    const hotelSubtotal = 120.00 * roomQuantity * 3; // $720
    const servicesTotal = 0;
    const totalAmount = hotelSubtotal + servicesTotal; // $720

    await db.insert(bookingsTable).values({
      invoice_number: 'INV-2024-001',
      customer_id: customer.id,
      hotel_id: hotel.id,
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      room_quantity: roomQuantity,
      hotel_subtotal: hotelSubtotal.toString(),
      services_total: servicesTotal.toString(),
      total_amount: totalAmount.toString()
    }).execute();

    const result = await getProfitLossReport();

    expect(result).toHaveLength(1);
    expect(result[0].invoice_number).toEqual('INV-2024-001');
    expect(result[0].customer_name).toEqual('John Doe');
    expect(result[0].total_revenue).toEqual(720.00);
    expect(result[0].total_cost).toEqual(600.00); // 100 * 2 rooms * 3 nights
    expect(result[0].profit).toEqual(120.00); // 720 - 600
    expect(result[0].booking_date).toBeInstanceOf(Date);
  });

  it('should generate profit/loss report for booking with services', async () => {
    // Create prerequisite data
    const [customer] = await db.insert(customersTable).values(testCustomer).returning().execute();
    const [hotel] = await db.insert(hotelsTable).values(testHotel).returning().execute();
    const [service] = await db.insert(servicesTable).values(testService).returning().execute();

    // Create booking
    const checkInDate = new Date('2024-01-01');
    const checkOutDate = new Date('2024-01-03'); // 2 nights
    const roomQuantity = 1;

    const hotelSubtotal = 120.00 * roomQuantity * 2; // $240
    const servicesTotal = 37.50 * 2; // 2 transfers at $37.50 each = $75
    const totalAmount = hotelSubtotal + servicesTotal; // $315

    const [booking] = await db.insert(bookingsTable).values({
      invoice_number: 'INV-2024-002',
      customer_id: customer.id,
      hotel_id: hotel.id,
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      room_quantity: roomQuantity,
      hotel_subtotal: hotelSubtotal.toString(),
      services_total: servicesTotal.toString(),
      total_amount: totalAmount.toString()
    }).returning().execute();

    // Add booking services
    await db.insert(bookingServicesTable).values({
      booking_id: booking.id,
      service_id: service.id,
      quantity: 2,
      unit_price: '37.50',
      total_price: '75.00'
    }).execute();

    const result = await getProfitLossReport();

    expect(result).toHaveLength(1);
    expect(result[0].invoice_number).toEqual('INV-2024-002');
    expect(result[0].customer_name).toEqual('John Doe');
    expect(result[0].total_revenue).toEqual(315.00);
    expect(result[0].total_cost).toEqual(260.00); // Hotel: 100*1*2=200, Service: 30*2=60
    expect(result[0].profit).toEqual(55.00); // 315 - 260
  });

  it('should filter report by date range', async () => {
    // Create prerequisite data
    const [customer] = await db.insert(customersTable).values(testCustomer).returning().execute();
    const [hotel] = await db.insert(hotelsTable).values(testHotel).returning().execute();

    // Create bookings on different dates
    const booking1Date = new Date('2024-01-15');
    const booking2Date = new Date('2024-02-15');

    // Booking 1 - within range
    await db.insert(bookingsTable).values({
      invoice_number: 'INV-2024-001',
      customer_id: customer.id,
      hotel_id: hotel.id,
      check_in_date: new Date('2024-01-20'),
      check_out_date: new Date('2024-01-22'),
      room_quantity: 1,
      hotel_subtotal: '240.00',
      services_total: '0.00',
      total_amount: '240.00',
      created_at: booking1Date
    }).execute();

    // Booking 2 - outside range
    await db.insert(bookingsTable).values({
      invoice_number: 'INV-2024-002',
      customer_id: customer.id,
      hotel_id: hotel.id,
      check_in_date: new Date('2024-02-20'),
      check_out_date: new Date('2024-02-22'),
      room_quantity: 1,
      hotel_subtotal: '240.00',
      services_total: '0.00',
      total_amount: '240.00',
      created_at: booking2Date
    }).execute();

    const dateRange: ReportDateRangeInput = {
      start_date: '2024-01-01',
      end_date: '2024-01-31'
    };

    const result = await getProfitLossReport(dateRange);

    expect(result).toHaveLength(1);
    expect(result[0].invoice_number).toEqual('INV-2024-001');
  });

  it('should return empty array when no bookings exist', async () => {
    const result = await getProfitLossReport();
    expect(result).toHaveLength(0);
  });

  it('should handle bookings with zero profit correctly', async () => {
    // Create prerequisite data
    const [customer] = await db.insert(customersTable).values(testCustomer).returning().execute();
    
    // Hotel with no markup (selling price = cost price)
    const [hotel] = await db.insert(hotelsTable).values({
      ...testHotel,
      cost_price: '100.00',
      markup_percentage: '0.00',
      selling_price: '100.00' // No profit margin
    }).returning().execute();

    await db.insert(bookingsTable).values({
      invoice_number: 'INV-2024-003',
      customer_id: customer.id,
      hotel_id: hotel.id,
      check_in_date: new Date('2024-01-01'),
      check_out_date: new Date('2024-01-02'), // 1 night
      room_quantity: 1,
      hotel_subtotal: '100.00',
      services_total: '0.00',
      total_amount: '100.00'
    }).execute();

    const result = await getProfitLossReport();

    expect(result).toHaveLength(1);
    expect(result[0].total_revenue).toEqual(100.00);
    expect(result[0].total_cost).toEqual(100.00);
    expect(result[0].profit).toEqual(0.00);
  });
});
