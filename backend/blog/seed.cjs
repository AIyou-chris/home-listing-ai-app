// Explicit, idempotent starter-library import. It never overwrites existing rows or publishes.
const path=require('node:path');for(const file of ['../../.env.local','../../.env','../.env.local','../.env'])require('dotenv').config({path:path.resolve(__dirname,file),quiet:true});
const {createClient}=require('@supabase/supabase-js');const {createBlogService}=require('./service.cjs');
const url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw Error('Backend database credentials are needed for the seed.');
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
createBlogService({db}).seed().then(value=>console.log('Starter records added:',value.added)).catch(e=>{console.error(e.message,e.errors||[]);process.exitCode=1;});
