
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Plus, Edit, Trash2, Building, DollarSign, Percent } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { 
  TravelAgencySettings,
  CreateTravelAgencySettingsInput,
  UpdateTravelAgencySettingsInput,
  CurrencyConversion,
  CreateCurrencyConversionInput,
  UpdateCurrencyConversionInput
} from '../../../server/src/schema';

export function SettingsSection() {
  const [agencySettings, setAgencySettings] = useState<TravelAgencySettings | null>(null);
  const [currencies, setCurrencies] = useState<CurrencyConversion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAgencyDialogOpen, setIsAgencyDialogOpen] = useState(false);
  const [isCurrencyDialogOpen, setIsCurrencyDialogOpen] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<CurrencyConversion | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [agencyFormData, setAgencyFormData] = useState<CreateTravelAgencySettingsInput>({
    name: '',
    address: ''
  });

  const [currencyFormData, setCurrencyFormData] = useState<CreateCurrencyConversionInput>({
    currency_name: '',
    conversion_rate: 0
  });

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [agencyResult, currenciesResult] = await Promise.all([
        trpc.getTravelAgencySettings.query(),
        trpc.getCurrencyConversions.query()
      ]);
      
      setAgencySettings(agencyResult);
      setCurrencies(currenciesResult);
      
      if (agencyResult) {
        setAgencyFormData({
          name: agencyResult.name,
          address: agencyResult.address
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAgencySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (agencySettings) {
        const updateData: UpdateTravelAgencySettingsInput = {
          id: agencySettings.id,
          ...agencyFormData
        };
        const updated = await trpc.updateTravelAgencySettings.mutate(updateData);
        setAgencySettings(updated);
      } else {
        const created = await trpc.createTravelAgencySettings.mutate(agencyFormData);
        setAgencySettings(created);
      }
      setIsAgencyDialogOpen(false);
    } catch (error) {
      console.error('Failed to save agency settings:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetCurrencyForm = () => {
    setCurrencyFormData({
      currency_name: '',
      conversion_rate: 0
    });
    setEditingCurrency(null);
  };

  const handleOpenCurrencyDialog = (currency?: CurrencyConversion) => {
    if (currency) {
      setEditingCurrency(currency);
      setCurrencyFormData({
        currency_name: currency.currency_name,
        conversion_rate: currency.conversion_rate
      });
    } else {
      resetCurrencyForm();
    }
    setIsCurrencyDialogOpen(true);
  };

  const handleCloseCurrencyDialog = () => {
    setIsCurrencyDialogOpen(false);
    resetCurrencyForm();
  };

  const handleCurrencySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingCurrency) {
        const updateData: UpdateCurrencyConversionInput = {
          id: editingCurrency.id,
          ...currencyFormData
        };
        const updated = await trpc.updateCurrencyConversion.mutate(updateData);
        setCurrencies((prev: CurrencyConversion[]) =>
          prev.map((c: CurrencyConversion) => c.id === editingCurrency.id ? updated : c)
        );
      } else {
        const created = await trpc.createCurrencyConversion.mutate(currencyFormData);
        setCurrencies((prev: CurrencyConversion[]) => [...prev, created]);
      }
      handleCloseCurrencyDialog();
    } catch (error) {
      console.error('Failed to save currency:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCurrency = async (id: number) => {
    try {
      await trpc.deleteCurrencyConversion.mutate(id);
      setCurrencies((prev: CurrencyConversion[]) => prev.filter((c: CurrencyConversion) => c.id !== id));
    } catch (error) {
      console.error('Failed to delete currency:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-8 w-8 text-blue-600" />
            Settings
          </h2>
          <p className="text-muted-foreground">
            Configure travel agency and system settings
          </p>
        </div>
      </div>

      <Tabs defaultValue="agency" className="space-y-4">
        <TabsList>
          <TabsTrigger value="agency">Travel Agency</TabsTrigger>
          <TabsTrigger value="currency">Currency Conversion</TabsTrigger>
        </TabsList>

        {/* Travel Agency Settings */}
        <TabsContent value="agency" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Travel Agency Information
                  </CardTitle>
                  <CardDescription>
                    Basic information shown on invoices and documents
                  </CardDescription>
                </div>
                <Dialog open={isAgencyDialogOpen} onOpenChange={setIsAgencyDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Edit className="h-4 w-4 mr-2" />
                      {agencySettings ? 'Edit' : 'Setup'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {agencySettings ? 'Edit Agency Information' : 'Setup Travel Agency'}
                      </DialogTitle>
                      <DialogDescription>
                        This information will appear on all invoices and official documents
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAgencySubmit}>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="agency_name">Travel Agency Name</Label>
                          <Input
                            id="agency_name"
                            value={agencyFormData.name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setAgencyFormData((prev: CreateTravelAgencySettingsInput) => ({ ...prev, name: e.target.value }))
                            }
                            placeholder="Your Travel Agency Name"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="agency_address">Address</Label>
                          <Input
                            id="agency_address"
                            value={agencyFormData.address}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setAgencyFormData((prev: CreateTravelAgencySettingsInput) => ({ ...prev, address: e.target.value }))
                            }
                            placeholder="Complete business address"
                            required
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsAgencyDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting ? 'Saving...' : 'Save'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              ) : agencySettings ? (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Agency Name</Label>
                    <div className="text-lg font-medium">{agencySettings.name}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Address</Label>
                    <div className="text-sm">{agencySettings.address}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Last updated: {agencySettings.updated_at.toLocaleDateString()}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-muted-foreground">Travel agency not configured</p>
                  <p className="text-sm text-muted-foreground">
                    Click "Setup" to add your agency information
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Currency Conversion Settings */}
        <TabsContent value="currency" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Currency Conversion Rates
                  </CardTitle>
                  <CardDescription>
                    Exchange rates for converting payments to SAR (Saudi Riyal)
                  </CardDescription>
                </div>
                <Dialog open={isCurrencyDialogOpen} onOpenChange={setIsCurrencyDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => handleOpenCurrencyDialog()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Currency
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingCurrency ? 'Edit Currency Rate' : 'Add Currency Conversion'}
                      </DialogTitle>
                      <DialogDescription>
                        Set the conversion rate from the selected currency to SAR
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCurrencySubmit}>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="currency_name">Currency Name</Label>
                          <Input
                            id="currency_name"
                            value={currencyFormData.currency_name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setCurrencyFormData((prev: CreateCurrencyConversionInput) => ({ ...prev, currency_name: e.target.value }))
                            }
                            placeholder="e.g., USD, IDR, EUR"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="conversion_rate">Conversion Rate to SAR</Label>
                          <Input
                            id="conversion_rate"
                            type="number"
                            step="0.0001"
                            min="0"
                            value={currencyFormData.conversion_rate}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setCurrencyFormData((prev: CreateCurrencyConversionInput) => ({ ...prev, conversion_rate: parseFloat(e.target.value) || 0 }))
                            }
                            placeholder="0.0000"
                            required
                          />
                          <p className="text-xs text-muted-foreground">
                            Example: 1 USD = 3.75 SAR, so rate is 3.75
                          </p>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleCloseCurrencyDialog}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting ? 'Saving...' : editingCurrency ? 'Update' : 'Create'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
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
              ) : currencies.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-muted-foreground">No currency conversions configured</p>
                  <p className="text-sm text-muted-foreground">
                    Add currency rates to accept payments in different currencies
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Currency</TableHead>
                        <TableHead>Rate to SAR</TableHead>
                        <TableHead>Example</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currencies.map((currency: CurrencyConversion) => (
                        <TableRow key={currency.id}>
                          <TableCell className="font-medium">
                            <Badge variant="outline" className="font-mono">
                              {currency.currency_name}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Percent className="h-3 w-3 text-gray-400" />
                              {currency.conversion_rate.toFixed(4)}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            1 {currency.currency_name} = {currency.conversion_rate.toFixed(2)} SAR
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {currency.updated_at.toLocaleDateString()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenCurrencyDialog(currency)}
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
                                    <AlertDialogTitle>Delete Currency</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete {currency.currency_name} conversion rate? 
                                      This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleDeleteCurrency(currency.id)}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
