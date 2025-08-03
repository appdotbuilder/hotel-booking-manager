
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { hotelsTable } from '../db/schema';
import { type Hotel } from '../schema';
import { getHotel } from '../handlers/get_hotel';

describe('getHotel', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return hotel when found', async () => {
    // Create test hotel
    const insertResult = await db.insert(hotelsTable)
      .values({
        name: 'Grand Hotel',
        location: 'Mecca',
        room_type: 'Double',
        meal_package: 'Full Board',
        cost_price: '150.00',
        markup_percentage: '25.50',
        selling_price: '187.50'
      })
      .returning()
      .execute();

    const hotelId = insertResult[0].id;

    const result = await getHotel(hotelId);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(hotelId);
    expect(result!.name).toBe('Grand Hotel');
    expect(result!.location).toBe('Mecca');
    expect(result!.room_type).toBe('Double');
    expect(result!.meal_package).toBe('Full Board');
    expect(result!.cost_price).toBe(150.00);
    expect(typeof result!.cost_price).toBe('number');
    expect(result!.markup_percentage).toBe(25.50);
    expect(typeof result!.markup_percentage).toBe('number');
    expect(result!.selling_price).toBe(187.50);
    expect(typeof result!.selling_price).toBe('number');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when hotel not found', async () => {
    const result = await getHotel(999);

    expect(result).toBeNull();
  });

  it('should handle different room types and meal packages', async () => {
    // Create hotel with different enum values
    const insertResult = await db.insert(hotelsTable)
      .values({
        name: 'Luxury Resort',
        location: 'Medina',
        room_type: 'Quad',
        meal_package: 'Half Board',
        cost_price: '300.00',
        markup_percentage: '15.00',
        selling_price: '345.00'
      })
      .returning()
      .execute();

    const hotelId = insertResult[0].id;

    const result = await getHotel(hotelId);

    expect(result).not.toBeNull();
    expect(result!.room_type).toBe('Quad');
    expect(result!.meal_package).toBe('Half Board');
    expect(result!.cost_price).toBe(300.00);
    expect(result!.markup_percentage).toBe(15.00);
    expect(result!.selling_price).toBe(345.00);
  });
});
