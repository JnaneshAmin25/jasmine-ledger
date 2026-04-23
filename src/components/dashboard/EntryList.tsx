import { useState } from 'react';
import { useMalligeData } from '@/hooks/useMalligeData';
import { Switch } from '@/components/ui/switch';
import { DailyEntry } from '@/types/mallige';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { format, parseISO, subMonths } from 'date-fns';
import { Trash2, Package, IndianRupee, Clock, Calendar, CalendarOff, FileText, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const EntryList = () => {
  const { entries, deleteEntry, updatePaymentStatus, getEntriesForMonth } = useMalligeData();
  const { toast } = useToast();
  
  const monthOptions = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return { value: format(date, 'yyyy-MM'), label: format(date, 'MMMM yyyy') };
  });

  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value);
  const filteredEntries = getEntriesForMonth(selectedMonth);
  const sortedEntries = [...filteredEntries].sort((a, b) => b.date.localeCompare(a.date));
  const monthTotal = sortedEntries.reduce((sum, e) => sum + (e.totalAmount || 0), 0);

  const handleDelete = async (id: string) => {
    const success = await deleteEntry(id);
    if (success) {
      toast({ title: 'Entry Deleted', description: 'The entry has been removed.' });
    }
  };

  return (
    <div className="rounded-xl bg-card shadow-md overflow-hidden">
      <div className="px-4 pt-4 pb-2 bg-gradient-to-r from-accent/5 to-transparent">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-accent/10">
              <FileText className="h-4 w-4 text-accent" />
            </div>
            <div>
              <h3 className="text-base font-semibold">Entries</h3>
              <p className="text-[10px] text-muted-foreground">
                {sortedEntries.length} entries • ₹{monthTotal.toLocaleString()} total
              </p>
            </div>
          </div>
          
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[160px] rounded-xl h-9 text-sm">
              <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {monthOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="px-3 pb-3 pt-1">
        {sortedEntries.length === 0 ? (
          <div className="text-center py-10">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-muted/50 mb-3">
              <Package className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground font-medium text-sm">No entries for {monthOptions.find(m => m.value === selectedMonth)?.label}</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Add your first entry to get started</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {sortedEntries.map((entry, index) => (
              <EntryCard key={entry.id} entry={entry} onDelete={handleDelete} onTogglePayment={async (id, val) => {
                const success = await updatePaymentStatus(id, val);
                if (success) toast({ title: val ? 'Payment Received ✓' : 'Payment Unmarked' });
              }} isFirst={index === 0} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface EntryCardProps {
  entry: DailyEntry;
  onDelete: (id: string) => void;
  onTogglePayment: (id: string, value: boolean) => void;
  isFirst?: boolean;
}

const EntryCard = ({ entry, onDelete, onTogglePayment, isFirst }: EntryCardProps) => {
  const isNoMallige = entry.noMalligeToday;

  return (
    <div className={`group flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
      isNoMallige 
        ? 'bg-muted/30 border border-dashed border-muted-foreground/20' 
        : 'bg-muted/40 hover:bg-muted/60 border border-transparent hover:border-border/50'
    } ${isFirst ? 'ring-1 ring-primary/10' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="font-semibold text-sm text-foreground">
            {format(parseISO(entry.date), 'dd MMM')}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {format(parseISO(entry.date), 'EEE')}
          </span>
          {isNoMallige ? (
            <Badge variant="outline" className="gap-0.5 text-[10px] bg-muted text-muted-foreground border-muted-foreground/30 py-0 h-5">
              <CalendarOff className="h-2.5 w-2.5" />
              Off
            </Badge>
          ) : entry.rateStatus === 'pending' ? (
            <Badge variant="outline" className="gap-0.5 text-[10px] bg-warning/10 text-warning border-warning/30 animate-pulse py-0 h-5">
              <Clock className="h-2.5 w-2.5" />
              Pending
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/30 py-0 h-5">
              ✓
            </Badge>
          )}
        </div>
        {isNoMallige ? (
          <p className="text-xs text-muted-foreground italic">{entry.notes || 'No mallige given'}</p>
        ) : (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 font-medium text-foreground">
              <Package className="h-3 w-3 text-primary" />
              {entry.quantityChendu}c
            </span>
            <span>({entry.quantityAtte}a)</span>
            {entry.ratePerAtte && <span>@₹{entry.ratePerAtte}</span>}
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        {/* Payment toggle */}
        {!isNoMallige && (
          <div className="flex flex-col items-center gap-0.5">
            <Switch
              checked={entry.paymentReceived}
              onCheckedChange={(val) => onTogglePayment(entry.id, val)}
              className="scale-75"
            />
            <span className={`text-[9px] ${entry.paymentReceived ? 'text-success font-medium' : 'text-muted-foreground'}`}>
              {entry.paymentReceived ? 'Paid' : 'Unpaid'}
            </span>
          </div>
        )}

        <div className="text-right">
          {isNoMallige ? (
            <span className="text-muted-foreground text-sm">₹0</span>
          ) : entry.totalAmount ? (
            <div className="flex items-center text-sm font-bold text-success">
              <IndianRupee className="h-3 w-3" />
              <span>{entry.totalAmount.toLocaleString()}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Entry?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the entry from {format(parseISO(entry.date), 'dd MMMM yyyy')}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(entry.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};
