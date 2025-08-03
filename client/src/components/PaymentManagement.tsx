
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Plus, FileText, DollarSign, AlertCircle } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { 
  CreatePaymentInput, 
  Payment,
  Customer, 
  Booking,
  PaymentMethod,
  PaymentCurrency
} from '../../../server/src/schema';

interface BookingPaymentStatus {
  booking_id: number;
  total_amount: number;
  total_paid: number;
  outstanding_balance: number;
  is_fully_paid: boolean;
}

const paymentMethods: PaymentMethod[] = ['Cash', 'Bank Transfer', 'Credit Card', 'Other'];
const paymentCurrencies: PaymentCurrency[] = ['SAR', 'USD', 'IDR'];

export function PaymentManagement() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number>(0);
  const [selectedBookingId, setSelectedBookingId] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<BookingPaymentStatus | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<CreatePaymentInput>({
    booking_id: 0,
    amount: 0,
    currency: 'SAR',
    payment_method: 'Cash'
  });

  const loadInitialData = useCallback(async () => {
    try {
      const [customersResult, bookingsResult] = await Promise.all([
        trpc.getCustomers.query(),
        trpc.getBookings.query()
      ]);
      
      setCustomers(customersResult);
      setBookings(bookingsResult);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const loadPaymentStatus = useCallback(async (bookingId: number) => {
    if (bookingId === 0) {
      setPaymentStatus(null);
      setPayments([]);
      return;
    }

    try {
      const [statusResult, paymentsResult] = await Promise.all([
        trpc.getBookingPaymentStatus.query(bookingId),
        trpc.getPaymentsByBooking.query(bookingId)
      ]);
      
      setPaymentStatus(statusResult);
      setPayments(paymentsResult);
    } catch (error) {
      console.error('Failed to load payment status:', error);
      setPaymentStatus(null);
      setPayments([]);
    }
  }, []);

  useEffect(() => {
    loadPaymentStatus(selectedBookingId);
  }, [selectedBookingId, loadPaymentStatus]);

  const getCustomerBookings = (customerId: number) => {
    return bookings.filter(booking => booking.customer_id === customerId);
  };

  const resetForm = () => {
    setFormData({
      booking_id: selectedBookingId,
      amount: 0,
      currency: 'SAR',
      payment_method: 'Cash'
    });
  };

  const handleOpenDialog = () => {
    resetForm();
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
      const newPayment = await trpc.createPayment.mutate(formData);
      setPayments((prev: Payment[]) => [...prev, newPayment]);
      
      // Refresh payment status
      await loadPaymentStatus(selectedBookingId);
      handleCloseDialog();
    } catch (error) {
      console.error('Failed to create payment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBookingInvoice = (bookingId: number) => {
    const booking = bookings.find(b => b.id === bookingId);
    return booking?.invoice_number || 'Unknown';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CreditCard className="h-8 w-8 text-blue-600" />
            Payment Management
          </h2>
          <p className="text-muted-foreground">
            Record and track customer payments
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Customer and Booking Selection */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Select Booking</CardTitle>
              <CardDescription>
                Choose customer and booking to process payment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Customer</Label>
                <Select
                  value={selectedCustomerId > 0 ? selectedCustomerId.toString() : ''}
                  onValueChange={(value: string) => {
                    const customerId = parseInt(value);
                    setSelectedCustomerId(customerId);
                    setSelectedBookingId(0);
                  }}
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

              {selectedCustomerId > 0 && (
                <div className="space-y-2">
                  <Label>Invoice</Label>
                  <Select
                    value={selectedBookingId > 0 ? selectedBookingId.toString() : ''}
                    onValueChange={(value: string) => setSelectedBookingId(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select invoice" />
                    </SelectTrigger>
                    <SelectContent>
                      {getCustomerBookings(selectedCustomerId).map((booking: Booking) => (
                        <SelectItem key={booking.id} value={booking.id.toString()}>
                          {booking.invoice_number} - {booking.total_amount.toFixed(2)} SAR
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Status */}
          {paymentStatus && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Payment Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Total Amount:</span>
                  <span className="font-medium">{paymentStatus.total_amount.toFixed(2)} SAR</span>
                </div>
                <div className="flex justify-between">
                  <span>Paid Amount:</span>
                  <span className="font-medium text-green-600">
                    {paymentStatus.total_paid.toFixed(2)} SAR
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span>Outstanding Balance:</span>
                  <span className={`font-bold ${paymentStatus.outstanding_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {paymentStatus.outstanding_balance.toFixed(2)} SAR
                  </span>
                </div>
                
                {paymentStatus.outstanding_balance > 0 && (
                  <div className="pt-2">
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button onClick={handleOpenDialog} className="w-full">
                          <Plus className="h-4 w-4 mr-2" />
                          Record Payment
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Record New Payment</DialogTitle>
                          <DialogDescription>
                            Record a payment for invoice {getBookingInvoice(selectedBookingId)}
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit}>
                          <div className="space-y-4 py-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2">
                                <Label htmlFor="amount">Payment Amount</Label>
                                <Input
                                  id="amount"
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max={paymentStatus.outstanding_balance}
                                  value={formData.amount}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setFormData((prev: CreatePaymentInput) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))
                                  }
                                  placeholder="0.00"
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Currency</Label>
                                <Select
                                  value={formData.currency}
                                  onValueChange={(value: PaymentCurrency) =>
                                    setFormData((prev: CreatePaymentInput) => ({ ...prev, currency: value }))
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {paymentCurrencies.map((currency: PaymentCurrency) => (
                                      <SelectItem key={currency} value={currency}>
                                        {currency}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Payment Method</Label>
                              <Select
                                value={formData.payment_method}
                                onValueChange={(value: PaymentMethod) =>
                                  setFormData((prev: CreatePaymentInput) => ({ ...prev, payment_method: value }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {paymentMethods.map((method: PaymentMethod) => (
                                    <SelectItem key={method} value={method}>
                                      {method}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {formData.currency !== 'SAR' && (
                              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                <div className="flex items-center gap-2">
                                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                                  <span className="text-sm text-yellow-800">
                                    Amount will be converted to SAR based on current exchange rates
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                          <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleCloseDialog}>
                              Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting || formData.amount <= 0}>
                              {isSubmitting ? 'Recording...' : 'Record Payment'}
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Payment History */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>
                {selectedBookingId > 0 
                  ? `Payments for invoice ${getBookingInvoice(selectedBookingId)}`
                  : 'Select a booking to view payment history'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedBookingId === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-muted-foreground">Select a booking to view payments</p>
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-muted-foreground">No payments recorded yet</p>
                  <p className="text-sm text-muted-foreground">
                    Record the first payment for this booking
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Currency</TableHead>
                        <TableHead>SAR Amount</TableHead>
                        <TableHead>Method</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment: Payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            <Badge variant="secondary">
                              {payment.payment_date.toLocaleDateString()}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {payment.amount.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{payment.currency}</Badge>
                          </TableCell>
                          <TableCell className="font-medium text-green-600">
                            {payment.amount_in_sar.toFixed(2)} SAR
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-3 w-3 text-gray-400" />
                              {payment.payment_method}
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
      </div>
    </div>
  );
}
