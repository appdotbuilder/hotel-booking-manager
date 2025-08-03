
import { db } from '../db';
import { hotelsTable } from '../db/schema';
import { type CreateHotelInput, type Hotel } from '../schema';

export const createHotel = async (input: CreateHotelInput): Promise<Hotel> => {
  try {
    // Calculate selling price: cost_price + (markup_percentage * cost_price / 100)
    const selling_price = input.cost_price + (input.markup_percentage / 100 * input.cost_price);

    // Insert hotel record
    const result = await db.insert(hotelsTable)
      .values({
        name: input.name,
        location: input.location,
        room_type: input.room_type,
        meal_package: input.meal_package,
        cost_price: input.cost_price.toString(), // Convert number to string for numeric column
        markup_percentage: input.markup_percentage.toString(), // Convert number to string for numeric column
        selling_price: selling_price.toString() // Convert calculated price to string for numeric column
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const hotel = result[0];
    return {
      ...hotel,
      cost_price: parseFloat(hotel.cost_price), // Convert string back to number
      markup_percentage: parseFloat(hotel.markup_percentage), // Convert string back to number
      selling_price: parseFloat(hotel.selling_price) // Convert string back to number
    };
  } catch (error) {
    console.error('Hotel creation failed:', error);
    throw error;
  }
};
