create schema if not exists pocket_private;
revoke all on schema pocket_private from public, anon;
create table pocket_private.settings (key text primary key, value text not null);
create function pocket_private.verified() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null and not is_anonymous)
$$;
create function pocket_private.owner() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u join pocket_private.settings s on s.key='owner_email' and lower(s.value)=lower(u.email) where u.id=auth.uid() and u.email_confirmed_at is not null and not u.is_anonymous)
$$;
revoke all on function pocket_private.verified(),pocket_private.owner() from public,anon;
grant usage on schema pocket_private to authenticated;
grant execute on function pocket_private.verified(),pocket_private.owner() to authenticated;
create table public.pocket_diaries (
 user_id uuid primary key references auth.users(id) on delete cascade,
 revision integer not null default 0 check(revision>=0),
 document jsonb not null check(jsonb_typeof(document)='object' and jsonb_typeof(document->'expenses')='array' and jsonb_typeof(document->'categories')='array' and jsonb_typeof(document->'albums')='array'),
 updated_at timestamptz not null default now()
);
alter table public.pocket_diaries enable row level security;
revoke all on public.pocket_diaries from anon;
grant select,insert,update,delete on public.pocket_diaries to authenticated;
create policy diary_owner on public.pocket_diaries for all to authenticated
 using ((select auth.uid())=user_id and (select pocket_private.verified()))
 with check ((select auth.uid())=user_id and (select pocket_private.verified()));
create function public.pocket_can_import() returns boolean language sql stable security invoker set search_path='' as $$ select pocket_private.owner() $$;
revoke all on function public.pocket_can_import() from public,anon;
grant execute on function public.pocket_can_import() to authenticated;
create function public.pocket_save(payload jsonb, expected_revision integer) returns public.pocket_diaries language plpgsql security invoker set search_path='' as $$
declare result public.pocket_diaries;
begin
 if auth.uid() is null or not pocket_private.verified() then raise exception 'Authentication required' using errcode='42501'; end if;
 if expected_revision=0 then
  insert into public.pocket_diaries(user_id,revision,document) values(auth.uid(),1,payload) on conflict do nothing returning * into result;
  if found then return result; end if;
 end if;
 update public.pocket_diaries set document=payload,revision=revision+1,updated_at=now() where user_id=auth.uid() and revision=expected_revision returning * into result;
 if not found then raise exception 'Diary changed in another tab. Reload before saving.' using errcode='40001'; end if;
 return result;
end $$;
revoke all on function public.pocket_save(jsonb,integer) from public,anon;
grant execute on function public.pocket_save(jsonb,integer) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('pocket-photos','pocket-photos',false,20971520,array['image/jpeg','image/png','image/webp']);
create policy pocket_photos_owner on storage.objects for all to authenticated
using (bucket_id='pocket-photos' and (storage.foldername(name))[1]=(select auth.uid())::text and (select pocket_private.verified()))
with check (bucket_id='pocket-photos' and (storage.foldername(name))[1]=(select auth.uid())::text and (select pocket_private.verified()));

