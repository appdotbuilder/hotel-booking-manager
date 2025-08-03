
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, hotelsTable, servicesTable, bookingsTable, bookingServicesTable, paymentsTable } from '../db/schema';
import { getDashboardStats } from '../handlers/get_dashboard_stats';

describe('getDashboardStats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return zero stats for empty database', async () => {
    const result = await getDashboardStats();

    expect(result.total_customers).toEqual(0);
    expect(result.total_bookings).toEqual(0);
    expect(result.total_profit).toEqual(0);
    expect(result.unpaid_bookings).toEqual(0);
  });

  it('should calculate correct stats with sample data', async () => {
    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'John Doe',
        address: '123 Main St',
        phone: '+1234567890',
        email: 'john@example.com'
      })
      .returning()
      .execute();
    const customerId = customerResult[0].id;

    // Create test hotel
    const hotelResult = await db.insert(hotelsTable)
      .values({
        name: 'Grand Hotel',
        location: 'Riyadh',
        room_type: 'Double',
        meal_package: 'Full Board',
        cost_price: '100.00', // Cost price per night
        markup_percentage: '20.00',
        selling_price: '120.00' // Selling price per night
      })
      .returning()
      .execute();
    const hotelId = hotelResult[0].id;

    // Create test service
    const serviceResult = await db.insert(servicesTable)
      .values({
        name: 'Airport Transfer',
        cost_price: '30.00',
        markup_percentage: '25.00',
        selling_price: '37.50'
      })
      .returning()
      .execute();
    const serviceId = serviceResult[0].id;

    // Create test booking (2 nights, 1 room)
    const checkInDate = new Date('2024-01-01');
    const checkOutDate = new Date('2024-01-03'); // 2 nights
    const bookingResult = await db.insert(bookingsTable)
      .values({
        invoice_number: 'INV-001',
        customer_id: customerId,
        hotel_id: hotelId,
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        room_quantity: 1,
        hotel_subtotal: '240.00', // 2 nights * 120 per night
        services_total: '37.50',
        total_amount: '277.50'
      })
      .returning()
      .execute();
    const bookingId = bookingResult[0].id;

    // Add booking service
    await db.insert(bookingServicesTable)
      .values({
        booking_id: bookingId,
        service_id: serviceId,
        quantity: 1,
        unit_price: '37.50',
        total_price: '37.50'
      })
      .execute();

    // Add partial payment (unpaid booking)
    await db.insert(paymentsTable)
      .values({
        booking_id: bookingId,
        amount: '150.00',
        currency: 'SAR',
        amount_in_sar: '150.00',
        payment_method: 'Cash'
      })
      .execute();

    const result = await getDashboardStats();

    expect(result.total_customers).toEqual(1);
    expect(result.total_bookings).toEqual(1);
    // Total profit = Revenue (277.50) - Hotel cost (2 nights * 100) - Service cost (30) = 277.50 - 200 - 30 = 47.50
    expect(result.total_profit).toBeCloseTo(47.50, 2);
    expect(result.unpaid_bookings).toEqual(1); // Paid 150, owes 277.50
  });

  it('should handle fully paid bookings correctly', async () => {
    // Create prerequisite data
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Jane Smith',
        address: '456 Oak Ave',
        phone: '+1987654321',
        email: 'jane@example.com'
      })
      .returning()
      .execute();
    const customerId = customerResult[0].id;

    const hotelResult = await db.insert(hotelsTable)
      .values({
        name: 'Budget Inn',
        location: 'Jeddah',
        room_type: 'Triple',
        meal_package: 'Half Board',
        cost_price: '80.00',
        markup_percentage: '15.00',
        selling_price: '92.00'
      })
      .returning()
      .execute();
    const hotelId = hotelResult[0].id;

    // Create booking (1 night)
    const bookingResult = await db.insert(bookingsTable)
      .values({
        invoice_number: 'INV-002',
        customer_id: customerId,
        hotel_id: hotelId,
        check_in_date: new Date('2024-02-01'),
        check_out_date: new Date('2024-02-02'),
        room_quantity: 2,
        hotel_subtotal: '184.00', // 1 night * 92 per night * 2 rooms
        services_total: '0.00',
        total_amount: '184.00'
      })
      .returning()
      .execute();
    const bookingId = bookingResult[0].id;

    // Add full payment
    await db.insert(paymentsTable)
      .values({
        booking_id: bookingId,
        amount: '184.00',
        currency: 'SAR',
        amount_in_sar: '184.00',
        payment_method: 'Bank Transfer'
      })
      .execute();

    const result = await getDashboardStats();

    expect(result.total_customers).toEqual(1);
    expect(result.total_bookings).toEqual(1);
    // Total profit = Revenue (184) - Hotel cost (1 night * 80 * 2 rooms) = 184 - 160 = 24
    expect(result.total_profit).toBeCloseTo(24.00, 2);
    expect(result.unpaid_bookings).toEqual(0); // Fully paid
  });

  it('should handle multiple customers and bookings', async () => {
    // Create multiple customers
    const customer1Result = await db.insert(customersTable)
      .values({
        name: 'Customer 1',
        address: 'Address 1',
        phone: '+1111111111',
        email: 'customer1@example.com'
      })
      .returning()
      .execute();

    const customer2Result = await db.insert(customersTable)
      .values({
        name: 'Customer 2',
        address: 'Address 2',
        phone: '+2222222222',
        email: 'customer2@example.com'
      })
      .returning()
      .execute();

    const hotelResult = await db.insert(hotelsTable)
      .values({
        name: 'Test Hotel',
        location: 'Test Location',
        room_type: 'Quad',
        meal_package: 'Full Board',
        cost_price: '50.00',
        markup_percentage: '30.00',
        selling_price: '65.00'
      })
      .returning()
      .execute();
    const hotelId = hotelResult[0].id;

    // Create multiple bookings
    await db.insert(bookingsTable)
      .values([
        {
          invoice_number: 'INV-003',
          customer_id: customer1Result[0].id,
          hotel_id: hotelId,
          check_in_date: new Date('2024-03-01'),
          check_out_date: new Date('2024-03-02'),
          room_quantity: 1,
          hotel_subtotal: '65.00',
          services_total: '0.00',
          total_amount: '65.00'
        },
        {
          invoice_number: 'INV-004',
          customer_id: customer2Result[0].id,
          hotel_id: hotelId,
          check_in_date: new Date('2024-03-05'),
          check_out_date: new Date('2024-03-06'),
          room_quantity: 1,
          hotel_subtotal: '65.00',
          services_total: '0.00',
          total_amount: '65.00'
        }
      ])
      .execute();

    const result = await getDashboardStats();

    expect(result.total_customers).toEqual(2);
    expect(result.total_bookings).toEqual(2);
    // Total profit = Revenue (130) - Hotel cost (2 nights * 50) = 130 - 100 = 30
    expect(result.total_profit).toBeCloseTo(30.00, 2);
    expect(result.unpaid_bookings).toEqual(2); // Both unpaid
  });
});
