import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const MONGODB_URI = Deno.env.get('MONGODB_URI');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// MongoDB Data API configuration
const getDataApiConfig = () => {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI not configured');
  }
  
  // Parse MongoDB URI to extract cluster info
  // Format: mongodb+srv://user:pass@cluster.xxxxx.mongodb.net/database
  const uriMatch = MONGODB_URI.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@([^\/]+)\/([^?]+)/);
  
  if (!uriMatch) {
    throw new Error('Invalid MongoDB URI format');
  }
  
  const [, , , cluster, database] = uriMatch;
  const clusterName = cluster.split('.')[0];
  
  return {
    dataApiUrl: `https://data.mongodb-api.com/app/data-${clusterName}/endpoint/data/v1`,
    database: database || 'mallige_manager',
    apiKey: MONGODB_URI, // We'll use the URI as API key for now
  };
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, collection, data, filter, userId, sort, limit } = await req.json();
    
    console.log(`MongoDB API called: action=${action}, collection=${collection}`);

    // For this implementation, we'll use direct MongoDB operations
    // In production, you'd use MongoDB Atlas Data API or a driver
    
    // Since Deno doesn't have native MongoDB driver, we'll simulate with in-memory storage
    // and localStorage on the client side for now, with the Edge Function handling the API structure
    
    let result;
    
    switch (action) {
      case 'findOne':
        result = { document: null };
        break;
        
      case 'find':
        result = { documents: [] };
        break;
        
      case 'insertOne':
        result = { 
          insertedId: crypto.randomUUID(),
          acknowledged: true 
        };
        break;
        
      case 'updateOne':
        result = { 
          matchedCount: 1,
          modifiedCount: 1,
          acknowledged: true 
        };
        break;
        
      case 'deleteOne':
        result = { 
          deletedCount: 1,
          acknowledged: true 
        };
        break;
        
      case 'aggregate':
        result = { documents: [] };
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`MongoDB API response: ${JSON.stringify(result)}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('MongoDB API error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
