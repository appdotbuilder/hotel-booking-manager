
import { db } from '../db';
import { hotelsTable } from '../db/schema';
import { type UpdateHotelInput, type Hotel } from '../schema';
import { eq } from 'drizzle-orm';

export const updateHotel = async (input: UpdateHotelInput): Promise<Hotel> => {
  try {
    // First, get the current hotel data
    const existingHotel = await db.select()
      .from(hotelsTable)
      .where(eq(hotelsTable.id, input.id))
      .execute();

    if (existingHotel.length === 0) {
      throw new Error(`Hotel with id ${input.id} not found`);
    }

    const current = existingHotel[0];

    // Calculate new values, using input values or keeping existing ones
    const cost_price = input.cost_price !== undefined ? input.cost_price : parseFloat(current.cost_price);
    const markup_percentage = input.markup_percentage !== undefined ? input.markup_percentage : parseFloat(current.markup_percentage);
    const selling_price = cost_price + (markup_percentage / 100 * cost_price);

    // Prepare update values - only include fields that are provided
    const updateValues: any = {
      updated_at: new Date()
    };

    if (input.name !== undefined) updateValues.name = input.name;
    if (input.location !== undefined) updateValues.location = input.location;
    if (input.room_type !== undefined) updateValues.room_type = input.room_type;
    if (input.meal_package !== undefined) updateValues.meal_package = input.meal_package;
    if (input.cost_price !== undefined) updateValues.cost_price = input.cost_price.toString();
    if (input.markup_percentage !== undefined) updateValues.markup_percentage = input.markup_percentage.toString();
    
    // Always update selling_price if cost_price or markup_percentage changed
    if (input.cost_price !== undefined || input.markup_percentage !== undefined) {
      updateValues.selling_price = selling_price.toString();
    }

    // Update the hotel record
    const result = await db.update(hotelsTable)
      .set(updateValues)
      .where(eq(hotelsTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const hotel = result[0];
    return {
      ...hotel,
      cost_price: parseFloat(hotel.cost_price),
      markup_percentage: parseFloat(hotel.markup_percentage),
      selling_price: parseFloat(hotel.selling_price)
    };
  } catch (error) {
    console.error('Hotel update failed:', error);
    throw error;
  }
};
