
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { hotelsTable } from '../db/schema';
import { getHotels } from '../handlers/get_hotels';

describe('getHotels', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no hotels exist', async () => {
    const result = await getHotels();

    expect(result).toEqual([]);
  });

  it('should return all hotels', async () => {
    // Create test hotels
    await db.insert(hotelsTable).values([
      {
        name: 'Hotel A',
        location: 'Location A',
        room_type: 'Double',
        meal_package: 'Full Board',
        cost_price: '100.00',
        markup_percentage: '20.00',
        selling_price: '120.00'
      },
      {
        name: 'Hotel B',
        location: 'Location B',
        room_type: 'Triple',
        meal_package: 'Half Board',
        cost_price: '150.50',
        markup_percentage: '15.75',
        selling_price: '174.18'
      }
    ]).execute();

    const result = await getHotels();

    expect(result).toHaveLength(2);
    
    // Verify first hotel
    const hotelA = result.find(h => h.name === 'Hotel A');
    expect(hotelA).toBeDefined();
    expect(hotelA!.location).toEqual('Location A');
    expect(hotelA!.room_type).toEqual('Double');
    expect(hotelA!.meal_package).toEqual('Full Board');
    expect(hotelA!.cost_price).toEqual(100.00);
    expect(hotelA!.markup_percentage).toEqual(20.00);
    expect(hotelA!.selling_price).toEqual(120.00);
    expect(hotelA!.id).toBeDefined();
    expect(hotelA!.created_at).toBeInstanceOf(Date);
    expect(hotelA!.updated_at).toBeInstanceOf(Date);

    // Verify second hotel
    const hotelB = result.find(h => h.name === 'Hotel B');
    expect(hotelB).toBeDefined();
    expect(hotelB!.location).toEqual('Location B');
    expect(hotelB!.room_type).toEqual('Triple');
    expect(hotelB!.meal_package).toEqual('Half Board');
    expect(hotelB!.cost_price).toEqual(150.5);
    expect(hotelB!.markup_percentage).toEqual(15.75);
    expect(hotelB!.selling_price).toEqual(174.18);
  });

  it('should return numeric values as numbers', async () => {
    await db.insert(hotelsTable).values({
      name: 'Test Hotel',
      location: 'Test Location',
      room_type: 'Quad',
      meal_package: 'Full Board',
      cost_price: '250.75',
      markup_percentage: '12.50',
      selling_price: '282.09'
    }).execute();

    const result = await getHotels();

    expect(result).toHaveLength(1);
    const hotel = result[0];
    
    // Verify numeric types
    expect(typeof hotel.cost_price).toBe('number');
    expect(typeof hotel.markup_percentage).toBe('number');
    expect(typeof hotel.selling_price).toBe('number');
    
    // Verify values
    expect(hotel.cost_price).toEqual(250.75);
    expect(hotel.markup_percentage).toEqual(12.5);
    expect(hotel.selling_price).toEqual(282.09);
  });
});
