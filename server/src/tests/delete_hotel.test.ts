
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { hotelsTable, customersTable, bookingsTable } from '../db/schema';
import { type CreateHotelInput, type CreateCustomerInput, type CreateBookingInput } from '../schema';
import { deleteHotel } from '../handlers/delete_hotel';
import { eq } from 'drizzle-orm';

// Test hotel input
const testHotel: CreateHotelInput = {
  name: 'Test Hotel',
  location: 'Test Location',
  room_type: 'Double',
  meal_package: 'Full Board',
  cost_price: 100,
  markup_percentage: 20
};

// Test customer input
const testCustomer: CreateCustomerInput = {
  name: 'Test Customer',
  address: 'Test Address',
  phone: '1234567890',
  email: 'test@example.com'
};

describe('deleteHotel', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete hotel successfully', async () => {
    // Create a hotel first
    const hotelResult = await db.insert(hotelsTable)
      .values({
        ...testHotel,
        cost_price: testHotel.cost_price.toString(),
        markup_percentage: testHotel.markup_percentage.toString(),
        selling_price: (testHotel.cost_price * (1 + testHotel.markup_percentage / 100)).toString()
      })
      .returning()
      .execute();

    const hotelId = hotelResult[0].id;

    // Delete the hotel
    const result = await deleteHotel(hotelId);
    expect(result).toBe(true);

    // Verify hotel is deleted
    const hotels = await db.select()
      .from(hotelsTable)
      .where(eq(hotelsTable.id, hotelId))
      .execute();

    expect(hotels).toHaveLength(0);
  });

  it('should throw error when hotel not found', async () => {
    const nonExistentId = 999;

    expect(deleteHotel(nonExistentId)).rejects.toThrow(/hotel not found/i);
  });

  it('should throw error when hotel has related bookings', async () => {
    // Create customer first
    const customerResult = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();

    const customerId = customerResult[0].id;

    // Create hotel
    const hotelResult = await db.insert(hotelsTable)
      .values({
        ...testHotel,
        cost_price: testHotel.cost_price.toString(),
        markup_percentage: testHotel.markup_percentage.toString(),
        selling_price: (testHotel.cost_price * (1 + testHotel.markup_percentage / 100)).toString()
      })
      .returning()
      .execute();

    const hotelId = hotelResult[0].id;

    // Create booking with this hotel
    await db.insert(bookingsTable)
      .values({
        invoice_number: 'INV-001',
        customer_id: customerId,
        hotel_id: hotelId,
        check_in_date: new Date('2024-01-01'),
        check_out_date: new Date('2024-01-05'),
        room_quantity: 1,
        hotel_subtotal: '120.00',
        services_total: '0.00',
        total_amount: '120.00'
      })
      .execute();

    // Try to delete the hotel
    expect(deleteHotel(hotelId)).rejects.toThrow(/cannot delete hotel with existing bookings/i);

    // Verify hotel still exists
    const hotels = await db.select()
      .from(hotelsTable)
      .where(eq(hotelsTable.id, hotelId))
      .execute();

    expect(hotels).toHaveLength(1);
  });

  it('should verify hotel data before deletion', async () => {
    // Create hotel
    const hotelResult = await db.insert(hotelsTable)
      .values({
        ...testHotel,
        cost_price: testHotel.cost_price.toString(),
        markup_percentage: testHotel.markup_percentage.toString(),
        selling_price: (testHotel.cost_price * (1 + testHotel.markup_percentage / 100)).toString()
      })
      .returning()
      .execute();

    const hotelId = hotelResult[0].id;

    // Verify hotel exists before deletion
    const hotelsBeforeDeletion = await db.select()
      .from(hotelsTable)
      .where(eq(hotelsTable.id, hotelId))
      .execute();

    expect(hotelsBeforeDeletion).toHaveLength(1);
    expect(hotelsBeforeDeletion[0].name).toEqual('Test Hotel');

    // Delete the hotel
    const result = await deleteHotel(hotelId);
    expect(result).toBe(true);

    // Verify hotel is deleted
    const hotelsAfterDeletion = await db.select()
      .from(hotelsTable)
      .where(eq(hotelsTable.id, hotelId))
      .execute();

    expect(hotelsAfterDeletion).toHaveLength(0);
  });
});
