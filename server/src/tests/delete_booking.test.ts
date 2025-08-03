
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  customersTable, 
  hotelsTable, 
  servicesTable,
  bookingsTable, 
  bookingServicesTable, 
  paymentsTable, 
  expensesTable 
} from '../db/schema';
import { deleteBooking } from '../handlers/delete_booking';
import { eq } from 'drizzle-orm';

describe('deleteBooking', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let customerId: number;
  let hotelId: number;
  let serviceId: number;
  let bookingId: number;

  beforeEach(async () => {
    // Create prerequisite data
    const customer = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        address: '123 Test St',
        phone: '+1234567890',
        email: 'test@example.com'
      })
      .returning()
      .execute();
    customerId = customer[0].id;

    const hotel = await db.insert(hotelsTable)
      .values({
        name: 'Test Hotel',
        location: 'Test City',
        room_type: 'Double',
        meal_package: 'Full Board',
        cost_price: '100.00',
        markup_percentage: '20.00',
        selling_price: '120.00'
      })
      .returning()
      .execute();
    hotelId = hotel[0].id;

    const service = await db.insert(servicesTable)
      .values({
        name: 'Test Service',
        cost_price: '50.00',
        markup_percentage: '10.00',
        selling_price: '55.00'
      })
      .returning()
      .execute();
    serviceId = service[0].id;

    // Create booking
    const booking = await db.insert(bookingsTable)
      .values({
        invoice_number: 'INV-001',
        customer_id: customerId,
        hotel_id: hotelId,
        check_in_date: new Date('2024-01-15'),
        check_out_date: new Date('2024-01-20'),
        room_quantity: 2,
        hotel_subtotal: '240.00',
        services_total: '55.00',
        total_amount: '295.00'
      })
      .returning()
      .execute();
    bookingId = booking[0].id;
  });

  it('should delete a booking with no related records', async () => {
    const result = await deleteBooking(bookingId);

    expect(result).toBe(true);

    // Verify booking is deleted
    const bookings = await db.select()
      .from(bookingsTable)
      .where(eq(bookingsTable.id, bookingId))
      .execute();

    expect(bookings).toHaveLength(0);
  });

  it('should delete a booking and all related booking services', async () => {
    // Create booking service
    await db.insert(bookingServicesTable)
      .values({
        booking_id: bookingId,
        service_id: serviceId,
        quantity: 1,
        unit_price: '55.00',
        total_price: '55.00'
      })
      .execute();

    const result = await deleteBooking(bookingId);

    expect(result).toBe(true);

    // Verify booking is deleted
    const bookings = await db.select()
      .from(bookingsTable)
      .where(eq(bookingsTable.id, bookingId))
      .execute();

    expect(bookings).toHaveLength(0);

    // Verify booking services are deleted
    const bookingServices = await db.select()
      .from(bookingServicesTable)
      .where(eq(bookingServicesTable.booking_id, bookingId))
      .execute();

    expect(bookingServices).toHaveLength(0);
  });

  it('should delete a booking and all related payments', async () => {
    // Create payment
    await db.insert(paymentsTable)
      .values({
        booking_id: bookingId,
        amount: '100.00',
        currency: 'SAR',
        amount_in_sar: '100.00',
        payment_method: 'Cash'
      })
      .execute();

    const result = await deleteBooking(bookingId);

    expect(result).toBe(true);

    // Verify booking is deleted
    const bookings = await db.select()
      .from(bookingsTable)
      .where(eq(bookingsTable.id, bookingId))
      .execute();

    expect(bookings).toHaveLength(0);

    // Verify payments are deleted
    const payments = await db.select()
      .from(paymentsTable)
      .where(eq(paymentsTable.booking_id, bookingId))
      .execute();

    expect(payments).toHaveLength(0);
  });

  it('should delete a booking and all related expenses', async () => {
    // Create expense
    await db.insert(expensesTable)
      .values({
        booking_id: bookingId,
        name: 'Test Expense',
        amount: '50.00'
      })
      .execute();

    const result = await deleteBooking(bookingId);

    expect(result).toBe(true);

    // Verify booking is deleted
    const bookings = await db.select()
      .from(bookingsTable)
      .where(eq(bookingsTable.id, bookingId))
      .execute();

    expect(bookings).toHaveLength(0);

    // Verify expenses are deleted
    const expenses = await db.select()
      .from(expensesTable)
      .where(eq(expensesTable.booking_id, bookingId))
      .execute();

    expect(expenses).toHaveLength(0);
  });

  it('should delete a booking with all types of related records', async () => {
    // Create booking service
    await db.insert(bookingServicesTable)
      .values({
        booking_id: bookingId,
        service_id: serviceId,
        quantity: 1,
        unit_price: '55.00',
        total_price: '55.00'
      })
      .execute();

    // Create payment
    await db.insert(paymentsTable)
      .values({
        booking_id: bookingId,
        amount: '150.00',
        currency: 'SAR',
        amount_in_sar: '150.00',
        payment_method: 'Bank Transfer'
      })
      .execute();

    // Create expense
    await db.insert(expensesTable)
      .values({
        booking_id: bookingId,
        name: 'Travel Expense',
        amount: '25.00'
      })
      .execute();

    const result = await deleteBooking(bookingId);

    expect(result).toBe(true);

    // Verify all records are deleted
    const bookings = await db.select()
      .from(bookingsTable)
      .where(eq(bookingsTable.id, bookingId))
      .execute();

    const bookingServices = await db.select()
      .from(bookingServicesTable)
      .where(eq(bookingServicesTable.booking_id, bookingId))
      .execute();

    const payments = await db.select()
      .from(paymentsTable)
      .where(eq(paymentsTable.booking_id, bookingId))
      .execute();

    const expenses = await db.select()
      .from(expensesTable)
      .where(eq(expensesTable.booking_id, bookingId))
      .execute();

    expect(bookings).toHaveLength(0);
    expect(bookingServices).toHaveLength(0);
    expect(payments).toHaveLength(0);
    expect(expenses).toHaveLength(0);
  });

  it('should return false when booking does not exist', async () => {
    const nonExistentId = 99999;

    const result = await deleteBooking(nonExistentId);

    expect(result).toBe(false);
  });
});
