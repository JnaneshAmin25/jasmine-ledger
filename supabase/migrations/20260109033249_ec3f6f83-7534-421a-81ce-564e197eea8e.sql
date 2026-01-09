-- Create mallige_entries table for daily flower entries
CREATE TABLE public.mallige_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL DEFAULT 'chendu',
  rate_per_atte DECIMAL(10,2),
  earnings DECIMAL(10,2),
  rate_status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  no_mallige_today BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create mallige_rates table for daily market rates
CREATE TABLE public.mallige_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  rate_per_atte DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.mallige_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mallige_rates ENABLE ROW LEVEL SECURITY;

-- RLS policies for mallige_entries
CREATE POLICY "Users can view their own entries" 
ON public.mallige_entries FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own entries" 
ON public.mallige_entries FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own entries" 
ON public.mallige_entries FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own entries" 
ON public.mallige_entries FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for mallige_rates
CREATE POLICY "Users can view their own rates" 
ON public.mallige_rates FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own rates" 
ON public.mallige_rates FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rates" 
ON public.mallige_rates FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rates" 
ON public.mallige_rates FOR DELETE USING (auth.uid() = user_id);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_mallige_entries_updated_at
BEFORE UPDATE ON public.mallige_entries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mallige_rates_updated_at
BEFORE UPDATE ON public.mallige_rates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();