import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const MONGODB_URI = Deno.env.get('MONGODB_URI');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Parse MongoDB URI to extract Data API configuration
const getDataApiConfig = () => {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI not configured');
  }
  
  // For MongoDB Atlas Data API, we need:
  // 1. Data API App ID (from Atlas UI)
  // 2. API Key (from Atlas UI)
  // The MONGODB_URI should be in format: DATA_API_APP_ID:API_KEY:DATABASE_NAME
  // Or we parse the connection string
  
  const parts = MONGODB_URI.split(':');
  if (parts.length >= 3 && !MONGODB_URI.startsWith('mongodb')) {
    // Format: APP_ID:API_KEY:DATABASE
    return {
      appId: parts[0],
      apiKey: parts[1],
      database: parts[2] || 'mallige_manager',
      dataSource: parts[3] || 'Cluster0',
    };
  }
  
  // Fallback: parse mongodb+srv URI
  const uriMatch = MONGODB_URI.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@([^\/]+)\/([^?]*)/);
  if (uriMatch) {
    const [, , , cluster, database] = uriMatch;
    return {
      appId: '', // Would need to be configured separately
      apiKey: '',
      database: database || 'mallige_manager',
      dataSource: cluster.split('.')[0],
    };
  }
  
  throw new Error('Invalid MONGODB_URI format. Use DATA_API_APP_ID:API_KEY:DATABASE:DATA_SOURCE or mongodb+srv URI');
};

// Make request to MongoDB Atlas Data API
const mongoRequest = async (action: string, body: Record<string, unknown>) => {
  const config = getDataApiConfig();
  
  if (!config.appId || !config.apiKey) {
    // Fallback to local simulation if Data API not configured
    return null;
  }
  
  const url = `https://data.mongodb-api.com/app/${config.appId}/endpoint/data/v1/action/${action}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': config.apiKey,
    },
    body: JSON.stringify({
      dataSource: config.dataSource,
      database: config.database,
      ...body,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`MongoDB API error: ${error}`);
  }
  
  return response.json();
};

// In-memory storage fallback for when Data API is not configured
const inMemoryStorage: Record<string, Record<string, unknown[]>> = {};

const getCollection = (userId: string, collection: string): unknown[] => {
  if (!inMemoryStorage[userId]) {
    inMemoryStorage[userId] = {};
  }
  if (!inMemoryStorage[userId][collection]) {
    inMemoryStorage[userId][collection] = [];
  }
  return inMemoryStorage[userId][collection];
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, collection, data, filter, userId, update } = await req.json();
    
    console.log(`MongoDB API: action=${action}, collection=${collection}, userId=${userId}`);

    // Try MongoDB Data API first
    let config;
    try {
      config = getDataApiConfig();
    } catch {
      config = null;
    }

    let result;
    
    // If Data API is configured, use it
    if (config?.appId && config?.apiKey) {
      const enhancedFilter = { ...filter, userId };
      
      switch (action) {
        case 'find':
          result = await mongoRequest('find', { 
            collection, 
            filter: enhancedFilter,
            sort: { date: -1 },
          });
          break;
          
        case 'findOne':
          result = await mongoRequest('findOne', { collection, filter: enhancedFilter });
          break;
          
        case 'insertOne':
          result = await mongoRequest('insertOne', { 
            collection, 
            document: { ...data, userId, createdAt: new Date().toISOString() } 
          });
          break;
          
        case 'updateOne':
          result = await mongoRequest('updateOne', { 
            collection, 
            filter: enhancedFilter,
            update: { $set: { ...update, updatedAt: new Date().toISOString() } },
          });
          break;
          
        case 'deleteOne':
          result = await mongoRequest('deleteOne', { collection, filter: enhancedFilter });
          break;
          
        case 'sync':
          // Bulk sync: fetch all user data
          const entries = await mongoRequest('find', { 
            collection: 'entries', 
            filter: { userId },
            sort: { date: -1 },
          });
          const rates = await mongoRequest('find', { 
            collection: 'rates', 
            filter: { userId },
            sort: { date: -1 },
          });
          result = { 
            entries: entries?.documents || [], 
            rates: rates?.documents || [] 
          };
          break;
          
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } else {
      // Fallback to in-memory storage (for development/demo)
      const col = getCollection(userId, collection);
      
      switch (action) {
        case 'find':
          const filtered = col.filter((doc: any) => {
            if (!filter) return true;
            return Object.keys(filter).every(key => doc[key] === filter[key]);
          });
          result = { documents: filtered };
          break;
          
        case 'findOne':
          const found = col.find((doc: any) => {
            if (!filter) return true;
            return Object.keys(filter).every(key => doc[key] === filter[key]);
          });
          result = { document: found || null };
          break;
          
        case 'insertOne':
          const newDoc = { 
            ...data, 
            _id: crypto.randomUUID(),
            userId,
            createdAt: new Date().toISOString(),
          };
          col.push(newDoc);
          result = { insertedId: newDoc._id, document: newDoc };
          break;
          
        case 'updateOne':
          const idx = col.findIndex((doc: any) => {
            if (!filter) return false;
            return Object.keys(filter).every(key => doc[key] === filter[key]);
          });
          if (idx >= 0) {
            col[idx] = { 
              ...col[idx] as object, 
              ...update, 
              updatedAt: new Date().toISOString() 
            };
            result = { modifiedCount: 1, document: col[idx] };
          } else {
            result = { modifiedCount: 0 };
          }
          break;
          
        case 'deleteOne':
          const delIdx = col.findIndex((doc: any) => {
            if (!filter) return false;
            return Object.keys(filter).every(key => doc[key] === filter[key]);
          });
          if (delIdx >= 0) {
            col.splice(delIdx, 1);
            result = { deletedCount: 1 };
          } else {
            result = { deletedCount: 0 };
          }
          break;
          
        case 'sync':
          result = { 
            entries: getCollection(userId, 'entries'), 
            rates: getCollection(userId, 'rates') 
          };
          break;
          
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('MongoDB API error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
