import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
for (const name of ['FOLIO_OWNER_EMAIL','FOLIO_OWNER_PASSWORD','FOLIO_READER_EMAIL','FOLIO_READER_PASSWORD']) {
  if (!process.env[name]) throw new Error(`Fill ${name} in the ignored .env.e2e.local file.`);
}
if (!url || !key) throw new Error('Public project configuration is missing.');
const clients = ['OWNER','READER'].map(() => createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}));
const [owner,reader]=clients;
const path=`verification/${randomUUID()}/permission-test.pdf`;
let bookId;
let uploaded=false;
const check=(condition,message)=>{if(!condition)throw new Error(message);};
try {
  for (const [index,role] of ['OWNER','READER'].entries()) {
    const {data,error}=await clients[index].auth.signInWithPassword({email:process.env[`FOLIO_${role}_EMAIL`],password:process.env[`FOLIO_${role}_PASSWORD`]});
    check(!error&&data.user, `${role.toLowerCase()} sign-in failed.`);
    const profile=await clients[index].from('profiles').select('role,invited').eq('user_id',data.user.id).single();
    check(!profile.error&&profile.data.invited&&profile.data.role===(index===0?'admin':'reader'),'Incorrect membership role.');
  }
  const settings=await fetch(url+'/auth/v1/settings',{headers:{apikey:key}}).then(r=>r.json());
  check(settings.disable_signup===true,'Public signups are still enabled. Disable them and save.');
  const ownerUser=(await owner.auth.getUser()).data.user;
  const readerUser=(await reader.auth.getUser()).data.user;
  const forged=await reader.from('profiles').update({role:'admin'}).eq('user_id',readerUser.id);
  check(!!forged.error,'Reader changed their trusted role.');
  const forbidden=await reader.from('books').insert({title:'Denied test',format:'PDF',storage_path:`denied-${randomUUID()}.pdf`});
  check(!!forbidden.error,'Reader inserted catalog metadata.');
  const upload=await owner.storage.from('books').upload(path,new Blob(['%PDF-1.4\nFolio permission-test fixture.\n%%EOF'],{type:'application/pdf'}),{contentType:'application/pdf'});
  check(!upload.error,'Owner file upload failed.'); uploaded=true;
  const record=await owner.from('books').insert({title:'Folio permission test',format:'PDF',storage_path:path,is_published:false}).select('id').single();
  check(!record.error,'Owner catalog insert failed.'); bookId=record.data.id;
  check(!(await reader.from('books').select('id').eq('id',bookId)).data?.length,'Reader can see unpublished metadata.');
  check(!!(await reader.storage.from('books').download(path)).error,'Reader downloaded an unpublished file.');
  check(!(await owner.from('books').update({is_published:true}).eq('id',bookId)).error,'Owner publication failed.');
  check((await reader.from('books').select('id').eq('id',bookId)).data?.length===1,'Reader cannot see a published book.');
  check(!(await reader.storage.from('books').download(path)).error,'Reader cannot read a published file.');
  const signed=await reader.storage.from('books').createSignedUrl(path,60);
  check(!signed.error && !!signed.data?.signedUrl,'Authorized signed URL creation failed.');
  check((await fetch(signed.data.signedUrl)).ok,'Authorized signed URL failed.');
  check(!(await fetch(owner.storage.from('books').getPublicUrl(path).data.publicUrl)).ok,'Private object exposed through public URL.');
  check(!!(await reader.storage.from('books').upload(`denied/${randomUUID()}.pdf`,new Blob(['denied'],{type:'application/pdf'}))).error,'Reader uploaded a library file.');
  for(const [client,user] of [[owner,ownerUser],[reader,readerUser]]) {
    check(!(await client.from('reading_progress').insert({user_id:user.id,book_id:bookId,locator_type:'pdf',locator:{page:0},percentage:20})).error,'Own progress save failed.');
  }
  const readerProgress=await reader.from('reading_progress').select('user_id').eq('book_id',bookId);
  const ownerProgress=await owner.from('reading_progress').select('user_id').eq('book_id',bookId);
  check(readerProgress.data?.length===1&&readerProgress.data[0].user_id===readerUser.id,'Reader progress isolation failed.');
  check(ownerProgress.data?.length===1&&ownerProgress.data[0].user_id===ownerUser.id,'Admin bypassed personal-data privacy.');
  console.info('Verified real owner/reader sign-in, role protection, catalog and Storage permissions, private signed access, and progress isolation.');
} finally {
  if (uploaded) {
    const {error}=await owner.storage.from('books').remove([path]);
    if(error) console.error('Verification object cleanup needs retry.');
  }
  if (bookId) {
    const {error}=await owner.from('books').delete().eq('id',bookId);
    if(error) console.error('Verification metadata cleanup needs retry.');
  }
  await Promise.all(clients.map(client=>client.auth.signOut({scope:'local'})));
}
