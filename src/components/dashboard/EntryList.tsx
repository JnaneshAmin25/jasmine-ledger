import { useState } from 'react';
import { useMalligeData } from '@/hooks/useMalligeData';
import { DailyEntry } from '@/types/mallige';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { format, parseISO, subMonths } from 'date-fns';
import { Trash2, Package, IndianRupee, Clock, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const EntryList = () => {
  const { entries, deleteEntry, getEntriesForMonth } = useMalligeData();
  const { toast } = useToast();
  
  // Generate last 6 months for filter
  const monthOptions = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy'),
    };
  });

  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value);
  const filteredEntries = getEntriesForMonth(selectedMonth);

  // Sort by date descending
  const sortedEntries = [...filteredEntries].sort((a, b) => 
    b.date.localeCompare(a.date)
  );

  const handleDelete = async (id: string) => {
    const success = await deleteEntry(id);
    if (success) {
      toast({
        title: 'Entry Deleted',
        description: 'The entry has been removed.',
      });
    }
  };

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-lg font-semibold">Entries</CardTitle>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {sortedEntries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No entries for {monthOptions.find(m => m.value === selectedMonth)?.label}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedEntries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface EntryCardProps {
  entry: DailyEntry;
  onDelete: (id: string) => void;
}

const EntryCard = ({ entry, onDelete }: EntryCardProps) => {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-foreground">
            {format(parseISO(entry.date), 'dd MMM yyyy')}
          </span>
          {entry.rateStatus === 'pending' ? (
            <Badge variant="outline" className="gap-1 bg-warning/10 text-warning border-warning/30">
              <Clock className="h-3 w-3" />
              Pending
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-success/10 text-success border-success/30">
              Confirmed
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Package className="h-3.5 w-3.5" />
            {entry.quantityChendu} chendu ({entry.quantityAtte} atte)
          </span>
          {entry.ratePerAtte && (
            <span>@ ₹{entry.ratePerAtte}/atte</span>
          )}
          {entry.flowerShopName && (
            <span>• {entry.flowerShopName}</span>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="text-right">
          {entry.totalAmount ? (
            <span className="text-lg font-semibold text-foreground flex items-center">
              <IndianRupee className="h-4 w-4" />
              {entry.totalAmount.toLocaleString()}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Entry?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this entry from {format(parseISO(entry.date), 'dd MMMM yyyy')}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => onDelete(entry.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};
