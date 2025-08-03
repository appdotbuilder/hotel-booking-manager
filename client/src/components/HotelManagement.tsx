
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, Plus, Edit, Trash2, MapPin, Bed, Utensils, DollarSign, Percent } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Hotel, CreateHotelInput, UpdateHotelInput, RoomType, MealPackage } from '../../../server/src/schema';

const roomTypeOptions: RoomType[] = ['Double', 'Triple', 'Quad'];
const mealPackageOptions: MealPackage[] = ['Full Board', 'Half Board'];

export function HotelManagement() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<CreateHotelInput>({
    name: '',
    location: '',
    room_type: 'Double',
    meal_package: 'Full Board',
    cost_price: 0,
    markup_percentage: 0
  });

  const loadHotels = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getHotels.query();
      setHotels(result);
    } catch (error) {
      console.error('Failed to load hotels:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHotels();
  }, [loadHotels]);

  const resetForm = () => {
    setFormData({
      name: '',
      location: '',
      room_type: 'Double',
      meal_package: 'Full Board',
      cost_price: 0,
      markup_percentage: 0
    });
    setEditingHotel(null);
  };

  const handleOpenDialog = (hotel?: Hotel) => {
    if (hotel) {
      setEditingHotel(hotel);
      setFormData({
        name: hotel.name,
        location: hotel.location,
        room_type: hotel.room_type,
        meal_package: hotel.meal_package,
        cost_price: hotel.cost_price,
        markup_percentage: hotel.markup_percentage
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingHotel) {
        const updateData: UpdateHotelInput = {
          id: editingHotel.id,
          ...formData
        };
        const updatedHotel = await trpc.updateHotel.mutate(updateData);
        setHotels((prev: Hotel[]) =>
          prev.map((h: Hotel) => h.id === editingHotel.id ? updatedHotel : h)
        );
      } else {
        const newHotel = await trpc.createHotel.mutate(formData);
        setHotels((prev: Hotel[]) => [...prev, newHotel]);
      }
      handleCloseDialog();
    } catch (error) {
      console.error('Failed to save hotel:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await trpc.deleteHotel.mutate(id);
      setHotels((prev: Hotel[]) => prev.filter((h: Hotel) => h.id !== id));
    } catch (error) {
      console.error('Failed to delete hotel:', error);
    }
  };

  const calculateSellingPrice = (costPrice: number, markupPercentage: number) => {
    return costPrice + (costPrice * markupPercentage / 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-8 w-8 text-blue-600" />
            Hotel Management
          </h2>
          <p className="text-muted-foreground">
            Manage hotel inventory and pricing
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Hotel
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingHotel ? 'Edit Hotel' : 'Add New Hotel'}
              </DialogTitle>
              <DialogDescription>
                {editingHotel 
                  ? 'Update hotel information and pricing' 
                  : 'Enter hotel details and pricing structure'
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Hotel Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateHotelInput) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Hotel Name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateHotelInput) => ({ ...prev, location: e.target.value }))
                    }
                    placeholder="City, Country"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Room Type</Label>
                  <Select
                    value={formData.room_type || 'Double'}
                    onValueChange={(value: RoomType) =>
                      setFormData((prev: CreateHotelInput) => ({ ...prev, room_type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roomTypeOptions.map((type: RoomType) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Meal Package</Label>
                  <Select
                    value={formData.meal_package || 'Full Board'}
                    onValueChange={(value: MealPackage) =>
                      setFormData((prev: CreateHotelInput) => ({ ...prev, meal_package: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {mealPackageOptions.map((pkg: MealPackage) => (
                        <SelectItem key={pkg} value={pkg}>
                          {pkg}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost_price">Cost Price (SAR)</Label>
                  <Input
                    id="cost_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.cost_price}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateHotelInput) => ({ ...prev, cost_price: parseFloat(e.target.value) || 0 }))
                    }
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="markup_percentage">Markup Percentage (%)</Label>
                  <Input
                    id="markup_percentage"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.markup_percentage}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateHotelInput) => ({ ...prev, markup_percentage: parseFloat(e.target.value) || 0 }))
                    }
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="md:col-span-2 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Selling Price:</span>
                    <span className="text-lg font-bold text-green-600">
                      {calculateSellingPrice(formData.cost_price, formData.markup_percentage).toFixed(2)} SAR
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Cost Price + ({formData.markup_percentage}% × Cost Price)
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : editingHotel ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hotels ({hotels.length})</CardTitle>
          <CardDescription>
            Manage your hotel inventory and pricing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  
                  <div className="h-16 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : hotels.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-muted-foreground">No hotels yet</p>
              <p className="text-sm text-muted-foreground">
                Add your first hotel to start managing bookings
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hotel Details</TableHead>
                    <TableHead>Room & Meal</TableHead>
                    <TableHead>Pricing</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hotels.map((hotel: Hotel) => (
                    <TableRow key={hotel.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{hotel.name}</div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {hotel.location}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <Bed className="h-3 w-3 text-gray-400" />
                            <Badge variant="outline">{hotel.room_type}</Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <Utensils className="h-3 w-3 text-gray-400" />
                            <Badge variant="outline">{hotel.meal_package}</Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <DollarSign className="h-3 w-3 text-gray-400" />
                            Cost: {hotel.cost_price.toFixed(2)} SAR
                          </div>
                          <div className="flex items-center gap-1 text-sm">
                            <Percent className="h-3 w-3 text-gray-400" />
                            Markup: {hotel.markup_percentage}%
                          </div>
                          <div className="font-medium text-green-600">
                            Sell: {hotel.selling_price.toFixed(2)} SAR
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {hotel.created_at.toLocaleDateString()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDialog(hotel)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Hotel</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {hotel.name}? 
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDelete(hotel.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
