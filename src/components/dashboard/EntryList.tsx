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
import { Trash2, Package, IndianRupee, Clock, Calendar, CalendarOff, FileText, ChevronRight } from 'lucide-react';
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

  // Calculate month total
  const monthTotal = sortedEntries.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
  const monthQuantity = sortedEntries.reduce((sum, e) => sum + e.quantityAtte, 0);

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
    <Card className="border-0 shadow-lg overflow-hidden">
      <CardHeader className="pb-4 bg-gradient-to-r from-accent/5 to-transparent">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-accent/10">
              <FileText className="h-5 w-5 text-accent" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Entries</CardTitle>
              <p className="text-xs text-muted-foreground">
                {sortedEntries.length} entries • ₹{monthTotal.toLocaleString()} total
              </p>
            </div>
          </div>
          
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px] rounded-xl">
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {monthOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {sortedEntries.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted/50 mb-4">
              <Package className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground font-medium">No entries for {monthOptions.find(m => m.value === selectedMonth)?.label}</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Add your first entry to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedEntries.map((entry, index) => (
              <EntryCard 
                key={entry.id} 
                entry={entry} 
                onDelete={handleDelete}
                isFirst={index === 0}
              />
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
  isFirst?: boolean;
}

const EntryCard = ({ entry, onDelete, isFirst }: EntryCardProps) => {
  const isNoMallige = entry.noMalligeToday;

  return (
    <div className={`group flex items-center justify-between p-4 rounded-xl transition-all duration-200 ${
      isNoMallige 
        ? 'bg-muted/30 border border-dashed border-muted-foreground/20' 
        : 'bg-muted/50 hover:bg-muted border border-transparent hover:border-border/50'
    } ${isFirst ? 'ring-2 ring-primary/10' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="font-semibold text-foreground">
            {format(parseISO(entry.date), 'dd MMM yyyy')}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(parseISO(entry.date), 'EEEE')}
          </span>
          {isNoMallige ? (
            <Badge variant="outline" className="gap-1 bg-muted text-muted-foreground border-muted-foreground/30">
              <CalendarOff className="h-3 w-3" />
              Day Off
            </Badge>
          ) : entry.rateStatus === 'pending' ? (
            <Badge variant="outline" className="gap-1 bg-warning/10 text-warning border-warning/30 animate-pulse">
              <Clock className="h-3 w-3" />
              Pending
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-success/10 text-success border-success/30">
              Confirmed
            </Badge>
          )}
        </div>
        {isNoMallige ? (
          <p className="text-sm text-muted-foreground italic">
            {entry.notes || 'No mallige given'}
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <Package className="h-3.5 w-3.5 text-primary" />
              {entry.quantityChendu} chendu
            </span>
            <span className="text-muted-foreground">({entry.quantityAtte} atte)</span>
            {entry.ratePerAtte && (
              <span className="text-muted-foreground">@ ₹{entry.ratePerAtte}/atte</span>
            )}
            {entry.flowerShopName && (
              <span className="hidden sm:inline">• {entry.flowerShopName}</span>
            )}
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-4">
        <div className="text-right">
          {isNoMallige ? (
            <span className="text-muted-foreground font-medium">₹0</span>
          ) : entry.totalAmount ? (
            <div className="flex items-center text-lg font-bold text-success">
              <IndianRupee className="h-4 w-4" />
              <span>{entry.totalAmount.toLocaleString()}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Entry?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this entry from {format(parseISO(entry.date), 'dd MMMM yyyy')}.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => onDelete(entry.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
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
