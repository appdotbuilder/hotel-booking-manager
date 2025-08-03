
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { hotelsTable } from '../db/schema';
import { type CreateHotelInput, type UpdateHotelInput } from '../schema';
import { updateHotel } from '../handlers/update_hotel';
import { eq } from 'drizzle-orm';

// Helper function to create a test hotel
const createTestHotel = async (): Promise<number> => {
  const testHotelInput: CreateHotelInput = {
    name: 'Test Hotel',
    location: 'Test Location',
    room_type: 'Double',
    meal_package: 'Full Board',
    cost_price: 100,
    markup_percentage: 20
  };

  const selling_price = testHotelInput.cost_price + (testHotelInput.markup_percentage / 100 * testHotelInput.cost_price);

  const result = await db.insert(hotelsTable)
    .values({
      name: testHotelInput.name,
      location: testHotelInput.location,
      room_type: testHotelInput.room_type,
      meal_package: testHotelInput.meal_package,
      cost_price: testHotelInput.cost_price.toString(),
      markup_percentage: testHotelInput.markup_percentage.toString(),
      selling_price: selling_price.toString()
    })
    .returning()
    .execute();

  return result[0].id;
};

describe('updateHotel', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update hotel basic information', async () => {
    const hotelId = await createTestHotel();
    
    const updateInput: UpdateHotelInput = {
      id: hotelId,
      name: 'Updated Hotel Name',
      location: 'Updated Location'
    };

    const result = await updateHotel(updateInput);

    expect(result.id).toEqual(hotelId);
    expect(result.name).toEqual('Updated Hotel Name');
    expect(result.location).toEqual('Updated Location');
    expect(result.room_type).toEqual('Double'); // Should remain unchanged
    expect(result.meal_package).toEqual('Full Board'); // Should remain unchanged
    expect(result.cost_price).toEqual(100); // Should remain unchanged
    expect(result.markup_percentage).toEqual(20); // Should remain unchanged
    expect(result.selling_price).toEqual(120); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update room type and meal package', async () => {
    const hotelId = await createTestHotel();
    
    const updateInput: UpdateHotelInput = {
      id: hotelId,
      room_type: 'Triple',
      meal_package: 'Half Board'
    };

    const result = await updateHotel(updateInput);

    expect(result.id).toEqual(hotelId);
    expect(result.room_type).toEqual('Triple');
    expect(result.meal_package).toEqual('Half Board');
    expect(result.name).toEqual('Test Hotel'); // Should remain unchanged
    expect(result.location).toEqual('Test Location'); // Should remain unchanged
  });

  it('should recalculate selling price when cost price changes', async () => {
    const hotelId = await createTestHotel();
    
    const updateInput: UpdateHotelInput = {
      id: hotelId,
      cost_price: 150
    };

    const result = await updateHotel(updateInput);

    expect(result.cost_price).toEqual(150);
    expect(result.markup_percentage).toEqual(20); // Should remain unchanged
    expect(result.selling_price).toEqual(180); // 150 + (20% of 150)
    expect(typeof result.selling_price).toBe('number');
  });

  it('should recalculate selling price when markup percentage changes', async () => {
    const hotelId = await createTestHotel();
    
    const updateInput: UpdateHotelInput = {
      id: hotelId,
      markup_percentage: 30
    };

    const result = await updateHotel(updateInput);

    expect(result.cost_price).toEqual(100); // Should remain unchanged
    expect(result.markup_percentage).toEqual(30);
    expect(result.selling_price).toEqual(130); // 100 + (30% of 100)
    expect(typeof result.selling_price).toBe('number');
  });

  it('should recalculate selling price when both cost price and markup percentage change', async () => {
    const hotelId = await createTestHotel();
    
    const updateInput: UpdateHotelInput = {
      id: hotelId,
      cost_price: 200,
      markup_percentage: 25
    };

    const result = await updateHotel(updateInput);

    expect(result.cost_price).toEqual(200);
    expect(result.markup_percentage).toEqual(25);
    expect(result.selling_price).toEqual(250); // 200 + (25% of 200)
    expect(typeof result.cost_price).toBe('number');
    expect(typeof result.markup_percentage).toBe('number');
    expect(typeof result.selling_price).toBe('number');
  });

  it('should save updated hotel to database', async () => {
    const hotelId = await createTestHotel();
    
    const updateInput: UpdateHotelInput = {
      id: hotelId,
      name: 'Database Test Hotel',
      cost_price: 175,
      markup_percentage: 15
    };

    await updateHotel(updateInput);

    // Verify the changes were saved to database
    const hotels = await db.select()
      .from(hotelsTable)
      .where(eq(hotelsTable.id, hotelId))
      .execute();

    expect(hotels).toHaveLength(1);
    const hotel = hotels[0];
    expect(hotel.name).toEqual('Database Test Hotel');
    expect(parseFloat(hotel.cost_price)).toEqual(175);
    expect(parseFloat(hotel.markup_percentage)).toEqual(15);
    expect(parseFloat(hotel.selling_price)).toEqual(201.25); // 175 + (15% of 175)
    expect(hotel.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent hotel', async () => {
    const updateInput: UpdateHotelInput = {
      id: 99999,
      name: 'Non-existent Hotel'
    };

    expect(updateHotel(updateInput)).rejects.toThrow(/Hotel with id 99999 not found/i);
  });

  it('should update only provided fields', async () => {
    const hotelId = await createTestHotel();
    
    const updateInput: UpdateHotelInput = {
      id: hotelId,
      name: 'Partial Update Hotel' // Only updating name
    };

    const result = await updateHotel(updateInput);

    expect(result.name).toEqual('Partial Update Hotel');
    expect(result.location).toEqual('Test Location'); // Should remain unchanged
    expect(result.room_type).toEqual('Double'); // Should remain unchanged
    expect(result.meal_package).toEqual('Full Board'); // Should remain unchanged
    expect(result.cost_price).toEqual(100); // Should remain unchanged
    expect(result.markup_percentage).toEqual(20); // Should remain unchanged
    expect(result.selling_price).toEqual(120); // Should remain unchanged
  });
});
