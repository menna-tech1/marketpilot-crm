-- MarketPilot AI — demo data generator
-- Called from the UI ("Load demo data") via supabase.rpc('seed_demo_data').
-- SECURITY DEFINER so it can also write campaign_metrics (read-only to clients),
-- but every row is still scoped to auth.uid() and resets are owner-filtered.

create or replace function public.seed_demo_data(p_reset boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_companies text[] := array[
    'Northwind Retail', 'Bluepeak Fitness', 'Lumen SaaS', 'Cedar & Co',
    'Atlas Logistics', 'Nova Dental', 'Harbor Finance', 'Greenline Foods',
    'Pixel Studio', 'Summit Travel'
  ];
  v_industries text[] := array[
    'Retail', 'Health & Fitness', 'SaaS', 'Home & Living',
    'Logistics', 'Healthcare', 'Finance', 'FMCG', 'Creative', 'Travel'
  ];
  v_platforms text[] := array['Google', 'Meta', 'LinkedIn', 'TikTok', 'Email'];
  v_sources text[] := array['LinkedIn', 'Google Ads', 'Meta Ads', 'Referral', 'Organic', 'Webinar'];
  v_first text[] := array[
    'John', 'Sarah', 'Omar', 'Lina', 'David', 'Maya', 'Youssef', 'Emma',
    'Karim', 'Nadia', 'James', 'Hana', 'Ali', 'Sofia', 'Tarek'
  ];
  v_last text[] := array[
    'Smith', 'Hassan', 'Johnson', 'Khalil', 'Brown', 'Nasser', 'Miller',
    'Aziz', 'Wilson', 'Farah', 'Taylor', 'Said'
  ];
  v_client_ids uuid[] := '{}';
  v_campaign_ids uuid[] := '{}';
  v_client uuid;
  v_campaign uuid;
  v_i int;
  v_score int;
  v_budget numeric;
  v_start date;
  v_status text;
  v_client_count int := 10;
  v_campaign_count int := 25;
  v_lead_count int := 500;
  v_metric_count int;
begin
  if v_uid is null then
    raise exception 'seed_demo_data requires an authenticated user';
  end if;

  if p_reset then
    delete from public.clients where owner_id = v_uid;
  elsif exists (select 1 from public.clients where owner_id = v_uid) then
    return jsonb_build_object('skipped', true, 'reason', 'account already has data');
  end if;

  -- clients ---------------------------------------------------------------
  for v_i in 1..v_client_count loop
    insert into public.clients (owner_id, company_name, industry, contact_email, status, created_at)
    values (
      v_uid,
      v_companies[v_i],
      v_industries[v_i],
      lower(replace(v_companies[v_i], ' ', '')) || '@example.com',
      case when v_i <= 8 then 'active' when v_i = 9 then 'paused' else 'churned' end,
      now() - ((v_client_count - v_i) * interval '9 days')
    )
    returning client_id into v_client;

    v_client_ids := array_append(v_client_ids, v_client);
  end loop;

  -- campaigns -------------------------------------------------------------
  for v_i in 1..v_campaign_count loop
    v_client := v_client_ids[1 + ((v_i - 1) % v_client_count)];
    v_start := current_date - ((v_i % 6) * 30 + 30);
    v_budget := (3000 + (v_i * 937) % 22000)::numeric;
    v_status := case when v_i % 7 = 0 then 'paused' when v_i % 11 = 0 then 'completed' else 'active' end;

    insert into public.campaigns (client_id, campaign_name, platform, budget, start_date, end_date, status, created_at)
    values (
      v_client,
      (array['Q1 Brand Search', 'Q1 Performance Max', 'Q2 Retargeting', 'Q2 Lead Gen',
             'Q3 Prospecting', 'Q3 Brand Awareness', 'Q4 Conversion'])[1 + (v_i % 7)] || ' #' || v_i,
      v_platforms[1 + (v_i % 5)],
      v_budget,
      v_start,
      case when v_status = 'completed' then v_start + 90 else null end,
      v_status,
      now() - ((v_campaign_count - v_i) * interval '3 days')
    )
    returning campaign_id into v_campaign;

    v_campaign_ids := array_append(v_campaign_ids, v_campaign);
  end loop;

  -- campaign metrics: 120 days per campaign (~3,000 rows) -----------------
  with days as (
    select c.campaign_id,
           c.budget,
           (current_date - d)::date as metric_date,
           (700 + random() * 4300)::bigint as impressions
    from public.campaigns c
    cross join generate_series(0, 119) d
    where c.campaign_id = any (v_campaign_ids)
  ),
  calc as (
    select campaign_id,
           metric_date,
           impressions,
           greatest(1, (impressions * (0.018 + random() * 0.03))::int) as clicks,
           budget
    from days
  ),
  priced as (
    select campaign_id,
           metric_date,
           impressions,
           clicks,
           round((budget / 120 * (0.75 + random() * 0.5))::numeric, 2) as spend
    from calc
  )
  insert into public.campaign_metrics
    (campaign_id, metric_date, impressions, clicks, spend, leads_generated, conversions, revenue)
  select p.campaign_id,
         p.metric_date,
         p.impressions,
         p.clicks,
         p.spend,
         l.leads,
         l.conversions,
         round((l.conversions * l.deal_value)::numeric, 2)
  from priced p
  cross join lateral (
    select v.leads,
           (v.leads * (0.1 + random() * 0.3))::int as conversions,
           (250 + random() * 1200) as deal_value
    from (
      select greatest(0, (p.clicks * (0.03 + random() * 0.06))::int) as leads
    ) v
  ) l;

  get diagnostics v_metric_count = row_count;

  -- leads -----------------------------------------------------------------
  for v_i in 1..v_lead_count loop
    v_client := v_client_ids[1 + ((v_i - 1) % v_client_count)];

    select campaign_id into v_campaign
    from public.campaigns
    where client_id = v_client
    order by random()
    limit 1;

    v_score := (random() * 100)::int;

    insert into public.leads
      (client_id, campaign_id, name, email, source, budget, lead_score, lead_category, status, created_at)
    values (
      v_client,
      v_campaign,
      v_first[1 + (v_i % 15)] || ' ' || v_last[1 + (v_i % 12)],
      lower(v_first[1 + (v_i % 15)] || '.' || v_last[1 + (v_i % 12)] || v_i || '@example.com'),
      v_sources[1 + (v_i % 6)],
      (500 + (v_i * 173) % 19500)::numeric,
      v_score,
      case when v_score >= 70 then 'Hot' when v_score >= 40 then 'Warm' else 'Cold' end,
      (array['new', 'new', 'contacted', 'qualified', 'lost'])[1 + (v_i % 5)],
      now() - ((v_i % 45) * interval '1 day')
    );
  end loop;

  -- documents (upload real files, then WF-03 ingests them) ----------------
  for v_i in 1..3 loop
    insert into public.documents (client_id, file_name, storage_path, status)
    values (
      v_client_ids[v_i],
      'brand-guidelines-' || v_i || '.pdf',
      v_client_ids[v_i]::text || '/brand-guidelines-' || v_i || '.pdf',
      'queued'
    );
  end loop;

  return jsonb_build_object(
    'skipped', false,
    'clients', v_client_count,
    'campaigns', v_campaign_count,
    'leads', v_lead_count,
    'metrics', v_metric_count,
    'documents', 3
  );
end;
$$;

revoke all on function public.seed_demo_data(boolean) from public;
grant execute on function public.seed_demo_data(boolean) to authenticated;
