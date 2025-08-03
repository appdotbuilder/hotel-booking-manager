
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { paymentsTable, bookingsTable, customersTable, hotelsTable, currencyConversionsTable } from '../db/schema';
import { type CreatePaymentInput } from '../schema';
import { createPayment } from '../handlers/create_payment';
import { eq } from 'drizzle-orm';

describe('createPayment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a payment in SAR currency', async () => {
    // Create prerequisite data
    const customer = await db.insert(customersTable)
      .values({
        name: 'John Doe',
        address: '123 Main St',
        phone: '1234567890',
        email: 'john@example.com'
      })
      .returning()
      .execute();

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

    const booking = await db.insert(bookingsTable)
      .values({
        invoice_number: 'INV-001',
        customer_id: customer[0].id,
        hotel_id: hotel[0].id,
        check_in_date: new Date('2024-01-01'),
        check_out_date: new Date('2024-01-05'),
        room_quantity: 2,
        hotel_subtotal: '480.00',
        services_total: '0.00',
        total_amount: '480.00'
      })
      .returning()
      .execute();

    const testInput: CreatePaymentInput = {
      booking_id: booking[0].id,
      amount: 240.00,
      currency: 'SAR',
      payment_method: 'Cash'
    };

    const result = await createPayment(testInput);

    // Basic field validation
    expect(result.booking_id).toEqual(booking[0].id);
    expect(result.amount).toEqual(240.00);
    expect(result.currency).toEqual('SAR');
    expect(result.amount_in_sar).toEqual(240.00); // Same as amount for SAR
    expect(result.payment_method).toEqual('Cash');
    expect(result.id).toBeDefined();
    expect(result.payment_date).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a payment with currency conversion', async () => {
    // Create prerequisite data
    const customer = await db.insert(customersTable)
      .values({
        name: 'Jane Doe',
        address: '456 Oak Ave',
        phone: '0987654321',
        email: 'jane@example.com'
      })
      .returning()
      .execute();

    const hotel = await db.insert(hotelsTable)
      .values({
        name: 'Another Hotel',
        location: 'Another City',
        room_type: 'Triple',
        meal_package: 'Half Board',
        cost_price: '80.00',
        markup_percentage: '25.00',
        selling_price: '100.00'
      })
      .returning()
      .execute();

    const booking = await db.insert(bookingsTable)
      .values({
        invoice_number: 'INV-002',
        customer_id: customer[0].id,
        hotel_id: hotel[0].id,
        check_in_date: new Date('2024-02-01'),
        check_out_date: new Date('2024-02-03'),
        room_quantity: 1,
        hotel_subtotal: '200.00',
        services_total: '50.00',
        total_amount: '250.00'
      })
      .returning()
      .execute();

    // Create currency conversion rate
    await db.insert(currencyConversionsTable)
      .values({
        currency_name: 'USD',
        conversion_rate: '3.7500' // 1 USD = 3.75 SAR
      })
      .execute();

    const testInput: CreatePaymentInput = {
      booking_id: booking[0].id,
      amount: 100.00, // $100 USD
      currency: 'USD',
      payment_method: 'Bank Transfer'
    };

    const result = await createPayment(testInput);

    // Validate currency conversion
    expect(result.amount).toEqual(100.00);
    expect(result.currency).toEqual('USD');
    expect(result.amount_in_sar).toEqual(375.00); // 100 * 3.75
    expect(result.payment_method).toEqual('Bank Transfer');
  });

  it('should save payment to database', async () => {
    // Create prerequisite data
    const customer = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        address: 'Test Address',
        phone: '1111111111',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    const hotel = await db.insert(hotelsTable)
      .values({
        name: 'DB Test Hotel',
        location: 'DB Test City',
        room_type: 'Quad',
        meal_package: 'Full Board',
        cost_price: '150.00',
        markup_percentage: '15.00',
        selling_price: '172.50'
      })
      .returning()
      .execute();

    const booking = await db.insert(bookingsTable)
      .values({
        invoice_number: 'INV-DB-001',
        customer_id: customer[0].id,
        hotel_id: hotel[0].id,
        check_in_date: new Date('2024-03-01'),
        check_out_date: new Date('2024-03-04'),
        room_quantity: 3,
        hotel_subtotal: '517.50',
        services_total: '0.00',
        total_amount: '517.50'
      })
      .returning()
      .execute();

    const testInput: CreatePaymentInput = {
      booking_id: booking[0].id,
      amount: 500.00,
      currency: 'SAR',
      payment_method: 'Credit Card'
    };

    const result = await createPayment(testInput);

    // Query database to verify payment was saved
    const payments = await db.select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, result.id))
      .execute();

    expect(payments).toHaveLength(1);
    expect(payments[0].booking_id).toEqual(booking[0].id);
    expect(parseFloat(payments[0].amount)).toEqual(500.00);
    expect(payments[0].currency).toEqual('SAR');
    expect(parseFloat(payments[0].amount_in_sar)).toEqual(500.00);
    expect(payments[0].payment_method).toEqual('Credit Card');
    expect(payments[0].payment_date).toBeInstanceOf(Date);
    expect(payments[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent booking', async () => {
    const testInput: CreatePaymentInput = {
      booking_id: 999, // Non-existent booking ID
      amount: 100.00,
      currency: 'SAR',
      payment_method: 'Cash'
    };

    expect(createPayment(testInput)).rejects.toThrow(/booking with id 999 not found/i);
  });

  it('should throw error for missing currency conversion rate', async () => {
    // Create prerequisite data
    const customer = await db.insert(customersTable)
      .values({
        name: 'Currency Test Customer',
        address: 'Currency Test Address',
        phone: '2222222222',
        email: 'currency@example.com'
      })
      .returning()
      .execute();

    const hotel = await db.insert(hotelsTable)
      .values({
        name: 'Currency Test Hotel',
        location: 'Currency Test City',
        room_type: 'Double',
        meal_package: 'Half Board',
        cost_price: '90.00',
        markup_percentage: '10.00',
        selling_price: '99.00'
      })
      .returning()
      .execute();

    const booking = await db.insert(bookingsTable)
      .values({
        invoice_number: 'INV-CURR-001',
        customer_id: customer[0].id,
        hotel_id: hotel[0].id,
        check_in_date: new Date('2024-04-01'),
        check_out_date: new Date('2024-04-02'),
        room_quantity: 1,
        hotel_subtotal: '99.00',
        services_total: '0.00',
        total_amount: '99.00'
      })
      .returning()
      .execute();

    const testInput: CreatePaymentInput = {
      booking_id: booking[0].id,
      amount: 50.00,
      currency: 'IDR', // No conversion rate exists for IDR
      payment_method: 'Cash'
    };

    expect(createPayment(testInput)).rejects.toThrow(/currency conversion rate for IDR not found/i);
  });
});
