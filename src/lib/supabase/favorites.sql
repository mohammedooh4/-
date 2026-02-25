-- Create favorites table
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, product_id)
);

-- Turn on Row Level Security
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Create policies so users can only see, insert, and delete their own favorites
CREATE POLICY "Users can view their own favorites" 
    ON public.favorites FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites" 
    ON public.favorites FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites" 
    ON public.favorites FOR DELETE 
    USING (auth.uid() = user_id);
