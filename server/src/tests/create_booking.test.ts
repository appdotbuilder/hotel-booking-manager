
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, hotelsTable, servicesTable, bookingsTable, bookingServicesTable } from '../db/schema';
import { type CreateBookingInput } from '../schema';
import { createBooking } from '../handlers/create_booking';
import { eq } from 'drizzle-orm';

describe('createBooking', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let customerId: number;
  let hotelId: number;
  let serviceId: number;

  beforeEach(async () => {
    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        address: 'Test Address',
        phone: '1234567890',
        email: 'test@example.com'
      })
      .returning()
      .execute();
    customerId = customerResult[0].id;

    // Create test hotel
    const hotelResult = await db.insert(hotelsTable)
      .values({
        name: 'Test Hotel',
        location: 'Test Location',
        room_type: 'Double',
        meal_package: 'Full Board',
        cost_price: '100.00',
        markup_percentage: '20.00',
        selling_price: '120.00' // cost_price + markup
      })
      .returning()
      .execute();
    hotelId = hotelResult[0].id;

    // Create test service
    const serviceResult = await db.insert(servicesTable)
      .values({
        name: 'Airport Transfer',
        cost_price: '30.00',
        markup_percentage: '10.00',
        selling_price: '33.00' // cost_price + markup
      })
      .returning()
      .execute();
    serviceId = serviceResult[0].id;
  });

  it('should create a booking without services', async () => {
    const testInput: CreateBookingInput = {
      customer_id: customerId,
      hotel_id: hotelId,
      check_in_date: '2024-01-15',
      check_out_date: '2024-01-18', // 3 nights
      room_quantity: 2
    };

    const result = await createBooking(testInput);

    // Basic field validation
    expect(result.customer_id).toEqual(customerId);
    expect(result.hotel_id).toEqual(hotelId);
    expect(result.room_quantity).toEqual(2);
    expect(result.check_in_date).toEqual(new Date('2024-01-15'));
    expect(result.check_out_date).toEqual(new Date('2024-01-18'));
    expect(result.id).toBeDefined();
    expect(result.invoice_number).toMatch(/^INV-\d+/);
    expect(result.created_at).toBeInstanceOf(Date);

    // Numeric field types
    expect(typeof result.hotel_subtotal).toBe('number');
    expect(typeof result.services_total).toBe('number');
    expect(typeof result.total_amount).toBe('number');

    // Calculate expected values: hotel_price(120) * room_quantity(2) * nights(3) = 720
    expect(result.hotel_subtotal).toEqual(720);
    expect(result.services_total).toEqual(0);
    expect(result.total_amount).toEqual(720);
  });

  it('should create a booking with services', async () => {
    const testInput: CreateBookingInput = {
      customer_id: customerId,
      hotel_id: hotelId,
      check_in_date: '2024-01-15',
      check_out_date: '2024-01-17', // 2 nights
      room_quantity: 1,
      services: [
        {
          service_id: serviceId,
          quantity: 2
        }
      ]
    };

    const result = await createBooking(testInput);

    // Calculate expected values
    // Hotel: 120 * 1 room * 2 nights = 240
    // Services: 33 * 2 quantity = 66
    // Total: 240 + 66 = 306
    expect(result.hotel_subtotal).toEqual(240);
    expect(result.services_total).toEqual(66);
    expect(result.total_amount).toEqual(306);
  });

  it('should save booking to database', async () => {
    const testInput: CreateBookingInput = {
      customer_id: customerId,
      hotel_id: hotelId,
      check_in_date: '2024-01-15',
      check_out_date: '2024-01-16', // 1 night
      room_quantity: 1
    };

    const result = await createBooking(testInput);

    // Query booking from database
    const bookings = await db.select()
      .from(bookingsTable)
      .where(eq(bookingsTable.id, result.id))
      .execute();

    expect(bookings).toHaveLength(1);
    const booking = bookings[0];
    expect(booking.customer_id).toEqual(customerId);
    expect(booking.hotel_id).toEqual(hotelId);
    expect(booking.invoice_number).toEqual(result.invoice_number);
    expect(parseFloat(booking.hotel_subtotal)).toEqual(120); // 120 * 1 * 1
    expect(parseFloat(booking.services_total)).toEqual(0);
    expect(parseFloat(booking.total_amount)).toEqual(120);
  });

  it('should save booking services to database', async () => {
    const testInput: CreateBookingInput = {
      customer_id: customerId,
      hotel_id: hotelId,
      check_in_date: '2024-01-15',
      check_out_date: '2024-01-16', // 1 night
      room_quantity: 1,
      services: [
        {
          service_id: serviceId,
          quantity: 3
        }
      ]
    };

    const result = await createBooking(testInput);

    // Query booking services from database
    const bookingServices = await db.select()
      .from(bookingServicesTable)
      .where(eq(bookingServicesTable.booking_id, result.id))
      .execute();

    expect(bookingServices).toHaveLength(1);
    const bookingService = bookingServices[0];
    expect(bookingService.service_id).toEqual(serviceId);
    expect(bookingService.quantity).toEqual(3);
    expect(parseFloat(bookingService.unit_price)).toEqual(33);
    expect(parseFloat(bookingService.total_price)).toEqual(99); // 33 * 3
  });

  it('should throw error for invalid customer', async () => {
    const testInput: CreateBookingInput = {
      customer_id: 999999,
      hotel_id: hotelId,
      check_in_date: '2024-01-15',
      check_out_date: '2024-01-16',
      room_quantity: 1
    };

    expect(createBooking(testInput)).rejects.toThrow(/customer not found/i);
  });

  it('should throw error for invalid hotel', async () => {
    const testInput: CreateBookingInput = {
      customer_id: customerId,
      hotel_id: 999999,
      check_in_date: '2024-01-15',
      check_out_date: '2024-01-16',
      room_quantity: 1
    };

    expect(createBooking(testInput)).rejects.toThrow(/hotel not found/i);
  });

  it('should throw error for invalid service', async () => {
    const testInput: CreateBookingInput = {
      customer_id: customerId,
      hotel_id: hotelId,
      check_in_date: '2024-01-15',
      check_out_date: '2024-01-16',
      room_quantity: 1,
      services: [
        {
          service_id: 999999,
          quantity: 1
        }
      ]
    };

    expect(createBooking(testInput)).rejects.toThrow(/service.*not found/i);
  });

  it('should throw error for invalid date range', async () => {
    const testInput: CreateBookingInput = {
      customer_id: customerId,
      hotel_id: hotelId,
      check_in_date: '2024-01-18',
      check_out_date: '2024-01-15', // Check-out before check-in
      room_quantity: 1
    };

    expect(createBooking(testInput)).rejects.toThrow(/check-out date must be after check-in date/i);
  });
});
