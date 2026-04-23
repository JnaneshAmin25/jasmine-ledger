-- Enable realtime for mallige tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.mallige_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mallige_rates;