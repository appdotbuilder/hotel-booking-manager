
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, hotelsTable, servicesTable, bookingsTable, bookingServicesTable } from '../db/schema';
import { type CreateBookingInput } from '../schema';
import { updateBooking } from '../handlers/update_booking';
import { eq } from 'drizzle-orm';

describe('updateBooking', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testCustomerId: number;
  let testHotelId: number;
  let testServiceId: number;
  let testBookingId: number;

  beforeEach(async () => {
    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        address: 'Test Address',
        phone: '123456789',
        email: 'test@example.com'
      })
      .returning()
      .execute();
    testCustomerId = customerResult[0].id;

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
    testHotelId = hotelResult[0].id;

    // Create test service
    const serviceResult = await db.insert(servicesTable)
      .values({
        name: 'Test Service',
        cost_price: '50.00',
        markup_percentage: '10.00',
        selling_price: '55.00'
      })
      .returning()
      .execute();
    testServiceId = serviceResult[0].id;

    // Create test booking
    const bookingResult = await db.insert(bookingsTable)
      .values({
        invoice_number: 'INV-001',
        customer_id: testCustomerId,
        hotel_id: testHotelId,
        check_in_date: new Date('2024-01-01'),
        check_out_date: new Date('2024-01-03'),
        room_quantity: 1,
        hotel_subtotal: '240.00', // 120 * 1 room * 2 nights
        services_total: '0.00',
        total_amount: '240.00'
      })
      .returning()
      .execute();
    testBookingId = bookingResult[0].id;
  });

  it('should update booking room quantity and recalculate totals', async () => {
    const updateInput: Partial<CreateBookingInput> = {
      room_quantity: 2
    };

    const result = await updateBooking(testBookingId, updateInput);

    expect(result.id).toEqual(testBookingId);
    expect(result.room_quantity).toEqual(2);
    expect(result.hotel_subtotal).toEqual(480); // 120 * 2 rooms * 2 nights
    expect(result.services_total).toEqual(0);
    expect(result.total_amount).toEqual(480);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update booking dates and recalculate totals', async () => {
    const updateInput: Partial<CreateBookingInput> = {
      check_in_date: '2024-01-01',
      check_out_date: '2024-01-05' // 4 nights instead of 2
    };

    const result = await updateBooking(testBookingId, updateInput);

    expect(result.hotel_subtotal).toEqual(480); // 120 * 1 room * 4 nights
    expect(result.total_amount).toEqual(480);
    expect(result.check_in_date).toEqual(new Date('2024-01-01'));
    expect(result.check_out_date).toEqual(new Date('2024-01-05'));
  });

  it('should update booking services and recalculate totals', async () => {
    const updateInput: Partial<CreateBookingInput> = {
      services: [
        {
          service_id: testServiceId,
          quantity: 2
        }
      ]
    };

    const result = await updateBooking(testBookingId, updateInput);

    expect(result.services_total).toEqual(110); // 55 * 2
    expect(result.total_amount).toEqual(350); // 240 (hotel) + 110 (services)

    // Verify booking service was created
    const bookingServices = await db.select()
      .from(bookingServicesTable)
      .where(eq(bookingServicesTable.booking_id, testBookingId))
      .execute();

    expect(bookingServices).toHaveLength(1);
    expect(bookingServices[0].service_id).toEqual(testServiceId);
    expect(bookingServices[0].quantity).toEqual(2);
    expect(parseFloat(bookingServices[0].unit_price)).toEqual(55);
    expect(parseFloat(bookingServices[0].total_price)).toEqual(110);
  });

  it('should replace existing services when updating', async () => {
    // First add a service
    await db.insert(bookingServicesTable)
      .values({
        booking_id: testBookingId,
        service_id: testServiceId,
        quantity: 1,
        unit_price: '55.00',
        total_price: '55.00'
      })
      .execute();

    // Update booking with new services
    const updateInput: Partial<CreateBookingInput> = {
      services: [
        {
          service_id: testServiceId,
          quantity: 3
        }
      ]
    };

    const result = await updateBooking(testBookingId, updateInput);

    expect(result.services_total).toEqual(165); // 55 * 3

    // Verify only new booking service exists
    const bookingServices = await db.select()
      .from(bookingServicesTable)
      .where(eq(bookingServicesTable.booking_id, testBookingId))
      .execute();

    expect(bookingServices).toHaveLength(1);
    expect(bookingServices[0].quantity).toEqual(3);
    expect(parseFloat(bookingServices[0].total_price)).toEqual(165);
  });

  it('should update customer_id', async () => {
    // Create another customer
    const anotherCustomerResult = await db.insert(customersTable)
      .values({
        name: 'Another Customer',
        address: 'Another Address',
        phone: '987654321',
        email: 'another@example.com'
      })
      .returning()
      .execute();

    const updateInput: Partial<CreateBookingInput> = {
      customer_id: anotherCustomerResult[0].id
    };

    const result = await updateBooking(testBookingId, updateInput);

    expect(result.customer_id).toEqual(anotherCustomerResult[0].id);
  });

  it('should update hotel_id and recalculate totals', async () => {
    // Create another hotel with different price
    const anotherHotelResult = await db.insert(hotelsTable)
      .values({
        name: 'Expensive Hotel',
        location: 'Premium Location',
        room_type: 'Triple',
        meal_package: 'Half Board',
        cost_price: '200.00',
        markup_percentage: '25.00',
        selling_price: '250.00'
      })
      .returning()
      .execute();

    const updateInput: Partial<CreateBookingInput> = {
      hotel_id: anotherHotelResult[0].id
    };

    const result = await updateBooking(testBookingId, updateInput);

    expect(result.hotel_id).toEqual(anotherHotelResult[0].id);
    expect(result.hotel_subtotal).toEqual(500); // 250 * 1 room * 2 nights
    expect(result.total_amount).toEqual(500);
  });

  it('should throw error when booking not found', async () => {
    const updateInput: Partial<CreateBookingInput> = {
      room_quantity: 2
    };

    expect(updateBooking(99999, updateInput)).rejects.toThrow(/booking not found/i);
  });

  it('should throw error when customer not found', async () => {
    const updateInput: Partial<CreateBookingInput> = {
      customer_id: 99999
    };

    expect(updateBooking(testBookingId, updateInput)).rejects.toThrow(/customer not found/i);
  });

  it('should throw error when hotel not found', async () => {
    const updateInput: Partial<CreateBookingInput> = {
      hotel_id: 99999
    };

    expect(updateBooking(testBookingId, updateInput)).rejects.toThrow(/hotel not found/i);
  });

  it('should throw error when service not found', async () => {
    const updateInput: Partial<CreateBookingInput> = {
      services: [
        {
          service_id: 99999,
          quantity: 1
        }
      ]
    };

    expect(updateBooking(testBookingId, updateInput)).rejects.toThrow(/service.*not found/i);
  });

  it('should save updated booking to database', async () => {
    const updateInput: Partial<CreateBookingInput> = {
      room_quantity: 3,
      services: [
        {
          service_id: testServiceId,
          quantity: 1
        }
      ]
    };

    const result = await updateBooking(testBookingId, updateInput);

    // Verify in database
    const bookings = await db.select()
      .from(bookingsTable)
      .where(eq(bookingsTable.id, testBookingId))
      .execute();

    expect(bookings).toHaveLength(1);
    const dbBooking = bookings[0];
    expect(dbBooking.room_quantity).toEqual(3);
    expect(parseFloat(dbBooking.hotel_subtotal)).toEqual(720); // 120 * 3 rooms * 2 nights
    expect(parseFloat(dbBooking.services_total)).toEqual(55);
    expect(parseFloat(dbBooking.total_amount)).toEqual(775);
    expect(dbBooking.updated_at).toBeInstanceOf(Date);
  });
});
