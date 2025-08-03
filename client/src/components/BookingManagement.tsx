
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
import { Separator } from '@/components/ui/separator';
import { Calendar, Plus, Trash2, Users, Building2, FileText, Minus } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { 
  Booking, 
  CreateBookingInput, 
  Customer, 
  Hotel, 
  Service 
} from '../../../server/src/schema';

interface ServiceSelection {
  service_id: number;
  quantity: number;
  service?: Service;
}

export function BookingManagement() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<CreateBookingInput>({
    customer_id: 0,
    hotel_id: 0,
    check_in_date: '',
    check_out_date: '',
    room_quantity: 1,
    services: []
  });

  const [selectedServices, setSelectedServices] = useState<ServiceSelection[]>([]);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [bookingsResult, customersResult, hotelsResult, servicesResult] = await Promise.all([
        trpc.getBookings.query(),
        trpc.getCustomers.query(),
        trpc.getHotels.query(),
        trpc.getServices.query()
      ]);
      
      setBookings(bookingsResult);
      setCustomers(customersResult);
      setHotels(hotelsResult);
      setServices(servicesResult);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setFormData({
      customer_id: 0,
      hotel_id: 0,
      check_in_date: '',
      check_out_date: '',
      room_quantity: 1,
      services: []
    });
    setSelectedServices([]);
  };

  const handleOpenDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const addService = () => {
    if (services.length > 0) {
      const availableService = services.find(s => 
        !selectedServices.some(ss => ss.service_id === s.id)
      );
      if (availableService) {
        setSelectedServices((prev: ServiceSelection[]) => [
          ...prev,
          { service_id: availableService.id, quantity: 1, service: availableService }
        ]);
      }
    }
  };

  const removeService = (index: number) => {
    setSelectedServices((prev: ServiceSelection[]) => 
      prev.filter((_, i) => i !== index)
    );
  };

  const updateServiceQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) return;
    setSelectedServices((prev: ServiceSelection[]) =>
      prev.map((service, i) => 
        i === index ? { ...service, quantity } : service
      )
    );
  };

  const updateServiceSelection = (index: number, serviceId: number) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;
    
    setSelectedServices((prev: ServiceSelection[]) =>
      prev.map((selection, i) => 
        i === index ? { ...selection, service_id: serviceId, service } : selection
      )
    );
  };

  const calculateNights = () => {
    if (!formData.check_in_date || !formData.check_out_date) return 0;
    const checkIn = new Date(formData.check_in_date);
    const checkOut = new Date(formData.check_out_date);
    const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const calculateHotelSubtotal = () => {
    const selectedHotel = hotels.find(h => h.id === formData.hotel_id);
    if (!selectedHotel) return 0;
    const nights = calculateNights();
    return selectedHotel.selling_price * formData.room_quantity * nights;
  };

  const calculateServicesTotal = () => {
    return selectedServices.reduce((total, selection) => {
      const service = selection.service || services.find(s => s.id === selection.service_id);
      return total + (service ? service.selling_price * selection.quantity : 0);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const bookingData: CreateBookingInput = {
        ...formData,
        services: selectedServices.map(({ service_id, quantity }) => ({
          service_id,
          quantity
        }))
      };

      const newBooking = await trpc.createBooking.mutate(bookingData);
      setBookings((prev: Booking[]) => [...prev, newBooking]);
      handleCloseDialog();
    } catch (error) {
      console.error('Failed to create booking:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await trpc.deleteBooking.mutate(id);
      setBookings((prev: Booking[]) => prev.filter((b: Booking) => b.id !== id));
    } catch (error) {
      console.error('Failed to delete booking:', error);
    }
  };

  const getCustomerName = (customerId: number) => {
    const customer = customers.find(c => c.id === customerId);
    return customer?.name || 'Unknown Customer';
  };

  const getHotelName = (hotelId: number) => {
    const hotel = hotels.find(h => h.id === hotelId);
    return hotel?.name || 'Unknown Hotel';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="h-8 w-8 text-blue-600" />
            Booking Management
          </h2>
          <p className="text-muted-foreground">
            Create and manage hotel bookings
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenDialog} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Booking
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Booking</DialogTitle>
              <DialogDescription>
                Fill in the booking details and select additional services
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-6 py-4">
                {/* Customer and Hotel Selection */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Customer</Label>
                    <Select
                      value={formData.customer_id > 0 ? formData.customer_id.toString() : ''}
                      onValueChange={(value: string) =>
                        setFormData((prev: CreateBookingInput) => ({ ...prev, customer_id: parseInt(value) }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer: Customer) => (
                          <SelectItem key={customer.id} value={customer.id.toString()}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Hotel</Label>
                    <Select
                      value={formData.hotel_id > 0 ? formData.hotel_id.toString() : ''}
                      onValueChange={(value: string) =>
                        setFormData((prev: CreateBookingInput) => ({ ...prev, hotel_id: parseInt(value) }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select hotel" />
                      </SelectTrigger>
                      <SelectContent>
                        {hotels.map((hotel: Hotel) => (
                          <SelectItem key={hotel.id} value={hotel.id.toString()}>
                            {hotel.name} - {hotel.location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Dates and Rooms */}
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="check_in_date">Check-in Date</Label>
                    <Input
                      id="check_in_date"
                      type="date"
                      value={formData.check_in_date}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateBookingInput) => ({ ...prev, check_in_date: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="check_out_date">Check-out Date</Label>
                    <Input
                      id="check_out_date"
                      type="date"
                      value={formData.check_out_date}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateBookingInput) => ({ ...prev, check_out_date: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="room_quantity">Number of Rooms</Label>
                    <Input
                      id="room_quantity"
                      type="number"
                      min="1"
                      value={formData.room_quantity}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateBookingInput) => ({ ...prev, room_quantity: parseInt(e.target.value) || 1 }))
                      }
                      required
                    />
                  </div>
                </div>

                {/* Hotel Summary */}
                {formData.hotel_id > 0 && formData.check_in_date && formData.check_out_date && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Hotel Booking Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Nights:</span>
                          <span>{calculateNights()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Rooms:</span>
                          <span>{formData.room_quantity}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-medium">
                          <span>Hotel Subtotal:</span>
                          <span>{calculateHotelSubtotal().toFixed(2)} SAR</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Additional Services */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-lg">Additional Services</Label>
                    <Button type="button" onClick={addService} size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Service
                    </Button>
                  </div>
                  
                  {selectedServices.length > 0 && (
                    <div className="space-y-3">
                      {selectedServices.map((selection: ServiceSelection, index: number) => (
                        <Card key={index}>
                          <CardContent className="pt-4">
                            <div className="grid gap-4 md:grid-cols-4 items-end">
                              <div className="space-y-2">
                                <Label>Service</Label>
                                <Select
                                  value={selection.service_id.toString()}
                                  onValueChange={(value: string) =>
                                    updateServiceSelection(index, parseInt(value))
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {services
                                      .filter(s => 
                                        s.id === selection.service_id || 
                                        !selectedServices.some(ss => ss.service_id === s.id)
                                      )
                                      .map((service: Service) => (
                                        <SelectItem key={service.id} value={service.id.toString()}>
                                          {service.name} - {service.selling_price.toFixed(2)} SAR
                                        </SelectItem>
                                      ))
                                    }
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Quantity</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={selection.quantity}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    updateServiceQuantity(index, parseInt(e.target.value) || 1)
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Total</Label>
                                <div className="text-lg font-medium">
                                  {((selection.service?.selling_price || 0) * selection.quantity).toFixed(2)} SAR
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeService(index)}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Total Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Booking Total</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Hotel Subtotal:</span>
                        <span>{calculateHotelSubtotal().toFixed(2)} SAR</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Services Total:</span>
                        <span>{calculateServicesTotal().toFixed(2)} SAR</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total Amount:</span>
                        <span>{(calculateHotelSubtotal() + calculateServicesTotal()).toFixed(2)} SAR</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || formData.customer_id === 0 || formData.hotel_id === 0}>
                  {isSubmitting ? 'Creating...' : 'Create Booking'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bookings ({bookings.length})</CardTitle>
          <CardDescription>
            All hotel bookings in the system
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
          ) : bookings.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-muted-foreground">No bookings yet</p>
              <p className="text-sm text-muted-foreground">
                Create your first booking to get started
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Hotel</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Rooms</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking: Booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          {booking.invoice_number}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-3 w-3 text-gray-400" />
                          {getCustomerName(booking.customer_id)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3 w-3 text-gray-400" />
                          {getHotelName(booking.hotel_id)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{booking.check_in_date.toLocaleDateString()}</div>
                          <div className="text-muted-foreground">
                            to {booking.check_out_date.toLocaleDateString()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{booking.room_quantity}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-green-600">
                          {booking.total_amount.toFixed(2)} SAR
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {booking.created_at.toLocaleDateString()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm">
                            <FileText className="h-3 w-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Booking</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete booking {booking.invoice_number}? 
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDelete(booking.id)}
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
