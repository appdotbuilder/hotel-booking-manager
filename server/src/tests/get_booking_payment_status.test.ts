
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, hotelsTable, bookingsTable, paymentsTable } from '../db/schema';
import { getBookingPaymentStatus } from '../handlers/get_booking_payment_status';

describe('getBookingPaymentStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return payment status for booking with no payments', async () => {
    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        address: '123 Test St',
        phone: '1234567890',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    // Create test hotel
    const hotelResult = await db.insert(hotelsTable)
      .values({
        name: 'Test Hotel',
        location: 'Test Location',
        room_type: 'Double',
        meal_package: 'Full Board',
        cost_price: '100.00',
        markup_percentage: '20.00',
        selling_price: '120.00'
      })
      .returning()
      .execute();

    // Create test booking
    const bookingResult = await db.insert(bookingsTable)
      .values({
        invoice_number: 'INV-001',
        customer_id: customerResult[0].id,
        hotel_id: hotelResult[0].id,
        check_in_date: new Date('2024-01-01'),
        check_out_date: new Date('2024-01-05'),
        room_quantity: 2,
        hotel_subtotal: '480.00',
        services_total: '120.00',
        total_amount: '600.00'
      })
      .returning()
      .execute();

    const result = await getBookingPaymentStatus(bookingResult[0].id);

    expect(result.booking_id).toEqual(bookingResult[0].id);
    expect(result.total_amount).toEqual(600);
    expect(result.total_paid).toEqual(0);
    expect(result.outstanding_balance).toEqual(600);
    expect(result.is_fully_paid).toBe(false);
  });

  it('should return payment status for booking with partial payment', async () => {
    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        address: '123 Test St',
        phone: '1234567890',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    // Create test hotel
    const hotelResult = await db.insert(hotelsTable)
      .values({
        name: 'Test Hotel',
        location: 'Test Location',
        room_type: 'Double',
        meal_package: 'Full Board',
        cost_price: '100.00',
        markup_percentage: '20.00',
        selling_price: '120.00'
      })
      .returning()
      .execute();

    // Create test booking
    const bookingResult = await db.insert(bookingsTable)
      .values({
        invoice_number: 'INV-002',
        customer_id: customerResult[0].id,
        hotel_id: hotelResult[0].id,
        check_in_date: new Date('2024-01-01'),
        check_out_date: new Date('2024-01-05'),
        room_quantity: 2,
        hotel_subtotal: '480.00',
        services_total: '120.00',
        total_amount: '600.00'
      })
      .returning()
      .execute();

    // Create partial payment
    await db.insert(paymentsTable)
      .values({
        booking_id: bookingResult[0].id,
        amount: '250.00',
        currency: 'SAR',
        amount_in_sar: '250.00',
        payment_method: 'Cash'
      })
      .execute();

    const result = await getBookingPaymentStatus(bookingResult[0].id);

    expect(result.booking_id).toEqual(bookingResult[0].id);
    expect(result.total_amount).toEqual(600);
    expect(result.total_paid).toEqual(250);
    expect(result.outstanding_balance).toEqual(350);
    expect(result.is_fully_paid).toBe(false);
  });

  it('should return payment status for fully paid booking', async () => {
    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        address: '123 Test St',
        phone: '1234567890',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    // Create test hotel
    const hotelResult = await db.insert(hotelsTable)
      .values({
        name: 'Test Hotel',
        location: 'Test Location',
        room_type: 'Double',
        meal_package: 'Full Board',
        cost_price: '100.00',
        markup_percentage: '20.00',
        selling_price: '120.00'
      })
      .returning()
      .execute();

    // Create test booking
    const bookingResult = await db.insert(bookingsTable)
      .values({
        invoice_number: 'INV-003',
        customer_id: customerResult[0].id,
        hotel_id: hotelResult[0].id,
        check_in_date: new Date('2024-01-01'),
        check_out_date: new Date('2024-01-05'),
        room_quantity: 2,
        hotel_subtotal: '480.00',
        services_total: '120.00',
        total_amount: '600.00'
      })
      .returning()
      .execute();

    // Create full payment
    await db.insert(paymentsTable)
      .values({
        booking_id: bookingResult[0].id,
        amount: '600.00',
        currency: 'SAR',
        amount_in_sar: '600.00',
        payment_method: 'Bank Transfer'
      })
      .execute();

    const result = await getBookingPaymentStatus(bookingResult[0].id);

    expect(result.booking_id).toEqual(bookingResult[0].id);
    expect(result.total_amount).toEqual(600);
    expect(result.total_paid).toEqual(600);
    expect(result.outstanding_balance).toEqual(0);
    expect(result.is_fully_paid).toBe(true);
  });

  it('should return payment status for booking with multiple payments', async () => {
    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        address: '123 Test St',
        phone: '1234567890',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    // Create test hotel
    const hotelResult = await db.insert(hotelsTable)
      .values({
        name: 'Test Hotel',
        location: 'Test Location',
        room_type: 'Double',
        meal_package: 'Full Board',
        cost_price: '100.00',
        markup_percentage: '20.00',
        selling_price: '120.00'
      })
      .returning()
      .execute();

    // Create test booking
    const bookingResult = await db.insert(bookingsTable)
      .values({
        invoice_number: 'INV-004',
        customer_id: customerResult[0].id,
        hotel_id: hotelResult[0].id,
        check_in_date: new Date('2024-01-01'),
        check_out_date: new Date('2024-01-05'),
        room_quantity: 2,
        hotel_subtotal: '480.00',
        services_total: '120.00',
        total_amount: '600.00'
      })
      .returning()
      .execute();

    // Create multiple payments
    await db.insert(paymentsTable)
      .values([
        {
          booking_id: bookingResult[0].id,
          amount: '200.00',
          currency: 'SAR',
          amount_in_sar: '200.00',
          payment_method: 'Cash'
        },
        {
          booking_id: bookingResult[0].id,
          amount: '150.00',
          currency: 'SAR',
          amount_in_sar: '150.00',
          payment_method: 'Credit Card'
        },
        {
          booking_id: bookingResult[0].id,
          amount: '100.00',
          currency: 'SAR',
          amount_in_sar: '100.00',
          payment_method: 'Bank Transfer'
        }
      ])
      .execute();

    const result = await getBookingPaymentStatus(bookingResult[0].id);

    expect(result.booking_id).toEqual(bookingResult[0].id);
    expect(result.total_amount).toEqual(600);
    expect(result.total_paid).toEqual(450);
    expect(result.outstanding_balance).toEqual(150);
    expect(result.is_fully_paid).toBe(false);
  });

  it('should throw error for non-existent booking', async () => {
    expect(getBookingPaymentStatus(999)).rejects.toThrow(/Booking with ID 999 not found/);
  });
});
