
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { hotelsTable } from '../db/schema';
import { type CreateHotelInput } from '../schema';
import { createHotel } from '../handlers/create_hotel';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateHotelInput = {
  name: 'Test Hotel',
  location: 'Mecca',
  room_type: 'Double',
  meal_package: 'Full Board',
  cost_price: 100.00,
  markup_percentage: 20.00
};

describe('createHotel', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a hotel with calculated selling price', async () => {
    const result = await createHotel(testInput);

    // Basic field validation
    expect(result.name).toEqual('Test Hotel');
    expect(result.location).toEqual('Mecca');
    expect(result.room_type).toEqual('Double');
    expect(result.meal_package).toEqual('Full Board');
    expect(result.cost_price).toEqual(100.00);
    expect(result.markup_percentage).toEqual(20.00);
    expect(result.selling_price).toEqual(120.00); // 100 + (20% of 100)
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify numeric types
    expect(typeof result.cost_price).toBe('number');
    expect(typeof result.markup_percentage).toBe('number');
    expect(typeof result.selling_price).toBe('number');
  });

  it('should save hotel to database', async () => {
    const result = await createHotel(testInput);

    // Query using proper drizzle syntax
    const hotels = await db.select()
      .from(hotelsTable)
      .where(eq(hotelsTable.id, result.id))
      .execute();

    expect(hotels).toHaveLength(1);
    expect(hotels[0].name).toEqual('Test Hotel');
    expect(hotels[0].location).toEqual('Mecca');
    expect(hotels[0].room_type).toEqual('Double');
    expect(hotels[0].meal_package).toEqual('Full Board');
    expect(parseFloat(hotels[0].cost_price)).toEqual(100.00);
    expect(parseFloat(hotels[0].markup_percentage)).toEqual(20.00);
    expect(parseFloat(hotels[0].selling_price)).toEqual(120.00);
    expect(hotels[0].created_at).toBeInstanceOf(Date);
    expect(hotels[0].updated_at).toBeInstanceOf(Date);
  });

  it('should calculate selling price correctly with different markup percentages', async () => {
    const inputWithHighMarkup: CreateHotelInput = {
      ...testInput,
      cost_price: 200.00,
      markup_percentage: 50.00
    };

    const result = await createHotel(inputWithHighMarkup);

    expect(result.cost_price).toEqual(200.00);
    expect(result.markup_percentage).toEqual(50.00);
    expect(result.selling_price).toEqual(300.00); // 200 + (50% of 200)
  });

  it('should handle zero markup percentage', async () => {
    const inputWithZeroMarkup: CreateHotelInput = {
      ...testInput,
      cost_price: 150.00,
      markup_percentage: 0.00
    };

    const result = await createHotel(inputWithZeroMarkup);

    expect(result.cost_price).toEqual(150.00);
    expect(result.markup_percentage).toEqual(0.00);
    expect(result.selling_price).toEqual(150.00); // 150 + (0% of 150)
  });

  it('should handle different room types and meal packages', async () => {
    const tripleRoomInput: CreateHotelInput = {
      ...testInput,
      room_type: 'Triple',
      meal_package: 'Half Board'
    };

    const result = await createHotel(tripleRoomInput);

    expect(result.room_type).toEqual('Triple');
    expect(result.meal_package).toEqual('Half Board');
  });
});
