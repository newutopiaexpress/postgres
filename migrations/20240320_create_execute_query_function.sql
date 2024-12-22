-- Create a function to safely execute SELECT queries
CREATE OR REPLACE FUNCTION public.execute_query(query_text TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    result JSONB;
    current_user_id UUID;
    cleaned_query TEXT;
BEGIN
    -- Get the current user's ID
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'No authenticated user found';
    END IF;
    
    -- Clean and validate query
    cleaned_query := regexp_replace(query_text, '\s+', ' ', 'g');
    cleaned_query := rtrim(cleaned_query, '; ');
    
    -- Replace auth.uid() with actual UUID in the query
    cleaned_query := replace(cleaned_query, 'auth.uid()', quote_literal(current_user_id));
    
    -- Ensure query has LIMIT clause
    IF position('limit' in lower(cleaned_query)) = 0 THEN
        cleaned_query := cleaned_query || ' LIMIT 100';
    END IF;
    
    -- Validate query
    IF NOT (
        cleaned_query ~* '^[\s\n]*SELECT'
        AND cleaned_query !~* '\b(DELETE|DROP|INSERT|UPDATE|ALTER|TRUNCATE|CREATE|GRANT|REVOKE)\b'
    ) THEN
        RAISE EXCEPTION 'Only SELECT queries are allowed';
    END IF;

    -- Execute query with error handling
    BEGIN
        EXECUTE format('
            WITH query_results AS (
                %s
            )
            SELECT COALESCE(
                jsonb_agg(row_to_json(subq)),
                jsonb_build_array()
            )
            FROM (
                SELECT * FROM query_results
            ) subq
        ', cleaned_query) INTO result;
        
        -- Log the executed query for debugging
        RAISE NOTICE 'Executed query: %', cleaned_query;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Query execution failed: %', SQLERRM;
    END;

    RETURN result;
END;
$$;

-- Add new function to get user-related data
CREATE OR REPLACE FUNCTION public.search_user_data(search_term TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    result JSONB;
BEGIN
    -- Execute search query
    EXECUTE format('
        WITH user_data AS (
            SELECT 
                COALESCE(m.name, ''N/A'') as model_name,
                COALESCE(m.type, ''N/A'') as model_type,
                COALESCE(m.status, ''N/A'') as model_status,
                COALESCE(m.modelId, ''N/A'') as model_id,
                COALESCE(m.created_at::text, ''N/A'') as model_created_at,
                COALESCE(c.credits, 0) as credit_balance,
                COALESCE(c.created_at::text, ''N/A'') as credit_date,
                (SELECT COUNT(*) FROM public.images i WHERE i.modelId = m.id) as image_count,
                (SELECT COUNT(*) FROM public.samples s WHERE s.modelId = m.id) as sample_count
            FROM public.models m
            FULL OUTER JOIN public.credits c ON c.user_id = m.user_id
            WHERE 
                m.name ILIKE $1 
                OR m.modelId ILIKE $1
                OR m.type ILIKE $1
            ORDER BY m.created_at DESC
            LIMIT 100
        )
        SELECT jsonb_agg(to_jsonb(user_data))
        FROM user_data;
    ', search_term) INTO result;

    RETURN result;
END;
$$;

-- Reset permissions
REVOKE ALL ON FUNCTION public.execute_query FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.execute_query TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_query TO service_role;
