-- MarketPilot AI — KPI views (security_invoker so RLS on base tables applies)

create or replace view public.v_campaign_kpis
with (security_invoker = true) as
select
  c.campaign_id,
  c.client_id,
  c.campaign_name,
  c.platform,
  c.status,
  c.budget,
  c.start_date,
  c.end_date,
  coalesce(sum(m.impressions), 0)::bigint as impressions,
  coalesce(sum(m.clicks), 0)::bigint as clicks,
  coalesce(sum(m.spend), 0)::numeric as spend,
  coalesce(sum(m.leads_generated), 0)::int as leads,
  coalesce(sum(m.conversions), 0)::int as conversions,
  coalesce(sum(m.revenue), 0)::numeric as revenue,
  round(
    case when sum(m.impressions) > 0
      then sum(m.clicks)::numeric * 100 / sum(m.impressions)
      else 0 end, 2
  ) as ctr_pct,
  round(
    case when sum(m.spend) > 0 then sum(m.revenue) / sum(m.spend) else 0 end, 2
  ) as roas,
  round(
    case when sum(m.leads_generated) > 0
      then sum(m.spend) / sum(m.leads_generated)
      else 0 end, 2
  ) as cpl
from public.campaigns c
left join public.campaign_metrics m on m.campaign_id = c.campaign_id
group by c.campaign_id;

grant select on public.v_campaign_kpis to authenticated;
