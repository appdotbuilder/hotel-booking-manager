
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, Download, Calendar, TrendingUp, AlertCircle, FileText, DollarSign } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { 
  ProfitLossReport,
  BookingsSummaryReport,
  UnpaidInvoicesReport,
  ReportDateRangeInput
} from '../../../server/src/schema';

export function ReportsSection() {
  const [profitLossData, setProfitLossData] = useState<ProfitLossReport[]>([]);
  const [bookingsSummaryData, setBookingsSummaryData] = useState<BookingsSummaryReport[]>([]);
  const [unpaidInvoicesData, setUnpaidInvoicesData] = useState<UnpaidInvoicesReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [dateRange, setDateRange] = useState<ReportDateRangeInput>({
    start_date: '',
    end_date: ''
  });

  const loadReports = useCallback(async (filters?: ReportDateRangeInput) => {
    try {
      setIsLoading(true);
      const [profitLoss, bookingsSummary, unpaidInvoices] = await Promise.all([
        trpc.getProfitLossReport.query(filters),
        trpc.getBookingsSummaryReport.query(filters),
        trpc.getUnpaidInvoicesReport.query()
      ]);
      
      setProfitLossData(profitLoss);
      setBookingsSummaryData(bookingsSummary);
      setUnpaidInvoicesData(unpaidInvoices);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleFilterApply = () => {
    const filters = {
      start_date: dateRange.start_date || undefined,
      end_date: dateRange.end_date || undefined
    };
    loadReports(filters);
  };

  const calculateTotalProfit = () => {
    return profitLossData.reduce((sum, item) => sum + item.profit, 0);
  };

  const calculateTotalRevenue = () => {
    return profitLossData.reduce((sum, item) => sum + item.total_revenue, 0);
  };

  const calculateTotalCost = () => {
    return profitLossData.reduce((sum, item) => sum + item.total_cost, 0);
  };

  const calculateTotalUnpaid = () => {
    return unpaidInvoicesData.reduce((sum, item) => sum + item.outstanding_balance, 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            Reports & Analytics
          </h2>
          <p className="text-muted-foreground">
            Financial reports and business analytics
          </p>
        </div>
        <Button onClick={() => loadReports()} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Refresh All'}
        </Button>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Date Range Filter
          </CardTitle>
          <CardDescription>
            Filter reports by date range (leave empty for all data)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={dateRange.start_date || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setDateRange((prev: ReportDateRangeInput) => ({ ...prev, start_date: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={dateRange.end_date || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setDateRange((prev: ReportDateRangeInput) => ({ ...prev, end_date: e.target.value }))
                }
              />
            </div>
            <Button onClick={handleFilterApply} disabled={isLoading}>
              Apply Filter
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setDateRange({ start_date: '', end_date: '' });
                loadReports();
              }}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="profit-loss" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profit-loss">Profit & Loss</TabsTrigger>
          <TabsTrigger value="bookings-summary">Bookings Summary</TabsTrigger>
          <TabsTrigger value="unpaid-invoices">Unpaid Invoices</TabsTrigger>
        </TabsList>

        {/* Profit & Loss Report */}
        <TabsContent value="profit-loss" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {calculateTotalRevenue().toFixed(2)} SAR
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                <DollarSign className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {calculateTotalCost().toFixed(2)} SAR
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {calculateTotalProfit().toFixed(2)} SAR
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Profit & Loss by Booking</CardTitle>
                  <CardDescription>
                    Detailed profit analysis for each booking
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-12 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : profitLossData.length === 0 ? (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-muted-foreground">No profit/loss data available</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Revenue</TableHead>
                        <TableHead>Cost</TableHead>
                        <TableHead>Profit</TableHead>
                        <TableHead>Margin</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profitLossData.map((item: ProfitLossReport, index: number) => {
                        const margin = item.total_revenue > 0 ? (item.profit / item.total_revenue) * 100 : 0;
                        return (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-blue-600" />
                                {item.invoice_number}
                              </div>
                            </TableCell>
                
                            <TableCell>{item.customer_name}</TableCell>
                            <TableCell>
                              <div className="font-medium text-green-600">
                                {item.total_revenue.toFixed(2)} SAR
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-red-600">
                                {item.total_cost.toFixed(2)} SAR
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className={`font-medium ${item.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {item.profit.toFixed(2)} SAR
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={margin >= 20 ? 'default' : margin >= 10 ? 'secondary' : 'destructive'}>
                                {margin.toFixed(1)}%
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {item.booking_date.toLocaleDateString()}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bookings Summary Report */}
        <TabsContent value="bookings-summary" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Bookings Summary by Date</CardTitle>
                  <CardDescription>
                    Daily booking statistics and revenue
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-12 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : bookingsSummaryData.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-muted-foreground">No booking summary data available</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Total Bookings</TableHead>
                        <TableHead>Total Rooms</TableHead>
                        <TableHead>Total Revenue</TableHead>
                        <TableHead>Avg. per Booking</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookingsSummaryData.map((item: BookingsSummaryReport, index: number) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Badge variant="outline">
                              {item.date.toLocaleDateString()}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {item.total_bookings}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {item.total_rooms} rooms
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-green-600">
                              {item.total_revenue.toFixed(2)} SAR
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {item.total_bookings > 0 ? (item.total_revenue / item.total_bookings).toFixed(2) : '0.00'} SAR
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
        </TabsContent>

        {/* Unpaid Invoices Report */}
        <TabsContent value="unpaid-invoices" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
                <CardDescription>Amount pending from customers</CardDescription>
              </div>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {calculateTotalUnpaid().toFixed(2)} SAR
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Unpaid Invoices</CardTitle>
                  <CardDescription>
                    Invoices with outstanding balance
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-12 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : unpaidInvoicesData.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                  <p className="text-muted-foreground">All invoices are paid! 🎉</p>
                  <p className="text-sm text-muted-foreground">
                    No outstanding balances
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Total Amount</TableHead>
                        <TableHead>Paid Amount</TableHead>
                        <TableHead>Outstanding</TableHead>
                        <TableHead>Days Overdue</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unpaidInvoicesData.map((item: UnpaidInvoicesReport, index: number) => {
                        const daysOverdue = Math.floor((new Date().getTime() - item.booking_date.getTime()) / (1000 * 60 * 60 * 24));
                        return (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-red-600" />
                                {item.invoice_number}
                              </div>
                            </TableCell>
                            <TableCell>{item.customer_name}</TableCell>
                            <TableCell>
                              <div className="font-medium">
                                {item.total_amount.toFixed(2)} SAR
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-green-600">
                                {item.paid_amount.toFixed(2)} SAR
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-red-600">
                                {item.outstanding_balance.toFixed(2)} SAR
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={daysOverdue > 30 ? 'destructive' : daysOverdue > 7 ? 'secondary' : 'outline'}>
                                {daysOverdue} days
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {item.booking_date.toLocaleDateString()}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
