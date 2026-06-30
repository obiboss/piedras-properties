-- Piedras Properties Developer Database Migration
-- Generated from live BOPA developer schema export, cleaned for a dedicated Piedras Supabase project.
-- Run this ONLY in the new Piedras Supabase project, not in BOPA.

begin;

-- 1. Extensions
create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;

-- 2. Enum types
-- public.developer_account_status
do $$ begin
  create type public.developer_account_status as enum ('active', 'suspended', 'pending_verification');
exception when duplicate_object then null;
end $$;;

-- public.developer_buyer_status
do $$ begin
  create type public.developer_buyer_status as enum ('prospective', 'assigned', 'active', 'cancelled');
exception when duplicate_object then null;
end $$;;

-- public.developer_estate_status
do $$ begin
  create type public.developer_estate_status as enum ('planning', 'selling', 'paused', 'sold_out', 'archived');
exception when duplicate_object then null;
end $$;;

-- public.developer_payment_allocation_recipient_type
do $$ begin
  create type public.developer_payment_allocation_recipient_type as enum ('developer', 'platform', 'agent');
exception when duplicate_object then null;
end $$;;

-- public.developer_payment_allocation_status
do $$ begin
  create type public.developer_payment_allocation_status as enum ('pending', 'paid', 'failed', 'cancelled');
exception when duplicate_object then null;
end $$;;

-- public.developer_payment_intent_status
do $$ begin
  create type public.developer_payment_intent_status as enum ('initialized', 'paid', 'failed', 'expired', 'cancelled');
exception when duplicate_object then null;
end $$;;

-- public.developer_payment_plan_mode
do $$ begin
  create type public.developer_payment_plan_mode as enum ('outright', 'fixed_installment', 'milestone_based', 'flexible');
exception when duplicate_object then null;
end $$;;

-- public.developer_payment_plan_status
do $$ begin
  create type public.developer_payment_plan_status as enum ('draft', 'active', 'completed', 'cancelled');
exception when duplicate_object then null;
end $$;;

-- public.developer_payment_schedule_item_status
do $$ begin
  create type public.developer_payment_schedule_item_status as enum ('pending', 'part_paid', 'paid', 'overdue', 'cancelled');
exception when duplicate_object then null;
end $$;;

-- public.developer_plot_assignment_status
do $$ begin
  create type public.developer_plot_assignment_status as enum ('reserved', 'active', 'cancelled', 'converted_to_sale');
exception when duplicate_object then null;
end $$;;

-- public.developer_plot_status
do $$ begin
  create type public.developer_plot_status as enum ('available', 'reserved', 'active', 'sold', 'blocked');
exception when duplicate_object then null;
end $$;;

-- public.developer_sale_ledger_entry_type
do $$ begin
  create type public.developer_sale_ledger_entry_type as enum ('sale_charge', 'payment_credit', 'reversal_debit', 'adjustment_credit', 'adjustment_debit');
exception when duplicate_object then null;
end $$;;

-- public.developer_sale_payment_status
do $$ begin
  create type public.developer_sale_payment_status as enum ('posted', 'reversed');
exception when duplicate_object then null;
end $$;;

-- public.developer_sale_status
do $$ begin
  create type public.developer_sale_status as enum ('draft', 'active', 'completed', 'cancelled', 'defaulting', 'exited');
exception when duplicate_object then null;
end $$;;

-- public.notification_channel
do $$ begin
  create type public.notification_channel as enum ('whatsapp', 'sms', 'email', 'in_app');
exception when duplicate_object then null;
end $$;;

-- public.notification_status
do $$ begin
  create type public.notification_status as enum ('pending', 'sent', 'delivered', 'failed');
exception when duplicate_object then null;
end $$;;

-- public.notification_type
do $$ begin
  create type public.notification_type as enum ('rent_due', 'overdue', 'receipt', 'onboarding_invite', 'renewal_notice', 'increment_notice', 'balance_confirmation', 'custom');
exception when duplicate_object then null;
end $$;;

-- public.user_role
do $$ begin
  create type public.user_role as enum ('landlord', 'tenant', 'caretaker', 'agent', 'platform_admin', 'developer');
exception when duplicate_object then null;
end $$;;

-- 3. Tables
-- public.profiles
create table if not exists public.profiles (
  id uuid not null,
  role user_role not null,
  full_name text not null,
  phone_number text not null,
  email text,
  country_code character(2) default 'NG'::bpchar not null,
  preferred_currency character(3) default 'NGN'::bpchar not null,
  is_active boolean default true not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  environment_mode text default 'live'::text not null
);;

-- public.audit_logs
create table if not exists public.audit_logs (
  id uuid default gen_random_uuid() not null,
  landlord_id uuid,
  tenant_id uuid,
  tenancy_id uuid,
  unit_id uuid,
  property_id uuid,
  actor_profile_id uuid,
  actor_role text default 'system'::text not null,
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  description text not null,
  metadata jsonb default '{}'::jsonb not null,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone default now() not null
);;

-- public.notifications
create table if not exists public.notifications (
  id uuid default gen_random_uuid() not null,
  landlord_id uuid not null,
  tenant_id uuid,
  channel notification_channel not null,
  notification_type notification_type not null,
  message_body text not null,
  status notification_status default 'pending'::notification_status not null,
  sent_at timestamp with time zone,
  delivered_at timestamp with time zone,
  external_reference text,
  failure_reason text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);;

-- public.developer_accounts
create table if not exists public.developer_accounts (
  id uuid default gen_random_uuid() not null,
  owner_profile_id uuid not null,
  company_name text not null,
  company_phone text not null,
  company_email text,
  rc_number text,
  office_address text,
  status developer_account_status default 'active'::developer_account_status not null,
  subscription_plan text default 'starter'::text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);;

-- public.developer_profiles
create table if not exists public.developer_profiles (
  id uuid default gen_random_uuid() not null,
  developer_account_id uuid not null,
  profile_id uuid not null,
  full_name text not null,
  phone_number text not null,
  email text,
  role text default 'developer_owner'::text not null,
  is_active boolean default true not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  staff_title text,
  invited_by_profile_id uuid,
  manager_developer_profile_id uuid,
  accepted_at timestamp with time zone,
  revoked_at timestamp with time zone
);;

-- public.developer_estates
create table if not exists public.developer_estates (
  id uuid default gen_random_uuid() not null,
  developer_account_id uuid not null,
  estate_name text not null,
  location text not null,
  city text,
  state text,
  country text default 'Nigeria'::text not null,
  description text,
  status developer_estate_status default 'planning'::developer_estate_status not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  lga text,
  initial_payment_percentage numeric(5,2) default 25.00 not null,
  balance_spread_months integer default 12 not null,
  installment_interval text default 'monthly'::text not null,
  default_payment_plan_mode text default 'fixed_installment'::text not null,
  land_size_value numeric(14,2),
  land_size_unit text,
  gross_land_size_sqm numeric(16,2),
  reserved_land_percentage numeric(5,2) default 0,
  usable_land_size_sqm numeric(16,2),
  default_plot_size_sqm numeric(14,2),
  planned_plot_count integer
);;

-- public.developer_plot_types
create table if not exists public.developer_plot_types (
  id uuid default gen_random_uuid() not null,
  developer_account_id uuid not null,
  estate_id uuid not null,
  type_name text not null,
  size_label text not null,
  default_price numeric(14,2) not null,
  description text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);;

-- public.developer_plots
create table if not exists public.developer_plots (
  id uuid default gen_random_uuid() not null,
  developer_account_id uuid not null,
  estate_id uuid not null,
  plot_type_id uuid,
  plot_number text not null,
  size_label text not null,
  price numeric(14,2) not null,
  status developer_plot_status default 'available'::developer_plot_status not null,
  notes text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);;

-- public.developer_buyers
create table if not exists public.developer_buyers (
  id uuid default gen_random_uuid() not null,
  developer_account_id uuid not null,
  full_name text not null,
  phone_number text not null,
  email text,
  nin text,
  next_of_kin_name text,
  next_of_kin_phone text,
  residential_address text,
  status developer_buyer_status default 'prospective'::developer_buyer_status not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);;

-- public.developer_plot_assignments
create table if not exists public.developer_plot_assignments (
  id uuid default gen_random_uuid() not null,
  developer_account_id uuid not null,
  estate_id uuid not null,
  plot_id uuid not null,
  buyer_id uuid not null,
  status developer_plot_assignment_status default 'reserved'::developer_plot_assignment_status not null,
  assignment_note text,
  assigned_at timestamp with time zone default now() not null,
  cancelled_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);;

-- public.developer_sales
create table if not exists public.developer_sales (
  id uuid default gen_random_uuid() not null,
  developer_account_id uuid not null,
  estate_id uuid not null,
  plot_id uuid not null,
  buyer_id uuid not null,
  plot_assignment_id uuid not null,
  sale_reference text not null,
  payment_plan_mode developer_payment_plan_mode not null,
  total_price_locked numeric(14,2) not null,
  initial_deposit_amount numeric(14,2) default 0 not null,
  sale_date date default CURRENT_DATE not null,
  expected_completion_date date,
  status developer_sale_status default 'active'::developer_sale_status not null,
  agreement_generated_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);;

-- public.developer_payment_plans
create table if not exists public.developer_payment_plans (
  id uuid default gen_random_uuid() not null,
  developer_account_id uuid not null,
  sale_id uuid not null,
  payment_plan_mode developer_payment_plan_mode not null,
  total_amount numeric(14,2) not null,
  schedule_start_date date not null,
  status developer_payment_plan_status default 'active'::developer_payment_plan_status not null,
  notes text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);;

-- public.developer_payment_schedule_items
create table if not exists public.developer_payment_schedule_items (
  id uuid default gen_random_uuid() not null,
  developer_account_id uuid not null,
  payment_plan_id uuid not null,
  sale_id uuid not null,
  label text not null,
  due_date date not null,
  expected_amount numeric(14,2) not null,
  amount_paid numeric(14,2) default 0 not null,
  status developer_payment_schedule_item_status default 'pending'::developer_payment_schedule_item_status not null,
  sort_order integer default 0 not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);;

-- public.developer_payment_intents
create table if not exists public.developer_payment_intents (
  id uuid default gen_random_uuid() not null,
  developer_account_id uuid not null,
  sale_id uuid not null,
  buyer_id uuid not null,
  estate_id uuid not null,
  plot_id uuid not null,
  schedule_item_id uuid,
  paystack_reference text not null,
  paystack_access_code text,
  authorization_url text,
  installment_amount numeric(14,2) not null,
  platform_fee_amount numeric(14,2) default 0 not null,
  total_amount numeric(14,2) not null,
  currency_code text default 'NGN'::text not null,
  status developer_payment_intent_status default 'initialized'::developer_payment_intent_status not null,
  paid_at timestamp with time zone,
  verified_at timestamp with time zone,
  expires_at timestamp with time zone,
  processed_payment_id uuid,
  idempotency_key text not null,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);;

-- public.developer_sale_payments
create table if not exists public.developer_sale_payments (
  id uuid default gen_random_uuid() not null,
  developer_account_id uuid not null,
  sale_id uuid not null,
  buyer_id uuid not null,
  estate_id uuid not null,
  plot_id uuid not null,
  schedule_item_id uuid,
  payment_intent_id uuid,
  amount_paid numeric(14,2) not null,
  platform_fee_amount numeric(14,2) default 0 not null,
  total_paid_amount numeric(14,2) not null,
  payment_method text default 'paystack_gateway'::text not null,
  payment_reference text not null,
  payment_date date default CURRENT_DATE not null,
  status developer_sale_payment_status default 'posted'::developer_sale_payment_status not null,
  balance_before numeric(14,2) not null,
  balance_after numeric(14,2) not null,
  receipt_number text,
  receipt_path text,
  receipt_generated boolean default false not null,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);;

-- public.developer_payment_allocations
create table if not exists public.developer_payment_allocations (
  id uuid default gen_random_uuid() not null,
  developer_account_id uuid not null,
  payment_intent_id uuid not null,
  payment_id uuid,
  sale_id uuid not null,
  buyer_id uuid not null,
  recipient_type developer_payment_allocation_recipient_type not null,
  recipient_profile_id uuid,
  amount numeric(14,2) not null,
  currency_code text default 'NGN'::text not null,
  status developer_payment_allocation_status default 'pending'::developer_payment_allocation_status not null,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);;

-- public.developer_sale_ledger_entries
create table if not exists public.developer_sale_ledger_entries (
  id uuid default gen_random_uuid() not null,
  developer_account_id uuid not null,
  sale_id uuid not null,
  buyer_id uuid not null,
  payment_id uuid,
  entry_type developer_sale_ledger_entry_type not null,
  debit_amount numeric(14,2) default 0 not null,
  credit_amount numeric(14,2) default 0 not null,
  running_balance numeric(14,2) not null,
  description text not null,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null
);;

-- public.developer_buyer_purchase_links
create table if not exists public.developer_buyer_purchase_links (
  id uuid default gen_random_uuid() not null,
  developer_account_id uuid not null,
  estate_id uuid not null,
  plot_id uuid not null,
  buyer_id uuid,
  sale_id uuid,
  token_hash text not null,
  buyer_name text,
  buyer_phone text not null,
  buyer_email text,
  buyer_full_name text,
  buyer_nin text,
  buyer_address text,
  buyer_next_of_kin_name text,
  buyer_next_of_kin_phone text,
  payment_plan_mode text not null,
  first_payment_amount numeric(14,2) not null,
  total_price numeric(14,2) not null,
  note text,
  status text default 'pending'::text not null,
  expires_at timestamp with time zone,
  used_at timestamp with time zone,
  created_by_profile_id uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);;

-- public.developer_buyer_sale_access_tokens
create table if not exists public.developer_buyer_sale_access_tokens (
  id uuid default gen_random_uuid() not null,
  developer_account_id uuid not null,
  sale_id uuid not null,
  buyer_id uuid not null,
  token_hash text not null,
  label text default 'Buyer payment portal'::text not null,
  expires_at timestamp with time zone,
  revoked_at timestamp with time zone,
  last_used_at timestamp with time zone,
  created_by_profile_id uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);;

-- public.developer_paystack_accounts
create table if not exists public.developer_paystack_accounts (
  id uuid default gen_random_uuid() not null,
  developer_account_id uuid not null,
  business_name text not null,
  bank_code text not null,
  bank_name text not null,
  account_number text not null,
  account_name text not null,
  paystack_subaccount_code text not null,
  paystack_subaccount_id bigint,
  currency_code text default 'NGN'::text not null,
  is_active boolean default true not null,
  verification_status text default 'unverified'::text not null,
  verified_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);;

-- public.developer_document_templates
create table if not exists public.developer_document_templates (
  id uuid default gen_random_uuid() not null,
  developer_account_id uuid not null,
  template_type text not null,
  template_name text not null,
  template_body text not null,
  is_default_copy boolean default false not null,
  is_active boolean default true not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);;

-- public.developer_sale_documents
create table if not exists public.developer_sale_documents (
  id uuid default gen_random_uuid() not null,
  developer_account_id uuid not null,
  sale_id uuid not null,
  document_type text not null,
  title text not null,
  storage_path text not null,
  status text default 'generated'::text not null,
  generated_at timestamp with time zone default now() not null,
  physical_original_issued_at timestamp with time zone,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);;

-- public.developer_staff_invites
create table if not exists public.developer_staff_invites (
  id uuid default gen_random_uuid() not null,
  developer_account_id uuid not null,
  invited_by_profile_id uuid not null,
  manager_developer_profile_id uuid,
  token_hash text not null,
  full_name text not null,
  phone_number text not null,
  email text,
  staff_title text not null,
  developer_profile_role text not null,
  permissions text[] default '{}'::text[] not null,
  status text default 'pending'::text not null,
  expires_at timestamp with time zone not null,
  accepted_profile_id uuid,
  accepted_developer_profile_id uuid,
  accepted_at timestamp with time zone,
  revoked_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);;

-- public.developer_staff_permissions
create table if not exists public.developer_staff_permissions (
  id uuid default gen_random_uuid() not null,
  developer_account_id uuid not null,
  developer_profile_id uuid not null,
  permission_key text not null,
  granted_by_profile_id uuid,
  created_at timestamp with time zone default now() not null
);;

-- public.developer_staff_role_links
create table if not exists public.developer_staff_role_links (
  id uuid default gen_random_uuid() not null,
  developer_account_id uuid not null,
  created_by_profile_id uuid not null,
  token_hash text not null,
  staff_title text not null,
  developer_profile_role text not null,
  permissions text[] default '{}'::text[] not null,
  status text default 'active'::text not null,
  expires_at timestamp with time zone not null,
  accepted_count integer default 0 not null,
  revoked_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);;

-- 4. Constraints
-- public.audit_logs.audit_logs_actor_profile_id_fkey
do $$
begin
  alter table public.audit_logs add constraint audit_logs_actor_profile_id_fkey FOREIGN KEY (actor_profile_id) REFERENCES profiles(id) ON DELETE SET NULL
;
exception
  when duplicate_object then null;
end $$;

-- public.audit_logs.audit_logs_landlord_id_fkey
do $$
begin
  alter table public.audit_logs add constraint audit_logs_landlord_id_fkey FOREIGN KEY (landlord_id) REFERENCES profiles(id) ON DELETE SET NULL
;
exception
  when duplicate_object then null;
end $$;

-- public.audit_logs.audit_logs_pkey
do $$
begin
  alter table public.audit_logs add constraint audit_logs_pkey PRIMARY KEY (id)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_accounts.developer_accounts_company_name_not_empty
do $$
begin
  alter table public.developer_accounts add constraint developer_accounts_company_name_not_empty CHECK (char_length(TRIM(BOTH FROM company_name)) >= 2)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_accounts.developer_accounts_company_phone_not_empty
do $$
begin
  alter table public.developer_accounts add constraint developer_accounts_company_phone_not_empty CHECK (char_length(TRIM(BOTH FROM company_phone)) >= 7)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_accounts.developer_accounts_owner_profile_id_fkey
do $$
begin
  alter table public.developer_accounts add constraint developer_accounts_owner_profile_id_fkey FOREIGN KEY (owner_profile_id) REFERENCES profiles(id) ON DELETE CASCADE
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_accounts.developer_accounts_pkey
do $$
begin
  alter table public.developer_accounts add constraint developer_accounts_pkey PRIMARY KEY (id)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_buyer_purchase_links.developer_buyer_purchase_links_buyer_id_fkey
do $$
begin
  alter table public.developer_buyer_purchase_links add constraint developer_buyer_purchase_links_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES developer_buyers(id) ON DELETE SET NULL
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_buyer_purchase_links.developer_buyer_purchase_links_developer_account_id_fkey
do $$
begin
  alter table public.developer_buyer_purchase_links add constraint developer_buyer_purchase_links_developer_account_id_fkey FOREIGN KEY (developer_account_id) REFERENCES developer_accounts(id) ON DELETE CASCADE
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_buyer_purchase_links.developer_buyer_purchase_links_estate_id_fkey
do $$
begin
  alter table public.developer_buyer_purchase_links add constraint developer_buyer_purchase_links_estate_id_fkey FOREIGN KEY (estate_id) REFERENCES developer_estates(id) ON DELETE CASCADE
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_buyer_purchase_links.developer_buyer_purchase_links_first_payment_lte_total
do $$
begin
  alter table public.developer_buyer_purchase_links add constraint developer_buyer_purchase_links_first_payment_lte_total CHECK (first_payment_amount <= total_price)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_buyer_purchase_links.developer_buyer_purchase_links_first_payment_positive
do $$
begin
  alter table public.developer_buyer_purchase_links add constraint developer_buyer_purchase_links_first_payment_positive CHECK (first_payment_amount > 0::numeric)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_buyer_purchase_links.developer_buyer_purchase_links_payment_plan_mode_check
do $$
begin
  alter table public.developer_buyer_purchase_links add constraint developer_buyer_purchase_links_payment_plan_mode_check CHECK (payment_plan_mode = ANY (ARRAY['outright'::text, 'fixed_installment'::text, 'flexible'::text]))
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_buyer_purchase_links.developer_buyer_purchase_links_pkey
do $$
begin
  alter table public.developer_buyer_purchase_links add constraint developer_buyer_purchase_links_pkey PRIMARY KEY (id)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_buyer_purchase_links.developer_buyer_purchase_links_plot_id_fkey
do $$
begin
  alter table public.developer_buyer_purchase_links add constraint developer_buyer_purchase_links_plot_id_fkey FOREIGN KEY (plot_id) REFERENCES developer_plots(id) ON DELETE CASCADE
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_buyer_purchase_links.developer_buyer_purchase_links_sale_id_fkey
do $$
begin
  alter table public.developer_buyer_purchase_links add constraint developer_buyer_purchase_links_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES developer_sales(id) ON DELETE SET NULL
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_buyer_purchase_links.developer_buyer_purchase_links_status_check
do $$
begin
  alter table public.developer_buyer_purchase_links add constraint developer_buyer_purchase_links_status_check CHECK (status = ANY (ARRAY['pending'::text, 'details_submitted'::text, 'payment_started'::text, 'paid'::text, 'cancelled'::text, 'expired'::text]))
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_buyer_purchase_links.developer_buyer_purchase_links_token_hash_key
do $$
begin
  alter table public.developer_buyer_purchase_links add constraint developer_buyer_purchase_links_token_hash_key UNIQUE (token_hash)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_buyer_purchase_links.developer_buyer_purchase_links_total_price_positive
do $$
begin
  alter table public.developer_buyer_purchase_links add constraint developer_buyer_purchase_links_total_price_positive CHECK (total_price > 0::numeric)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_buyer_sale_access_tokens.developer_buyer_sale_access_tokens_buyer_id_fkey
do $$
begin
  alter table public.developer_buyer_sale_access_tokens add constraint developer_buyer_sale_access_tokens_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES developer_buyers(id) ON DELETE CASCADE
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_buyer_sale_access_tokens.developer_buyer_sale_access_tokens_created_by_profile_id_fkey
do $$
begin
  alter table public.developer_buyer_sale_access_tokens add constraint developer_buyer_sale_access_tokens_created_by_profile_id_fkey FOREIGN KEY (created_by_profile_id) REFERENCES profiles(id) ON DELETE SET NULL
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_buyer_sale_access_tokens.developer_buyer_sale_access_tokens_developer_account_id_fkey
do $$
begin
  alter table public.developer_buyer_sale_access_tokens add constraint developer_buyer_sale_access_tokens_developer_account_id_fkey FOREIGN KEY (developer_account_id) REFERENCES developer_accounts(id) ON DELETE CASCADE
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_buyer_sale_access_tokens.developer_buyer_sale_access_tokens_hash_not_empty
do $$
begin
  alter table public.developer_buyer_sale_access_tokens add constraint developer_buyer_sale_access_tokens_hash_not_empty CHECK (char_length(TRIM(BOTH FROM token_hash)) >= 32)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_buyer_sale_access_tokens.developer_buyer_sale_access_tokens_label_not_empty
do $$
begin
  alter table public.developer_buyer_sale_access_tokens add constraint developer_buyer_sale_access_tokens_label_not_empty CHECK (char_length(TRIM(BOTH FROM label)) >= 2)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_buyer_sale_access_tokens.developer_buyer_sale_access_tokens_pkey
do $$
begin
  alter table public.developer_buyer_sale_access_tokens add constraint developer_buyer_sale_access_tokens_pkey PRIMARY KEY (id)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_buyer_sale_access_tokens.developer_buyer_sale_access_tokens_sale_id_fkey
do $$
begin
  alter table public.developer_buyer_sale_access_tokens add constraint developer_buyer_sale_access_tokens_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES developer_sales(id) ON DELETE CASCADE
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_buyers.developer_buyers_developer_account_id_fkey
do $$
begin
  alter table public.developer_buyers add constraint developer_buyers_developer_account_id_fkey FOREIGN KEY (developer_account_id) REFERENCES developer_accounts(id) ON DELETE CASCADE
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_buyers.developer_buyers_email_format
do $$
begin
  alter table public.developer_buyers add constraint developer_buyers_email_format CHECK (email IS NULL OR email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'::text)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_buyers.developer_buyers_full_name_not_empty
do $$
begin
  alter table public.developer_buyers add constraint developer_buyers_full_name_not_empty CHECK (char_length(TRIM(BOTH FROM full_name)) >= 2)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_buyers.developer_buyers_phone_number_not_empty
do $$
begin
  alter table public.developer_buyers add constraint developer_buyers_phone_number_not_empty CHECK (char_length(TRIM(BOTH FROM phone_number)) >= 7)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_buyers.developer_buyers_pkey
do $$
begin
  alter table public.developer_buyers add constraint developer_buyers_pkey PRIMARY KEY (id)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_document_templates.developer_document_templates_developer_account_id_fkey
do $$
begin
  alter table public.developer_document_templates add constraint developer_document_templates_developer_account_id_fkey FOREIGN KEY (developer_account_id) REFERENCES developer_accounts(id) ON DELETE CASCADE
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_document_templates.developer_document_templates_developer_account_id_template__key
do $$
begin
  alter table public.developer_document_templates add constraint developer_document_templates_developer_account_id_template__key UNIQUE (developer_account_id, template_type)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_document_templates.developer_document_templates_pkey
do $$
begin
  alter table public.developer_document_templates add constraint developer_document_templates_pkey PRIMARY KEY (id)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_estates.developer_estates_balance_spread_months_check
do $$
begin
  alter table public.developer_estates add constraint developer_estates_balance_spread_months_check CHECK (balance_spread_months >= 0 AND balance_spread_months <= 120)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_estates.developer_estates_default_payment_plan_mode_check
do $$
begin
  alter table public.developer_estates add constraint developer_estates_default_payment_plan_mode_check CHECK (default_payment_plan_mode = ANY (ARRAY['outright'::text, 'fixed_installment'::text]))
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_estates.developer_estates_default_plot_size_sqm_check
do $$
begin
  alter table public.developer_estates add constraint developer_estates_default_plot_size_sqm_check CHECK (default_plot_size_sqm IS NULL OR default_plot_size_sqm > 0::numeric)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_estates.developer_estates_developer_account_id_fkey
do $$
begin
  alter table public.developer_estates add constraint developer_estates_developer_account_id_fkey FOREIGN KEY (developer_account_id) REFERENCES developer_accounts(id) ON DELETE CASCADE
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_estates.developer_estates_gross_land_size_sqm_check
do $$
begin
  alter table public.developer_estates add constraint developer_estates_gross_land_size_sqm_check CHECK (gross_land_size_sqm IS NULL OR gross_land_size_sqm > 0::numeric)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_estates.developer_estates_initial_payment_percentage_check
do $$
begin
  alter table public.developer_estates add constraint developer_estates_initial_payment_percentage_check CHECK (initial_payment_percentage > 0::numeric AND initial_payment_percentage <= 100::numeric)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_estates.developer_estates_installment_interval_check
do $$
begin
  alter table public.developer_estates add constraint developer_estates_installment_interval_check CHECK (installment_interval = 'monthly'::text)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_estates.developer_estates_land_size_unit_check
do $$
begin
  alter table public.developer_estates add constraint developer_estates_land_size_unit_check CHECK (land_size_unit IS NULL OR (land_size_unit = ANY (ARRAY['sqm'::text, 'hectare'::text, 'acre'::text])))
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_estates.developer_estates_land_size_value_check
do $$
begin
  alter table public.developer_estates add constraint developer_estates_land_size_value_check CHECK (land_size_value IS NULL OR land_size_value > 0::numeric)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_estates.developer_estates_location_not_empty
do $$
begin
  alter table public.developer_estates add constraint developer_estates_location_not_empty CHECK (char_length(TRIM(BOTH FROM location)) >= 2)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_estates.developer_estates_name_not_empty
do $$
begin
  alter table public.developer_estates add constraint developer_estates_name_not_empty CHECK (char_length(TRIM(BOTH FROM estate_name)) >= 2)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_estates.developer_estates_pkey
do $$
begin
  alter table public.developer_estates add constraint developer_estates_pkey PRIMARY KEY (id)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_estates.developer_estates_planned_plot_count_check
do $$
begin
  alter table public.developer_estates add constraint developer_estates_planned_plot_count_check CHECK (planned_plot_count IS NULL OR planned_plot_count >= 0)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_estates.developer_estates_reserved_land_percentage_check
do $$
begin
  alter table public.developer_estates add constraint developer_estates_reserved_land_percentage_check CHECK (reserved_land_percentage IS NULL OR reserved_land_percentage >= 0::numeric AND reserved_land_percentage < 100::numeric)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_estates.developer_estates_usable_land_size_sqm_check
do $$
begin
  alter table public.developer_estates add constraint developer_estates_usable_land_size_sqm_check CHECK (usable_land_size_sqm IS NULL OR usable_land_size_sqm > 0::numeric)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_payment_allocations.developer_payment_allocations_amount_positive
do $$
begin
  alter table public.developer_payment_allocations add constraint developer_payment_allocations_amount_positive CHECK (amount > 0::numeric)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_payment_allocations.developer_payment_allocations_buyer_id_fkey
do $$
begin
  alter table public.developer_payment_allocations add constraint developer_payment_allocations_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES developer_buyers(id) ON DELETE RESTRICT
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_payment_allocations.developer_payment_allocations_developer_account_id_fkey
do $$
begin
  alter table public.developer_payment_allocations add constraint developer_payment_allocations_developer_account_id_fkey FOREIGN KEY (developer_account_id) REFERENCES developer_accounts(id) ON DELETE CASCADE
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_payment_allocations.developer_payment_allocations_payment_id_fkey
do $$
begin
  alter table public.developer_payment_allocations add constraint developer_payment_allocations_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES developer_sale_payments(id) ON DELETE SET NULL
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_payment_allocations.developer_payment_allocations_payment_intent_id_fkey
do $$
begin
  alter table public.developer_payment_allocations add constraint developer_payment_allocations_payment_intent_id_fkey FOREIGN KEY (payment_intent_id) REFERENCES developer_payment_intents(id) ON DELETE CASCADE
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_payment_allocations.developer_payment_allocations_pkey
do $$
begin
  alter table public.developer_payment_allocations add constraint developer_payment_allocations_pkey PRIMARY KEY (id)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_payment_allocations.developer_payment_allocations_sale_id_fkey
do $$
begin
  alter table public.developer_payment_allocations add constraint developer_payment_allocations_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES developer_sales(id) ON DELETE RESTRICT
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_payment_intents.developer_payment_intents_buyer_id_fkey
do $$
begin
  alter table public.developer_payment_intents add constraint developer_payment_intents_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES developer_buyers(id) ON DELETE RESTRICT
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_payment_intents.developer_payment_intents_currency_code_not_empty
do $$
begin
  alter table public.developer_payment_intents add constraint developer_payment_intents_currency_code_not_empty CHECK (char_length(TRIM(BOTH FROM currency_code)) >= 3)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_payment_intents.developer_payment_intents_developer_account_id_fkey
do $$
begin
  alter table public.developer_payment_intents add constraint developer_payment_intents_developer_account_id_fkey FOREIGN KEY (developer_account_id) REFERENCES developer_accounts(id) ON DELETE CASCADE
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_payment_intents.developer_payment_intents_estate_id_fkey
do $$
begin
  alter table public.developer_payment_intents add constraint developer_payment_intents_estate_id_fkey FOREIGN KEY (estate_id) REFERENCES developer_estates(id) ON DELETE RESTRICT
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_payment_intents.developer_payment_intents_installment_positive
do $$
begin
  alter table public.developer_payment_intents add constraint developer_payment_intents_installment_positive CHECK (installment_amount > 0::numeric)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_payment_intents.developer_payment_intents_pkey
do $$
begin
  alter table public.developer_payment_intents add constraint developer_payment_intents_pkey PRIMARY KEY (id)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_payment_intents.developer_payment_intents_platform_fee_not_negative
do $$
begin
  alter table public.developer_payment_intents add constraint developer_payment_intents_platform_fee_not_negative CHECK (platform_fee_amount >= 0::numeric)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_payment_intents.developer_payment_intents_plot_id_fkey
do $$
begin
  alter table public.developer_payment_intents add constraint developer_payment_intents_plot_id_fkey FOREIGN KEY (plot_id) REFERENCES developer_plots(id) ON DELETE RESTRICT
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_payment_intents.developer_payment_intents_sale_id_fkey
do $$
begin
  alter table public.developer_payment_intents add constraint developer_payment_intents_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES developer_sales(id) ON DELETE RESTRICT
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_payment_intents.developer_payment_intents_schedule_item_id_fkey
do $$
begin
  alter table public.developer_payment_intents add constraint developer_payment_intents_schedule_item_id_fkey FOREIGN KEY (schedule_item_id) REFERENCES developer_payment_schedule_items(id) ON DELETE SET NULL
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_payment_intents.developer_payment_intents_total_valid
do $$
begin
  alter table public.developer_payment_intents add constraint developer_payment_intents_total_valid CHECK (total_amount = (installment_amount + platform_fee_amount))
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_payment_plans.developer_payment_plans_developer_account_id_fkey
do $$
begin
  alter table public.developer_payment_plans add constraint developer_payment_plans_developer_account_id_fkey FOREIGN KEY (developer_account_id) REFERENCES developer_accounts(id) ON DELETE CASCADE
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_payment_plans.developer_payment_plans_pkey
do $$
begin
  alter table public.developer_payment_plans add constraint developer_payment_plans_pkey PRIMARY KEY (id)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_payment_plans.developer_payment_plans_sale_id_fkey
do $$
begin
  alter table public.developer_payment_plans add constraint developer_payment_plans_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES developer_sales(id) ON DELETE CASCADE
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_payment_plans.developer_payment_plans_total_amount_positive
do $$
begin
  alter table public.developer_payment_plans add constraint developer_payment_plans_total_amount_positive CHECK (total_amount > 0::numeric)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_payment_schedule_items.developer_payment_schedule_items_amount_paid_not_above_expected
do $$
begin
  alter table public.developer_payment_schedule_items add constraint developer_payment_schedule_items_amount_paid_not_above_expected CHECK (amount_paid <= expected_amount)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_payment_schedule_items.developer_payment_schedule_items_amount_paid_not_negative
do $$
begin
  alter table public.developer_payment_schedule_items add constraint developer_payment_schedule_items_amount_paid_not_negative CHECK (amount_paid >= 0::numeric)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_payment_schedule_items.developer_payment_schedule_items_developer_account_id_fkey
do $$
begin
  alter table public.developer_payment_schedule_items add constraint developer_payment_schedule_items_developer_account_id_fkey FOREIGN KEY (developer_account_id) REFERENCES developer_accounts(id) ON DELETE CASCADE
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_payment_schedule_items.developer_payment_schedule_items_expected_amount_positive
do $$
begin
  alter table public.developer_payment_schedule_items add constraint developer_payment_schedule_items_expected_amount_positive CHECK (expected_amount > 0::numeric)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_payment_schedule_items.developer_payment_schedule_items_label_not_empty
do $$
begin
  alter table public.developer_payment_schedule_items add constraint developer_payment_schedule_items_label_not_empty CHECK (char_length(TRIM(BOTH FROM label)) >= 2)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_payment_schedule_items.developer_payment_schedule_items_payment_plan_id_fkey
do $$
begin
  alter table public.developer_payment_schedule_items add constraint developer_payment_schedule_items_payment_plan_id_fkey FOREIGN KEY (payment_plan_id) REFERENCES developer_payment_plans(id) ON DELETE CASCADE
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_payment_schedule_items.developer_payment_schedule_items_pkey
do $$
begin
  alter table public.developer_payment_schedule_items add constraint developer_payment_schedule_items_pkey PRIMARY KEY (id)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_payment_schedule_items.developer_payment_schedule_items_sale_id_fkey
do $$
begin
  alter table public.developer_payment_schedule_items add constraint developer_payment_schedule_items_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES developer_sales(id) ON DELETE CASCADE
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_paystack_accounts.developer_paystack_accounts_account_number_check
do $$
begin
  alter table public.developer_paystack_accounts add constraint developer_paystack_accounts_account_number_check CHECK (account_number ~ '^[0-9]{10}$'::text)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_paystack_accounts.developer_paystack_accounts_developer_account_id_fkey
do $$
begin
  alter table public.developer_paystack_accounts add constraint developer_paystack_accounts_developer_account_id_fkey FOREIGN KEY (developer_account_id) REFERENCES developer_accounts(id) ON DELETE CASCADE
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_paystack_accounts.developer_paystack_accounts_pkey
do $$
begin
  alter table public.developer_paystack_accounts add constraint developer_paystack_accounts_pkey PRIMARY KEY (id)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_paystack_accounts.developer_paystack_accounts_verification_status_check
do $$
begin
  alter table public.developer_paystack_accounts add constraint developer_paystack_accounts_verification_status_check CHECK (verification_status = ANY (ARRAY['unverified'::text, 'verified'::text, 'failed'::text]))
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_plot_assignments.developer_plot_assignments_buyer_id_fkey
do $$
begin
  alter table public.developer_plot_assignments add constraint developer_plot_assignments_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES developer_buyers(id) ON DELETE CASCADE
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_plot_assignments.developer_plot_assignments_developer_account_id_fkey
do $$
begin
  alter table public.developer_plot_assignments add constraint developer_plot_assignments_developer_account_id_fkey FOREIGN KEY (developer_account_id) REFERENCES developer_accounts(id) ON DELETE CASCADE
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_plot_assignments.developer_plot_assignments_estate_id_fkey
do $$
begin
  alter table public.developer_plot_assignments add constraint developer_plot_assignments_estate_id_fkey FOREIGN KEY (estate_id) REFERENCES developer_estates(id) ON DELETE CASCADE
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_plot_assignments.developer_plot_assignments_pkey
do $$
begin
  alter table public.developer_plot_assignments add constraint developer_plot_assignments_pkey PRIMARY KEY (id)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_plot_assignments.developer_plot_assignments_plot_id_fkey
do $$
begin
  alter table public.developer_plot_assignments add constraint developer_plot_assignments_plot_id_fkey FOREIGN KEY (plot_id) REFERENCES developer_plots(id) ON DELETE CASCADE
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_plot_types.developer_plot_types_default_price_positive
do $$
begin
  alter table public.developer_plot_types add constraint developer_plot_types_default_price_positive CHECK (default_price > 0::numeric)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_plot_types.developer_plot_types_developer_account_id_fkey
do $$
begin
  alter table public.developer_plot_types add constraint developer_plot_types_developer_account_id_fkey FOREIGN KEY (developer_account_id) REFERENCES developer_accounts(id) ON DELETE CASCADE
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_plot_types.developer_plot_types_estate_id_fkey
do $$
begin
  alter table public.developer_plot_types add constraint developer_plot_types_estate_id_fkey FOREIGN KEY (estate_id) REFERENCES developer_estates(id) ON DELETE CASCADE
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_plot_types.developer_plot_types_pkey
do $$
begin
  alter table public.developer_plot_types add constraint developer_plot_types_pkey PRIMARY KEY (id)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_plot_types.developer_plot_types_size_label_not_empty
do $$
begin
  alter table public.developer_plot_types add constraint developer_plot_types_size_label_not_empty CHECK (char_length(TRIM(BOTH FROM size_label)) >= 1)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_plot_types.developer_plot_types_type_name_not_empty
do $$
begin
  alter table public.developer_plot_types add constraint developer_plot_types_type_name_not_empty CHECK (char_length(TRIM(BOTH FROM type_name)) >= 2)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_plots.developer_plots_developer_account_id_fkey
do $$
begin
  alter table public.developer_plots add constraint developer_plots_developer_account_id_fkey FOREIGN KEY (developer_account_id) REFERENCES developer_accounts(id) ON DELETE CASCADE
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_plots.developer_plots_estate_id_fkey
do $$
begin
  alter table public.developer_plots add constraint developer_plots_estate_id_fkey FOREIGN KEY (estate_id) REFERENCES developer_estates(id) ON DELETE CASCADE
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_plots.developer_plots_pkey
do $$
begin
  alter table public.developer_plots add constraint developer_plots_pkey PRIMARY KEY (id)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_plots.developer_plots_plot_number_not_empty
do $$
begin
  alter table public.developer_plots add constraint developer_plots_plot_number_not_empty CHECK (char_length(TRIM(BOTH FROM plot_number)) >= 1)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_plots.developer_plots_plot_type_id_fkey
do $$
begin
  alter table public.developer_plots add constraint developer_plots_plot_type_id_fkey FOREIGN KEY (plot_type_id) REFERENCES developer_plot_types(id) ON DELETE SET NULL
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_plots.developer_plots_price_positive
do $$
begin
  alter table public.developer_plots add constraint developer_plots_price_positive CHECK (price > 0::numeric)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_plots.developer_plots_size_label_not_empty
do $$
begin
  alter table public.developer_plots add constraint developer_plots_size_label_not_empty CHECK (char_length(TRIM(BOTH FROM size_label)) >= 1)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_profiles.developer_profiles_developer_account_id_fkey
do $$
begin
  alter table public.developer_profiles add constraint developer_profiles_developer_account_id_fkey FOREIGN KEY (developer_account_id) REFERENCES developer_accounts(id) ON DELETE CASCADE
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_profiles.developer_profiles_full_name_not_empty
do $$
begin
  alter table public.developer_profiles add constraint developer_profiles_full_name_not_empty CHECK (char_length(TRIM(BOTH FROM full_name)) >= 2)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_profiles.developer_profiles_invited_by_profile_id_fkey
do $$
begin
  alter table public.developer_profiles add constraint developer_profiles_invited_by_profile_id_fkey FOREIGN KEY (invited_by_profile_id) REFERENCES profiles(id) ON DELETE SET NULL
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_profiles.developer_profiles_manager_developer_profile_id_fkey
do $$
begin
  alter table public.developer_profiles add constraint developer_profiles_manager_developer_profile_id_fkey FOREIGN KEY (manager_developer_profile_id) REFERENCES developer_profiles(id) ON DELETE SET NULL
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_profiles.developer_profiles_phone_number_not_empty
do $$
begin
  alter table public.developer_profiles add constraint developer_profiles_phone_number_not_empty CHECK (char_length(TRIM(BOTH FROM phone_number)) >= 7)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_profiles.developer_profiles_pkey
do $$
begin
  alter table public.developer_profiles add constraint developer_profiles_pkey PRIMARY KEY (id)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_profiles.developer_profiles_profile_id_fkey
do $$
begin
  alter table public.developer_profiles add constraint developer_profiles_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_profiles.developer_profiles_role_valid
do $$
begin
  alter table public.developer_profiles add constraint developer_profiles_role_valid CHECK (role = ANY (ARRAY['developer_owner'::text, 'developer_staff'::text, 'developer_accountant'::text]))
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_profiles.developer_profiles_staff_title_check
do $$
begin
  alter table public.developer_profiles add constraint developer_profiles_staff_title_check CHECK (staff_title IS NULL OR (staff_title = ANY (ARRAY['sales_rep'::text, 'marketing_staff'::text, 'document_officer'::text, 'accountant'::text])))
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_sale_documents.developer_sale_documents_developer_account_id_fkey
do $$
begin
  alter table public.developer_sale_documents add constraint developer_sale_documents_developer_account_id_fkey FOREIGN KEY (developer_account_id) REFERENCES developer_accounts(id) ON DELETE CASCADE
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_sale_documents.developer_sale_documents_pkey
do $$
begin
  alter table public.developer_sale_documents add constraint developer_sale_documents_pkey PRIMARY KEY (id)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_sale_documents.developer_sale_documents_sale_id_fkey
do $$
begin
  alter table public.developer_sale_documents add constraint developer_sale_documents_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES developer_sales(id) ON DELETE CASCADE
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_sale_documents.developer_sale_documents_status_check
do $$
begin
  alter table public.developer_sale_documents add constraint developer_sale_documents_status_check CHECK (status = ANY (ARRAY['generated'::text, 'signed_copy_uploaded'::text, 'ready_for_physical_collection'::text, 'original_issued'::text, 'voided'::text]))
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_sale_documents.developer_sale_documents_type_check
do $$
begin
  alter table public.developer_sale_documents add constraint developer_sale_documents_type_check CHECK (document_type = ANY (ARRAY['sales_agreement'::text, 'allocation_letter'::text, 'cofo_copy_reference'::text, 'deed_of_assignment_copy_reference'::text, 'survey_plan_copy_reference'::text]))
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_sale_documents.developer_sale_documents_unique_sale_type
do $$
begin
  alter table public.developer_sale_documents add constraint developer_sale_documents_unique_sale_type UNIQUE (developer_account_id, sale_id, document_type)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_sale_ledger_entries.developer_sale_ledger_amount_direction_valid
do $$
begin
  alter table public.developer_sale_ledger_entries add constraint developer_sale_ledger_amount_direction_valid CHECK (debit_amount > 0::numeric AND credit_amount = 0::numeric OR credit_amount > 0::numeric AND debit_amount = 0::numeric)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_sale_ledger_entries.developer_sale_ledger_entries_buyer_id_fkey
do $$
begin
  alter table public.developer_sale_ledger_entries add constraint developer_sale_ledger_entries_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES developer_buyers(id) ON DELETE RESTRICT
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_sale_ledger_entries.developer_sale_ledger_entries_developer_account_id_fkey
do $$
begin
  alter table public.developer_sale_ledger_entries add constraint developer_sale_ledger_entries_developer_account_id_fkey FOREIGN KEY (developer_account_id) REFERENCES developer_accounts(id) ON DELETE CASCADE
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_sale_ledger_entries.developer_sale_ledger_entries_payment_id_fkey
do $$
begin
  alter table public.developer_sale_ledger_entries add constraint developer_sale_ledger_entries_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES developer_sale_payments(id) ON DELETE RESTRICT
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_sale_ledger_entries.developer_sale_ledger_entries_pkey
do $$
begin
  alter table public.developer_sale_ledger_entries add constraint developer_sale_ledger_entries_pkey PRIMARY KEY (id)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_sale_ledger_entries.developer_sale_ledger_entries_sale_id_fkey
do $$
begin
  alter table public.developer_sale_ledger_entries add constraint developer_sale_ledger_entries_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES developer_sales(id) ON DELETE RESTRICT
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_sale_ledger_entries.developer_sale_ledger_running_balance_not_negative
do $$
begin
  alter table public.developer_sale_ledger_entries add constraint developer_sale_ledger_running_balance_not_negative CHECK (running_balance >= 0::numeric)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_sale_payments.developer_sale_payments_amount_paid_positive
do $$
begin
  alter table public.developer_sale_payments add constraint developer_sale_payments_amount_paid_positive CHECK (amount_paid > 0::numeric)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_sale_payments.developer_sale_payments_balance_not_negative
do $$
begin
  alter table public.developer_sale_payments add constraint developer_sale_payments_balance_not_negative CHECK (balance_before >= 0::numeric AND balance_after >= 0::numeric)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_sale_payments.developer_sale_payments_buyer_id_fkey
do $$
begin
  alter table public.developer_sale_payments add constraint developer_sale_payments_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES developer_buyers(id) ON DELETE RESTRICT
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_sale_payments.developer_sale_payments_developer_account_id_fkey
do $$
begin
  alter table public.developer_sale_payments add constraint developer_sale_payments_developer_account_id_fkey FOREIGN KEY (developer_account_id) REFERENCES developer_accounts(id) ON DELETE CASCADE
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_sale_payments.developer_sale_payments_estate_id_fkey
do $$
begin
  alter table public.developer_sale_payments add constraint developer_sale_payments_estate_id_fkey FOREIGN KEY (estate_id) REFERENCES developer_estates(id) ON DELETE RESTRICT
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_sale_payments.developer_sale_payments_payment_intent_id_fkey
do $$
begin
  alter table public.developer_sale_payments add constraint developer_sale_payments_payment_intent_id_fkey FOREIGN KEY (payment_intent_id) REFERENCES developer_payment_intents(id) ON DELETE RESTRICT
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_sale_payments.developer_sale_payments_pkey
do $$
begin
  alter table public.developer_sale_payments add constraint developer_sale_payments_pkey PRIMARY KEY (id)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_sale_payments.developer_sale_payments_platform_fee_not_negative
do $$
begin
  alter table public.developer_sale_payments add constraint developer_sale_payments_platform_fee_not_negative CHECK (platform_fee_amount >= 0::numeric)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_sale_payments.developer_sale_payments_plot_id_fkey
do $$
begin
  alter table public.developer_sale_payments add constraint developer_sale_payments_plot_id_fkey FOREIGN KEY (plot_id) REFERENCES developer_plots(id) ON DELETE RESTRICT
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_sale_payments.developer_sale_payments_sale_id_fkey
do $$
begin
  alter table public.developer_sale_payments add constraint developer_sale_payments_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES developer_sales(id) ON DELETE RESTRICT
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_sale_payments.developer_sale_payments_schedule_item_id_fkey
do $$
begin
  alter table public.developer_sale_payments add constraint developer_sale_payments_schedule_item_id_fkey FOREIGN KEY (schedule_item_id) REFERENCES developer_payment_schedule_items(id) ON DELETE SET NULL
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_sale_payments.developer_sale_payments_total_valid
do $$
begin
  alter table public.developer_sale_payments add constraint developer_sale_payments_total_valid CHECK (total_paid_amount = (amount_paid + platform_fee_amount))
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_sales.developer_sales_buyer_id_fkey
do $$
begin
  alter table public.developer_sales add constraint developer_sales_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES developer_buyers(id) ON DELETE RESTRICT
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_sales.developer_sales_developer_account_id_fkey
do $$
begin
  alter table public.developer_sales add constraint developer_sales_developer_account_id_fkey FOREIGN KEY (developer_account_id) REFERENCES developer_accounts(id) ON DELETE CASCADE
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_sales.developer_sales_estate_id_fkey
do $$
begin
  alter table public.developer_sales add constraint developer_sales_estate_id_fkey FOREIGN KEY (estate_id) REFERENCES developer_estates(id) ON DELETE RESTRICT
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_sales.developer_sales_initial_deposit_not_above_total
do $$
begin
  alter table public.developer_sales add constraint developer_sales_initial_deposit_not_above_total CHECK (initial_deposit_amount <= total_price_locked)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_sales.developer_sales_initial_deposit_not_negative
do $$
begin
  alter table public.developer_sales add constraint developer_sales_initial_deposit_not_negative CHECK (initial_deposit_amount >= 0::numeric)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_sales.developer_sales_pkey
do $$
begin
  alter table public.developer_sales add constraint developer_sales_pkey PRIMARY KEY (id)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_sales.developer_sales_plot_assignment_id_fkey
do $$
begin
  alter table public.developer_sales add constraint developer_sales_plot_assignment_id_fkey FOREIGN KEY (plot_assignment_id) REFERENCES developer_plot_assignments(id) ON DELETE RESTRICT
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_sales.developer_sales_plot_id_fkey
do $$
begin
  alter table public.developer_sales add constraint developer_sales_plot_id_fkey FOREIGN KEY (plot_id) REFERENCES developer_plots(id) ON DELETE RESTRICT
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_sales.developer_sales_reference_not_empty
do $$
begin
  alter table public.developer_sales add constraint developer_sales_reference_not_empty CHECK (char_length(TRIM(BOTH FROM sale_reference)) >= 6)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_sales.developer_sales_total_price_locked_positive
do $$
begin
  alter table public.developer_sales add constraint developer_sales_total_price_locked_positive CHECK (total_price_locked > 0::numeric)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_staff_invites.developer_staff_invites_accepted_developer_profile_id_fkey
do $$
begin
  alter table public.developer_staff_invites add constraint developer_staff_invites_accepted_developer_profile_id_fkey FOREIGN KEY (accepted_developer_profile_id) REFERENCES developer_profiles(id) ON DELETE SET NULL
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_staff_invites.developer_staff_invites_accepted_profile_id_fkey
do $$
begin
  alter table public.developer_staff_invites add constraint developer_staff_invites_accepted_profile_id_fkey FOREIGN KEY (accepted_profile_id) REFERENCES profiles(id) ON DELETE SET NULL
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_staff_invites.developer_staff_invites_developer_account_id_fkey
do $$
begin
  alter table public.developer_staff_invites add constraint developer_staff_invites_developer_account_id_fkey FOREIGN KEY (developer_account_id) REFERENCES developer_accounts(id) ON DELETE CASCADE
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_staff_invites.developer_staff_invites_invited_by_profile_id_fkey
do $$
begin
  alter table public.developer_staff_invites add constraint developer_staff_invites_invited_by_profile_id_fkey FOREIGN KEY (invited_by_profile_id) REFERENCES profiles(id) ON DELETE CASCADE
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_staff_invites.developer_staff_invites_manager_developer_profile_id_fkey
do $$
begin
  alter table public.developer_staff_invites add constraint developer_staff_invites_manager_developer_profile_id_fkey FOREIGN KEY (manager_developer_profile_id) REFERENCES developer_profiles(id) ON DELETE SET NULL
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_staff_invites.developer_staff_invites_pkey
do $$
begin
  alter table public.developer_staff_invites add constraint developer_staff_invites_pkey PRIMARY KEY (id)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_staff_invites.developer_staff_invites_profile_role_check
do $$
begin
  alter table public.developer_staff_invites add constraint developer_staff_invites_profile_role_check CHECK (developer_profile_role = ANY (ARRAY['developer_staff'::text, 'developer_accountant'::text]))
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_staff_invites.developer_staff_invites_staff_title_check
do $$
begin
  alter table public.developer_staff_invites add constraint developer_staff_invites_staff_title_check CHECK (staff_title = ANY (ARRAY['sales_manager'::text, 'sales_rep'::text, 'marketing_staff'::text, 'document_officer'::text, 'accountant'::text]))
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_staff_invites.developer_staff_invites_status_check
do $$
begin
  alter table public.developer_staff_invites add constraint developer_staff_invites_status_check CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'revoked'::text, 'expired'::text]))
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_staff_invites.developer_staff_invites_token_hash_key
do $$
begin
  alter table public.developer_staff_invites add constraint developer_staff_invites_token_hash_key UNIQUE (token_hash)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_staff_permissions.developer_staff_permissions_developer_account_id_fkey
do $$
begin
  alter table public.developer_staff_permissions add constraint developer_staff_permissions_developer_account_id_fkey FOREIGN KEY (developer_account_id) REFERENCES developer_accounts(id) ON DELETE CASCADE
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_staff_permissions.developer_staff_permissions_developer_profile_id_fkey
do $$
begin
  alter table public.developer_staff_permissions add constraint developer_staff_permissions_developer_profile_id_fkey FOREIGN KEY (developer_profile_id) REFERENCES developer_profiles(id) ON DELETE CASCADE
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_staff_permissions.developer_staff_permissions_developer_profile_id_permission_key
do $$
begin
  alter table public.developer_staff_permissions add constraint developer_staff_permissions_developer_profile_id_permission_key UNIQUE (developer_profile_id, permission_key)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_staff_permissions.developer_staff_permissions_granted_by_profile_id_fkey
do $$
begin
  alter table public.developer_staff_permissions add constraint developer_staff_permissions_granted_by_profile_id_fkey FOREIGN KEY (granted_by_profile_id) REFERENCES profiles(id) ON DELETE SET NULL
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_staff_permissions.developer_staff_permissions_pkey
do $$
begin
  alter table public.developer_staff_permissions add constraint developer_staff_permissions_pkey PRIMARY KEY (id)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_staff_role_links.developer_staff_role_links_created_by_profile_id_fkey
do $$
begin
  alter table public.developer_staff_role_links add constraint developer_staff_role_links_created_by_profile_id_fkey FOREIGN KEY (created_by_profile_id) REFERENCES profiles(id) ON DELETE CASCADE
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_staff_role_links.developer_staff_role_links_developer_account_id_fkey
do $$
begin
  alter table public.developer_staff_role_links add constraint developer_staff_role_links_developer_account_id_fkey FOREIGN KEY (developer_account_id) REFERENCES developer_accounts(id) ON DELETE CASCADE
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_staff_role_links.developer_staff_role_links_pkey
do $$
begin
  alter table public.developer_staff_role_links add constraint developer_staff_role_links_pkey PRIMARY KEY (id)
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_staff_role_links.developer_staff_role_links_profile_role_check
do $$
begin
  alter table public.developer_staff_role_links add constraint developer_staff_role_links_profile_role_check CHECK (developer_profile_role = ANY (ARRAY['developer_staff'::text, 'developer_accountant'::text]))
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_staff_role_links.developer_staff_role_links_staff_title_check
do $$
begin
  alter table public.developer_staff_role_links add constraint developer_staff_role_links_staff_title_check CHECK (staff_title = ANY (ARRAY['sales_rep'::text, 'marketing_staff'::text, 'document_officer'::text, 'accountant'::text]))
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_staff_role_links.developer_staff_role_links_status_check
do $$
begin
  alter table public.developer_staff_role_links add constraint developer_staff_role_links_status_check CHECK (status = ANY (ARRAY['active'::text, 'revoked'::text, 'expired'::text]))
;
exception
  when duplicate_object then null;
end $$;

-- public.developer_staff_role_links.developer_staff_role_links_token_hash_key
do $$
begin
  alter table public.developer_staff_role_links add constraint developer_staff_role_links_token_hash_key UNIQUE (token_hash)
;
exception
  when duplicate_object then null;
end $$;

-- public.notifications.notifications_landlord_id_fkey
do $$
begin
  alter table public.notifications add constraint notifications_landlord_id_fkey FOREIGN KEY (landlord_id) REFERENCES profiles(id) ON DELETE CASCADE
;
exception
  when duplicate_object then null;
end $$;

-- public.notifications.notifications_pkey
do $$
begin
  alter table public.notifications add constraint notifications_pkey PRIMARY KEY (id)
;
exception
  when duplicate_object then null;
end $$;

-- public.profiles.profiles_email_format
do $$
begin
  alter table public.profiles add constraint profiles_email_format CHECK (email IS NULL OR email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'::text)
;
exception
  when duplicate_object then null;
end $$;

-- public.profiles.profiles_full_name_check
do $$
begin
  alter table public.profiles add constraint profiles_full_name_check CHECK (char_length(TRIM(BOTH FROM full_name)) >= 2)
;
exception
  when duplicate_object then null;
end $$;

-- public.profiles.profiles_id_fkey
do $$
begin
  alter table public.profiles add constraint profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
;
exception
  when duplicate_object then null;
end $$;

-- public.profiles.profiles_phone_not_empty
do $$
begin
  alter table public.profiles add constraint profiles_phone_not_empty CHECK (char_length(TRIM(BOTH FROM phone_number)) >= 7)
;
exception
  when duplicate_object then null;
end $$;

-- public.profiles.profiles_pkey
do $$
begin
  alter table public.profiles add constraint profiles_pkey PRIMARY KEY (id)
;
exception
  when duplicate_object then null;
end $$;

-- 5. Indexes
-- public.audit_logs_entity_idx
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON public.audit_logs USING btree (entity_type, entity_id);;

-- public.audit_logs_event_type_idx
CREATE INDEX IF NOT EXISTS audit_logs_event_type_idx ON public.audit_logs USING btree (event_type);;

-- public.audit_logs_landlord_id_created_at_idx
CREATE INDEX IF NOT EXISTS audit_logs_landlord_id_created_at_idx ON public.audit_logs USING btree (landlord_id, created_at DESC);;

-- public.audit_logs_tenancy_id_created_at_idx
CREATE INDEX IF NOT EXISTS audit_logs_tenancy_id_created_at_idx ON public.audit_logs USING btree (tenancy_id, created_at DESC);;

-- public.audit_logs_tenant_id_created_at_idx
CREATE INDEX IF NOT EXISTS audit_logs_tenant_id_created_at_idx ON public.audit_logs USING btree (tenant_id, created_at DESC);;

-- public.developer_accounts_owner_profile_id_key
CREATE UNIQUE INDEX IF NOT EXISTS developer_accounts_owner_profile_id_key ON public.developer_accounts USING btree (owner_profile_id);;

-- public.developer_accounts_status_idx
CREATE INDEX IF NOT EXISTS developer_accounts_status_idx ON public.developer_accounts USING btree (status);;

-- public.developer_buyer_purchase_links_developer_account_idx
CREATE INDEX IF NOT EXISTS developer_buyer_purchase_links_developer_account_idx ON public.developer_buyer_purchase_links USING btree (developer_account_id, created_at DESC);;

-- public.developer_buyer_purchase_links_plot_active_idx
CREATE INDEX IF NOT EXISTS developer_buyer_purchase_links_plot_active_idx ON public.developer_buyer_purchase_links USING btree (plot_id, status) WHERE (status = ANY (ARRAY['pending'::text, 'details_submitted'::text, 'payment_started'::text]));;

-- public.developer_buyer_sale_access_tokens_buyer_id_idx
CREATE INDEX IF NOT EXISTS developer_buyer_sale_access_tokens_buyer_id_idx ON public.developer_buyer_sale_access_tokens USING btree (buyer_id);;

-- public.developer_buyer_sale_access_tokens_developer_account_id_idx
CREATE INDEX IF NOT EXISTS developer_buyer_sale_access_tokens_developer_account_id_idx ON public.developer_buyer_sale_access_tokens USING btree (developer_account_id);;

-- public.developer_buyer_sale_access_tokens_hash_key
CREATE UNIQUE INDEX IF NOT EXISTS developer_buyer_sale_access_tokens_hash_key ON public.developer_buyer_sale_access_tokens USING btree (token_hash);;

-- public.developer_buyer_sale_access_tokens_one_active_per_sale
CREATE UNIQUE INDEX IF NOT EXISTS developer_buyer_sale_access_tokens_one_active_per_sale ON public.developer_buyer_sale_access_tokens USING btree (sale_id) WHERE (revoked_at IS NULL);;

-- public.developer_buyer_sale_access_tokens_sale_id_idx
CREATE INDEX IF NOT EXISTS developer_buyer_sale_access_tokens_sale_id_idx ON public.developer_buyer_sale_access_tokens USING btree (sale_id);;

-- public.developer_buyers_developer_account_id_idx
CREATE INDEX IF NOT EXISTS developer_buyers_developer_account_id_idx ON public.developer_buyers USING btree (developer_account_id);;

-- public.developer_buyers_phone_number_idx
CREATE INDEX IF NOT EXISTS developer_buyers_phone_number_idx ON public.developer_buyers USING btree (phone_number);;

-- public.developer_buyers_status_idx
CREATE INDEX IF NOT EXISTS developer_buyers_status_idx ON public.developer_buyers USING btree (status);;

-- public.developer_document_templates_account_idx
CREATE INDEX IF NOT EXISTS developer_document_templates_account_idx ON public.developer_document_templates USING btree (developer_account_id);;

-- public.developer_document_templates_type_idx
CREATE INDEX IF NOT EXISTS developer_document_templates_type_idx ON public.developer_document_templates USING btree (template_type);;

-- public.developer_estates_developer_account_id_idx
CREATE INDEX IF NOT EXISTS developer_estates_developer_account_id_idx ON public.developer_estates USING btree (developer_account_id);;

-- public.developer_estates_lga_idx
CREATE INDEX IF NOT EXISTS developer_estates_lga_idx ON public.developer_estates USING btree (lga);;

-- public.developer_estates_state_idx
CREATE INDEX IF NOT EXISTS developer_estates_state_idx ON public.developer_estates USING btree (state);;

-- public.developer_estates_status_idx
CREATE INDEX IF NOT EXISTS developer_estates_status_idx ON public.developer_estates USING btree (status);;

-- public.developer_payment_allocations_developer_account_id_idx
CREATE INDEX IF NOT EXISTS developer_payment_allocations_developer_account_id_idx ON public.developer_payment_allocations USING btree (developer_account_id);;

-- public.developer_payment_allocations_payment_id_idx
CREATE INDEX IF NOT EXISTS developer_payment_allocations_payment_id_idx ON public.developer_payment_allocations USING btree (payment_id);;

-- public.developer_payment_allocations_payment_intent_id_idx
CREATE INDEX IF NOT EXISTS developer_payment_allocations_payment_intent_id_idx ON public.developer_payment_allocations USING btree (payment_intent_id);;

-- public.developer_payment_allocations_sale_id_idx
CREATE INDEX IF NOT EXISTS developer_payment_allocations_sale_id_idx ON public.developer_payment_allocations USING btree (sale_id);;

-- public.developer_payment_intents_buyer_id_idx
CREATE INDEX IF NOT EXISTS developer_payment_intents_buyer_id_idx ON public.developer_payment_intents USING btree (buyer_id);;

-- public.developer_payment_intents_developer_account_id_idx
CREATE INDEX IF NOT EXISTS developer_payment_intents_developer_account_id_idx ON public.developer_payment_intents USING btree (developer_account_id);;

-- public.developer_payment_intents_idempotency_key_key
CREATE UNIQUE INDEX IF NOT EXISTS developer_payment_intents_idempotency_key_key ON public.developer_payment_intents USING btree (developer_account_id, idempotency_key);;

-- public.developer_payment_intents_reference_key
CREATE UNIQUE INDEX IF NOT EXISTS developer_payment_intents_reference_key ON public.developer_payment_intents USING btree (paystack_reference);;

-- public.developer_payment_intents_sale_id_idx
CREATE INDEX IF NOT EXISTS developer_payment_intents_sale_id_idx ON public.developer_payment_intents USING btree (sale_id);;

-- public.developer_payment_intents_status_idx
CREATE INDEX IF NOT EXISTS developer_payment_intents_status_idx ON public.developer_payment_intents USING btree (status);;

-- public.developer_payment_plans_developer_account_id_idx
CREATE INDEX IF NOT EXISTS developer_payment_plans_developer_account_id_idx ON public.developer_payment_plans USING btree (developer_account_id);;

-- public.developer_payment_plans_one_active_plan_per_sale
CREATE UNIQUE INDEX IF NOT EXISTS developer_payment_plans_one_active_plan_per_sale ON public.developer_payment_plans USING btree (sale_id) WHERE (status = ANY (ARRAY['draft'::developer_payment_plan_status, 'active'::developer_payment_plan_status]));;

-- public.developer_payment_plans_sale_id_idx
CREATE INDEX IF NOT EXISTS developer_payment_plans_sale_id_idx ON public.developer_payment_plans USING btree (sale_id);;

-- public.developer_payment_plans_status_idx
CREATE INDEX IF NOT EXISTS developer_payment_plans_status_idx ON public.developer_payment_plans USING btree (status);;

-- public.developer_payment_schedule_items_developer_account_id_idx
CREATE INDEX IF NOT EXISTS developer_payment_schedule_items_developer_account_id_idx ON public.developer_payment_schedule_items USING btree (developer_account_id);;

-- public.developer_payment_schedule_items_due_date_idx
CREATE INDEX IF NOT EXISTS developer_payment_schedule_items_due_date_idx ON public.developer_payment_schedule_items USING btree (due_date);;

-- public.developer_payment_schedule_items_payment_plan_id_idx
CREATE INDEX IF NOT EXISTS developer_payment_schedule_items_payment_plan_id_idx ON public.developer_payment_schedule_items USING btree (payment_plan_id);;

-- public.developer_payment_schedule_items_sale_id_idx
CREATE INDEX IF NOT EXISTS developer_payment_schedule_items_sale_id_idx ON public.developer_payment_schedule_items USING btree (sale_id);;

-- public.developer_payment_schedule_items_status_idx
CREATE INDEX IF NOT EXISTS developer_payment_schedule_items_status_idx ON public.developer_payment_schedule_items USING btree (status);;

-- public.developer_paystack_accounts_developer_account_id_idx
CREATE INDEX IF NOT EXISTS developer_paystack_accounts_developer_account_id_idx ON public.developer_paystack_accounts USING btree (developer_account_id);;

-- public.developer_paystack_accounts_one_active_account_idx
CREATE UNIQUE INDEX IF NOT EXISTS developer_paystack_accounts_one_active_account_idx ON public.developer_paystack_accounts USING btree (developer_account_id) WHERE (is_active = true);;

-- public.developer_paystack_accounts_verification_status_idx
CREATE INDEX IF NOT EXISTS developer_paystack_accounts_verification_status_idx ON public.developer_paystack_accounts USING btree (verification_status);;

-- public.developer_plot_assignments_buyer_id_idx
CREATE INDEX IF NOT EXISTS developer_plot_assignments_buyer_id_idx ON public.developer_plot_assignments USING btree (buyer_id);;

-- public.developer_plot_assignments_developer_account_id_idx
CREATE INDEX IF NOT EXISTS developer_plot_assignments_developer_account_id_idx ON public.developer_plot_assignments USING btree (developer_account_id);;

-- public.developer_plot_assignments_estate_id_idx
CREATE INDEX IF NOT EXISTS developer_plot_assignments_estate_id_idx ON public.developer_plot_assignments USING btree (estate_id);;

-- public.developer_plot_assignments_one_open_assignment_per_buyer
CREATE UNIQUE INDEX IF NOT EXISTS developer_plot_assignments_one_open_assignment_per_buyer ON public.developer_plot_assignments USING btree (buyer_id) WHERE (status = ANY (ARRAY['reserved'::developer_plot_assignment_status, 'active'::developer_plot_assignment_status]));;

-- public.developer_plot_assignments_one_open_assignment_per_plot
CREATE UNIQUE INDEX IF NOT EXISTS developer_plot_assignments_one_open_assignment_per_plot ON public.developer_plot_assignments USING btree (plot_id) WHERE (status = ANY (ARRAY['reserved'::developer_plot_assignment_status, 'active'::developer_plot_assignment_status]));;

-- public.developer_plot_assignments_plot_id_idx
CREATE INDEX IF NOT EXISTS developer_plot_assignments_plot_id_idx ON public.developer_plot_assignments USING btree (plot_id);;

-- public.developer_plot_types_developer_account_id_idx
CREATE INDEX IF NOT EXISTS developer_plot_types_developer_account_id_idx ON public.developer_plot_types USING btree (developer_account_id);;

-- public.developer_plot_types_estate_id_idx
CREATE INDEX IF NOT EXISTS developer_plot_types_estate_id_idx ON public.developer_plot_types USING btree (estate_id);;

-- public.developer_plot_types_estate_type_name_key
CREATE UNIQUE INDEX IF NOT EXISTS developer_plot_types_estate_type_name_key ON public.developer_plot_types USING btree (estate_id, lower(type_name));;

-- public.developer_plots_developer_account_id_idx
CREATE INDEX IF NOT EXISTS developer_plots_developer_account_id_idx ON public.developer_plots USING btree (developer_account_id);;

-- public.developer_plots_estate_id_idx
CREATE INDEX IF NOT EXISTS developer_plots_estate_id_idx ON public.developer_plots USING btree (estate_id);;

-- public.developer_plots_estate_plot_number_key
CREATE UNIQUE INDEX IF NOT EXISTS developer_plots_estate_plot_number_key ON public.developer_plots USING btree (estate_id, lower(plot_number));;

-- public.developer_plots_plot_type_id_idx
CREATE INDEX IF NOT EXISTS developer_plots_plot_type_id_idx ON public.developer_plots USING btree (plot_type_id);;

-- public.developer_plots_status_idx
CREATE INDEX IF NOT EXISTS developer_plots_status_idx ON public.developer_plots USING btree (status);;

-- public.developer_profiles_developer_account_id_idx
CREATE INDEX IF NOT EXISTS developer_profiles_developer_account_id_idx ON public.developer_profiles USING btree (developer_account_id);;

-- public.developer_profiles_profile_id_key
CREATE UNIQUE INDEX IF NOT EXISTS developer_profiles_profile_id_key ON public.developer_profiles USING btree (profile_id);;

-- public.developer_sale_documents_sale_idx
CREATE INDEX IF NOT EXISTS developer_sale_documents_sale_idx ON public.developer_sale_documents USING btree (developer_account_id, sale_id);;

-- public.developer_sale_ledger_entries_buyer_id_idx
CREATE INDEX IF NOT EXISTS developer_sale_ledger_entries_buyer_id_idx ON public.developer_sale_ledger_entries USING btree (buyer_id);;

-- public.developer_sale_ledger_entries_created_at_idx
CREATE INDEX IF NOT EXISTS developer_sale_ledger_entries_created_at_idx ON public.developer_sale_ledger_entries USING btree (created_at);;

-- public.developer_sale_ledger_entries_developer_account_id_idx
CREATE INDEX IF NOT EXISTS developer_sale_ledger_entries_developer_account_id_idx ON public.developer_sale_ledger_entries USING btree (developer_account_id);;

-- public.developer_sale_ledger_entries_sale_id_idx
CREATE INDEX IF NOT EXISTS developer_sale_ledger_entries_sale_id_idx ON public.developer_sale_ledger_entries USING btree (sale_id);;

-- public.developer_sale_payments_buyer_id_idx
CREATE INDEX IF NOT EXISTS developer_sale_payments_buyer_id_idx ON public.developer_sale_payments USING btree (buyer_id);;

-- public.developer_sale_payments_developer_account_id_idx
CREATE INDEX IF NOT EXISTS developer_sale_payments_developer_account_id_idx ON public.developer_sale_payments USING btree (developer_account_id);;

-- public.developer_sale_payments_payment_intent_unique
CREATE UNIQUE INDEX IF NOT EXISTS developer_sale_payments_payment_intent_unique ON public.developer_sale_payments USING btree (payment_intent_id) WHERE (payment_intent_id IS NOT NULL);;

-- public.developer_sale_payments_payment_reference_unique
CREATE UNIQUE INDEX IF NOT EXISTS developer_sale_payments_payment_reference_unique ON public.developer_sale_payments USING btree (payment_reference);;

-- public.developer_sale_payments_reference_key
CREATE UNIQUE INDEX IF NOT EXISTS developer_sale_payments_reference_key ON public.developer_sale_payments USING btree (payment_reference);;

-- public.developer_sale_payments_sale_id_idx
CREATE INDEX IF NOT EXISTS developer_sale_payments_sale_id_idx ON public.developer_sale_payments USING btree (sale_id);;

-- public.developer_sales_buyer_id_idx
CREATE INDEX IF NOT EXISTS developer_sales_buyer_id_idx ON public.developer_sales USING btree (buyer_id);;

-- public.developer_sales_developer_account_id_idx
CREATE INDEX IF NOT EXISTS developer_sales_developer_account_id_idx ON public.developer_sales USING btree (developer_account_id);;

-- public.developer_sales_estate_id_idx
CREATE INDEX IF NOT EXISTS developer_sales_estate_id_idx ON public.developer_sales USING btree (estate_id);;

-- public.developer_sales_one_open_sale_per_plot
CREATE UNIQUE INDEX IF NOT EXISTS developer_sales_one_open_sale_per_plot ON public.developer_sales USING btree (plot_id) WHERE (status = ANY (ARRAY['draft'::developer_sale_status, 'active'::developer_sale_status, 'defaulting'::developer_sale_status]));;

-- public.developer_sales_plot_id_idx
CREATE INDEX IF NOT EXISTS developer_sales_plot_id_idx ON public.developer_sales USING btree (plot_id);;

-- public.developer_sales_sale_reference_key
CREATE UNIQUE INDEX IF NOT EXISTS developer_sales_sale_reference_key ON public.developer_sales USING btree (sale_reference);;

-- public.developer_sales_status_idx
CREATE INDEX IF NOT EXISTS developer_sales_status_idx ON public.developer_sales USING btree (status);;

-- public.developer_staff_invites_account_idx
CREATE INDEX IF NOT EXISTS developer_staff_invites_account_idx ON public.developer_staff_invites USING btree (developer_account_id);;

-- public.developer_staff_invites_phone_idx
CREATE INDEX IF NOT EXISTS developer_staff_invites_phone_idx ON public.developer_staff_invites USING btree (phone_number);;

-- public.developer_staff_invites_token_hash_idx
CREATE INDEX IF NOT EXISTS developer_staff_invites_token_hash_idx ON public.developer_staff_invites USING btree (token_hash);;

-- public.developer_staff_permissions_account_idx
CREATE INDEX IF NOT EXISTS developer_staff_permissions_account_idx ON public.developer_staff_permissions USING btree (developer_account_id);;

-- public.developer_staff_permissions_profile_idx
CREATE INDEX IF NOT EXISTS developer_staff_permissions_profile_idx ON public.developer_staff_permissions USING btree (developer_profile_id);;

-- public.developer_staff_role_links_account_idx
CREATE INDEX IF NOT EXISTS developer_staff_role_links_account_idx ON public.developer_staff_role_links USING btree (developer_account_id);;

-- public.developer_staff_role_links_status_idx
CREATE INDEX IF NOT EXISTS developer_staff_role_links_status_idx ON public.developer_staff_role_links USING btree (status);;

-- public.developer_staff_role_links_token_hash_idx
CREATE INDEX IF NOT EXISTS developer_staff_role_links_token_hash_idx ON public.developer_staff_role_links USING btree (token_hash);;

-- public.notifications_landlord_status_idx
CREATE INDEX IF NOT EXISTS notifications_landlord_status_idx ON public.notifications USING btree (landlord_id, status, created_at DESC);;

-- public.profiles_active_role_idx
CREATE INDEX IF NOT EXISTS profiles_active_role_idx ON public.profiles USING btree (is_active, role);;

-- public.profiles_environment_mode_idx
CREATE INDEX IF NOT EXISTS profiles_environment_mode_idx ON public.profiles USING btree (environment_mode);;

-- public.profiles_phone_idx
CREATE INDEX IF NOT EXISTS profiles_phone_idx ON public.profiles USING btree (phone_number);;

-- public.profiles_role_idx
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles USING btree (role);;

-- 6. Core helper functions for RLS
create or replace function public.user_has_developer_account(p_developer_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.developer_accounts da
    where da.id = p_developer_account_id
      and da.owner_profile_id = auth.uid()
  )
  or exists (
    select 1
    from public.developer_profiles dp
    where dp.developer_account_id = p_developer_account_id
      and dp.profile_id = auth.uid()
      and dp.is_active = true
      and dp.revoked_at is null
  );
$$;

create or replace function public.user_owns_developer_account(p_developer_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.developer_accounts da
    where da.id = p_developer_account_id
      and da.owner_profile_id = auth.uid()
  );
$$;

-- 7. Business functions
-- public.create_developer_buyer_purchase_link
CREATE OR REPLACE FUNCTION public.create_developer_buyer_purchase_link(
  p_developer_account_id uuid,
  p_estate_id uuid,
  p_plot_id uuid,
  p_token_hash text,
  p_buyer_phone text,
  p_buyer_name text,
  p_buyer_email text,
  p_payment_plan_mode text,
  p_first_payment_amount numeric,
  p_total_price numeric,
  p_note text,
  p_created_by_profile_id uuid,
  p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone
)
RETURNS developer_buyer_purchase_links
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_plot public.developer_plots%rowtype;
  v_link public.developer_buyer_purchase_links%rowtype;
begin
  select *
  into v_plot
  from public.developer_plots
  where id = p_plot_id
    and developer_account_id = p_developer_account_id
    and estate_id = p_estate_id
  for update;

  if not found then
    raise exception 'Plot was not found for this estate.';
  end if;

  if v_plot.status <> 'available' then
    raise exception 'This plot is not available to reserve.';
  end if;

  if p_first_payment_amount <= 0 or p_total_price <= 0 then
    raise exception 'Payment amounts must be greater than zero.';
  end if;

  if p_first_payment_amount > p_total_price then
    raise exception 'First payment cannot exceed total price.';
  end if;

  if p_payment_plan_mode = 'outright'
    and p_first_payment_amount <> p_total_price then
    raise exception 'Full payment requires the first payment to equal the total price.';
  end if;

  update public.developer_buyer_purchase_links
  set
    status = 'cancelled',
    updated_at = now()
  where plot_id = p_plot_id
    and status in ('pending', 'details_submitted', 'payment_started');

  update public.developer_plots
  set
    status = 'reserved',
    updated_at = now()
  where id = p_plot_id;

  insert into public.developer_buyer_purchase_links (
    developer_account_id,
    estate_id,
    plot_id,
    token_hash,
    buyer_phone,
    buyer_name,
    buyer_email,
    payment_plan_mode,
    first_payment_amount,
    total_price,
    note,
    status,
    expires_at,
    created_by_profile_id
  )
  values (
    p_developer_account_id,
    p_estate_id,
    p_plot_id,
    p_token_hash,
    p_buyer_phone,
    nullif(trim(coalesce(p_buyer_name, '')), ''),
    nullif(trim(coalesce(p_buyer_email, '')), ''),
    p_payment_plan_mode,
    p_first_payment_amount,
    p_total_price,
    nullif(trim(coalesce(p_note, '')), ''),
    'pending',
    p_expires_at,
    p_created_by_profile_id
  )
  returning *
  into v_link;

  return v_link;
end;
$function$;

-- public.create_developer_payment_plan
CREATE OR REPLACE FUNCTION public.create_developer_payment_plan(
  p_developer_account_id uuid,
  p_sale_id uuid,
  p_payment_plan_mode developer_payment_plan_mode,
  p_schedule_start_date date,
  p_notes text,
  p_items jsonb
)
RETURNS developer_payment_plans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_sale public.developer_sales%rowtype;
  v_plan public.developer_payment_plans%rowtype;
  v_item jsonb;
  v_total numeric(14, 2) := 0;
  v_item_count integer := 0;
begin
  if not exists (
    select 1
    from public.developer_profiles
    where developer_profiles.profile_id = auth.uid()
      and developer_profiles.developer_account_id = p_developer_account_id
      and developer_profiles.is_active = true
  ) then
    raise exception 'Developer account access denied.';
  end if;

  select *
  into v_sale
  from public.developer_sales
  where id = p_sale_id
    and developer_account_id = p_developer_account_id
    and status = 'active'
  for update;

  if not found then
    raise exception 'Active sale was not found for this developer account.';
  end if;

  if exists (
    select 1
    from public.developer_payment_plans
    where sale_id = p_sale_id
      and status in ('draft', 'active')
  ) then
    raise exception 'This sale already has an active payment plan.';
  end if;

  if jsonb_typeof(p_items) <> 'array' then
    raise exception 'Payment schedule items must be an array.';
  end if;

  v_item_count := jsonb_array_length(p_items);

  if v_item_count < 1 then
    raise exception 'At least one payment schedule item is required.';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    if nullif(trim(coalesce(v_item->>'label', '')), '') is null then
      raise exception 'Each payment schedule item must have a label.';
    end if;

    if nullif(trim(coalesce(v_item->>'due_date', '')), '') is null then
      raise exception 'Each payment schedule item must have a due date.';
    end if;

    if coalesce((v_item->>'expected_amount')::numeric, 0) <= 0 then
      raise exception 'Each payment schedule item must have an amount greater than zero.';
    end if;

    v_total := v_total + ((v_item->>'expected_amount')::numeric);
  end loop;

  if round(v_total, 2) <> round(v_sale.total_price_locked, 2) then
    raise exception 'Payment schedule total must equal locked sale price.';
  end if;

  insert into public.developer_payment_plans (
    developer_account_id,
    sale_id,
    payment_plan_mode,
    total_amount,
    schedule_start_date,
    status,
    notes
  )
  values (
    p_developer_account_id,
    p_sale_id,
    p_payment_plan_mode,
    v_sale.total_price_locked,
    p_schedule_start_date,
    'active',
    nullif(trim(coalesce(p_notes, '')), '')
  )
  returning *
  into v_plan;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into public.developer_payment_schedule_items (
      developer_account_id,
      payment_plan_id,
      sale_id,
      label,
      due_date,
      expected_amount,
      amount_paid,
      status,
      sort_order
    )
    values (
      p_developer_account_id,
      v_plan.id,
      p_sale_id,
      trim(v_item->>'label'),
      (v_item->>'due_date')::date,
      round((v_item->>'expected_amount')::numeric, 2),
      0,
      'pending',
      coalesce((v_item->>'sort_order')::integer, 0)
    );
  end loop;

  return v_plan;
end;
$function$;

-- public.create_developer_plot_assignment
CREATE OR REPLACE FUNCTION public.create_developer_plot_assignment(p_developer_account_id uuid, p_estate_id uuid, p_plot_id uuid, p_buyer_id uuid, p_assignment_note text DEFAULT NULL::text)
 RETURNS developer_plot_assignments
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_plot public.developer_plots;
  v_buyer public.developer_buyers;
  v_assignment public.developer_plot_assignments;
begin
  if not exists (
    select 1
    from public.developer_profiles
    where developer_profiles.profile_id = auth.uid()
      and developer_profiles.developer_account_id = p_developer_account_id
      and developer_profiles.is_active = true
  ) then
    raise exception 'Developer account access denied.';
  end if;

  select *
  into v_plot
  from public.developer_plots
  where id = p_plot_id
    and estate_id = p_estate_id
    and developer_account_id = p_developer_account_id
  for update;

  if not found then
    raise exception 'Plot was not found for this developer account.';
  end if;

  if v_plot.status <> 'available' then
    raise exception 'Only available plots can be assigned to buyers.';
  end if;

  select *
  into v_buyer
  from public.developer_buyers
  where id = p_buyer_id
    and developer_account_id = p_developer_account_id
  for update;

  if not found then
    raise exception 'Buyer was not found for this developer account.';
  end if;

  if exists (
    select 1
    from public.developer_plot_assignments
    where plot_id = p_plot_id
      and status in ('reserved', 'active')
  ) then
    raise exception 'This plot already has an active assignment.';
  end if;

  if exists (
    select 1
    from public.developer_plot_assignments
    where buyer_id = p_buyer_id
      and status in ('reserved', 'active')
  ) then
    raise exception 'This buyer already has an active plot assignment.';
  end if;

  insert into public.developer_plot_assignments (
    developer_account_id,
    estate_id,
    plot_id,
    buyer_id,
    status,
    assignment_note
  )
  values (
    p_developer_account_id,
    p_estate_id,
    p_plot_id,
    p_buyer_id,
    'reserved',
    nullif(trim(coalesce(p_assignment_note, '')), '')
  )
  returning *
  into v_assignment;

  update public.developer_plots
  set status = 'reserved',
      updated_at = now()
  where id = p_plot_id
    and developer_account_id = p_developer_account_id;

  update public.developer_buyers
  set status = 'assigned',
      updated_at = now()
  where id = p_buyer_id
    and developer_account_id = p_developer_account_id;

  return v_assignment;
end;
$function$

-- public.create_developer_sale_from_assignment
CREATE OR REPLACE FUNCTION public.create_developer_sale_from_assignment(p_developer_account_id uuid, p_plot_assignment_id uuid, p_payment_plan_mode developer_payment_plan_mode, p_total_price_locked numeric, p_initial_deposit_amount numeric DEFAULT 0, p_sale_date date DEFAULT CURRENT_DATE, p_expected_completion_date date DEFAULT NULL::date, p_notes text DEFAULT NULL::text)
 RETURNS developer_sales
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_assignment public.developer_plot_assignments;
  v_plot public.developer_plots;
  v_sale public.developer_sales;
  v_sale_reference text;
begin
  if not exists (
    select 1
    from public.developer_profiles
    where developer_profiles.profile_id = auth.uid()
      and developer_profiles.developer_account_id = p_developer_account_id
      and developer_profiles.is_active = true
  ) then
    raise exception 'Developer account access denied.';
  end if;

  if p_total_price_locked <= 0 then
    raise exception 'Sale price must be greater than zero.';
  end if;

  if p_initial_deposit_amount < 0 then
    raise exception 'Initial deposit cannot be negative.';
  end if;

  if p_initial_deposit_amount > p_total_price_locked then
    raise exception 'Initial deposit cannot exceed sale price.';
  end if;

  select *
  into v_assignment
  from public.developer_plot_assignments
  where id = p_plot_assignment_id
    and developer_account_id = p_developer_account_id
    and status = 'reserved'
  for update;

  if not found then
    raise exception 'Reserved plot assignment was not found.';
  end if;

  select *
  into v_plot
  from public.developer_plots
  where id = v_assignment.plot_id
    and developer_account_id = p_developer_account_id
    and estate_id = v_assignment.estate_id
  for update;

  if not found then
    raise exception 'Assigned plot was not found.';
  end if;

  if v_plot.status <> 'reserved' then
    raise exception 'Only reserved plots can be converted to a sale.';
  end if;

  if exists (
    select 1
    from public.developer_sales
    where plot_id = v_assignment.plot_id
      and status in ('draft', 'active', 'defaulting')
  ) then
    raise exception 'This plot already has an open sale.';
  end if;

  if exists (
    select 1
    from public.developer_sales
    where buyer_id = v_assignment.buyer_id
      and status in ('draft', 'active', 'defaulting')
  ) then
    raise exception 'This buyer already has an open sale.';
  end if;

  v_sale_reference := concat(
    'PPS-',
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
  );

  insert into public.developer_sales (
    developer_account_id,
    estate_id,
    plot_id,
    buyer_id,
    plot_assignment_id,
    sale_reference,
    payment_plan_mode,
    total_price_locked,
    initial_deposit_amount,
    sale_date,
    expected_completion_date,
    status,
    agreement_generated_at,
    notes
  )
  values (
    p_developer_account_id,
    v_assignment.estate_id,
    v_assignment.plot_id,
    v_assignment.buyer_id,
    v_assignment.id,
    v_sale_reference,
    p_payment_plan_mode,
    p_total_price_locked,
    p_initial_deposit_amount,
    p_sale_date,
    p_expected_completion_date,
    'active',
    now(),
    nullif(trim(coalesce(p_notes, '')), '')
  )
  returning *
  into v_sale;

  update public.developer_plot_assignments
  set status = 'converted_to_sale',
      updated_at = now()
  where id = v_assignment.id
    and developer_account_id = p_developer_account_id;

  update public.developer_plots
  set status = 'active',
      price = p_total_price_locked,
      updated_at = now()
  where id = v_assignment.plot_id
    and developer_account_id = p_developer_account_id;

  update public.developer_buyers
  set status = 'active',
      updated_at = now()
  where id = v_assignment.buyer_id
    and developer_account_id = p_developer_account_id;

  return v_sale;
end;
$function$

-- public.create_public_buyer_purchase_sale_from_link
CREATE OR REPLACE FUNCTION public.create_public_buyer_purchase_sale_from_link(p_purchase_link_id uuid, p_buyer_full_name text, p_buyer_phone text, p_buyer_email text, p_buyer_nin text, p_buyer_address text, p_buyer_next_of_kin_name text, p_buyer_next_of_kin_phone text)
 RETURNS TABLE(sale_id uuid, schedule_item_id uuid, buyer_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_link public.developer_buyer_purchase_links%rowtype;
  v_estate public.developer_estates%rowtype;
  v_plot public.developer_plots%rowtype;
  v_buyer public.developer_buyers%rowtype;
  v_assignment public.developer_plot_assignments%rowtype;
  v_sale public.developer_sales%rowtype;
  v_payment_plan public.developer_payment_plans%rowtype;

  v_schedule_item_id uuid;
  v_sale_date date;
  v_sale_reference text;

  v_payment_plan_mode_text text;
  v_payment_plan_mode public.developer_payment_plan_mode;
  v_initial_payment_percentage numeric(5, 2);
  v_total_price numeric(14, 2);
  v_first_payment numeric(14, 2);
  v_balance numeric(14, 2);

  v_balance_spread_months integer;
  v_interval_months integer;
  v_installment_count integer;
  v_installment_amount numeric(14, 2);
  v_current_installment_amount numeric(14, 2);
  v_running_total numeric(14, 2);
  v_index integer;
begin
  if p_purchase_link_id is null then
    raise exception 'Purchase link is required.';
  end if;

  if nullif(trim(coalesce(p_buyer_full_name, '')), '') is null then
    raise exception 'Buyer full name is required.';
  end if;

  if nullif(trim(coalesce(p_buyer_phone, '')), '') is null then
    raise exception 'Buyer phone is required.';
  end if;

  if nullif(trim(coalesce(p_buyer_nin, '')), '') is null then
    raise exception 'Buyer NIN is required.';
  end if;

  if nullif(trim(coalesce(p_buyer_address, '')), '') is null then
    raise exception 'Buyer address is required.';
  end if;

  if nullif(trim(coalesce(p_buyer_next_of_kin_name, '')), '') is null then
    raise exception 'Next of kin name is required.';
  end if;

  if nullif(trim(coalesce(p_buyer_next_of_kin_phone, '')), '') is null then
    raise exception 'Next of kin phone is required.';
  end if;

  select l.*
  into v_link
  from public.developer_buyer_purchase_links l
  where l.id = p_purchase_link_id
  for update;

  if not found then
    raise exception 'Purchase link was not found.';
  end if;

  if v_link.status not in ('pending', 'details_submitted', 'payment_started') then
    raise exception 'This purchase link is no longer active.';
  end if;

  if v_link.expires_at is not null and v_link.expires_at <= now() then
    raise exception 'This purchase link has expired.';
  end if;

  if v_link.sale_id is not null and v_link.buyer_id is not null then
    select dpsi.id
    into v_schedule_item_id
    from public.developer_payment_schedule_items dpsi
    where dpsi.developer_account_id = v_link.developer_account_id
      and dpsi.sale_id = v_link.sale_id
      and dpsi.sort_order = 0
    order by dpsi.created_at asc
    limit 1;

    if v_schedule_item_id is null then
      raise exception 'Payment schedule could not be prepared.';
    end if;

    return query
    select v_link.sale_id, v_schedule_item_id, v_link.buyer_id;

    return;
  end if;

  select e.*
  into v_estate
  from public.developer_estates e
  where e.id = v_link.estate_id
    and e.developer_account_id = v_link.developer_account_id;

  if not found then
    raise exception 'Estate was not found for this purchase link.';
  end if;

  select p.*
  into v_plot
  from public.developer_plots p
  where p.id = v_link.plot_id
    and p.developer_account_id = v_link.developer_account_id
    and p.estate_id = v_link.estate_id
  for update;

  if not found then
    raise exception 'Plot was not found for this purchase link.';
  end if;

  if v_plot.status <> 'reserved' then
    raise exception 'This plot is not reserved for purchase.';
  end if;

  v_payment_plan_mode_text := coalesce(
    nullif(v_estate.default_payment_plan_mode::text, ''),
    'fixed_installment'
  );

  if v_payment_plan_mode_text not in ('outright', 'fixed_installment', 'flexible') then
    raise exception 'Estate payment plan mode is invalid.';
  end if;

  v_payment_plan_mode := v_payment_plan_mode_text::public.developer_payment_plan_mode;

  v_initial_payment_percentage := coalesce(v_estate.initial_payment_percentage, 25.00);
  v_balance_spread_months := coalesce(v_estate.balance_spread_months, 12);

  if v_initial_payment_percentage <= 0 or v_initial_payment_percentage > 100 then
    raise exception 'Estate initial payment percentage is invalid.';
  end if;

  if v_balance_spread_months < 1 or v_balance_spread_months > 120 then
    raise exception 'Estate balance spread months is invalid.';
  end if;

  v_interval_months :=
    case coalesce(v_estate.installment_interval, 'monthly')
      when 'monthly' then 1
      when 'quarterly' then 3
      when 'biannual' then 6
      when 'annual' then 12
      else null
    end;

  if v_interval_months is null then
    raise exception 'Estate installment interval is invalid.';
  end if;

  v_total_price := round(coalesce(v_plot.price, 0), 2);

  if v_total_price <= 0 then
    raise exception 'Plot price must be greater than zero.';
  end if;

  if v_payment_plan_mode = 'outright'::public.developer_payment_plan_mode then
    v_first_payment := v_total_price;
  else
    v_first_payment := round(
      v_total_price * (v_initial_payment_percentage / 100),
      2
    );
  end if;

  if v_first_payment <= 0 then
    raise exception 'First payment must be greater than zero.';
  end if;

  if v_first_payment > v_total_price then
    raise exception 'First payment cannot exceed total price.';
  end if;

  v_balance := round(v_total_price - v_first_payment, 2);

  update public.developer_buyer_purchase_links l
  set
    payment_plan_mode = v_payment_plan_mode::text,
    first_payment_amount = v_first_payment,
    total_price = v_total_price,
    updated_at = now()
  where l.id = v_link.id
  returning l.*
  into v_link;

  select b.*
  into v_buyer
  from public.developer_buyers b
  where b.developer_account_id = v_link.developer_account_id
    and b.phone_number = p_buyer_phone
  for update;

  if found then
    update public.developer_buyers b
    set
      full_name = trim(p_buyer_full_name),
      phone_number = p_buyer_phone,
      email = nullif(trim(coalesce(p_buyer_email, '')), ''),
      nin = trim(p_buyer_nin),
      next_of_kin_name = trim(p_buyer_next_of_kin_name),
      next_of_kin_phone = p_buyer_next_of_kin_phone,
      residential_address = trim(p_buyer_address),
      status = 'assigned',
      updated_at = now()
    where b.id = v_buyer.id
    returning b.*
    into v_buyer;
  else
    insert into public.developer_buyers (
      developer_account_id,
      full_name,
      phone_number,
      email,
      nin,
      next_of_kin_name,
      next_of_kin_phone,
      residential_address,
      status
    )
    values (
      v_link.developer_account_id,
      trim(p_buyer_full_name),
      p_buyer_phone,
      nullif(trim(coalesce(p_buyer_email, '')), ''),
      trim(p_buyer_nin),
      trim(p_buyer_next_of_kin_name),
      p_buyer_next_of_kin_phone,
      trim(p_buyer_address),
      'assigned'
    )
    returning *
    into v_buyer;
  end if;

  select dpa.*
  into v_assignment
  from public.developer_plot_assignments dpa
  where dpa.developer_account_id = v_link.developer_account_id
    and dpa.estate_id = v_link.estate_id
    and dpa.plot_id = v_link.plot_id
    and dpa.buyer_id = v_buyer.id
    and dpa.status in ('reserved', 'active')
  order by dpa.assigned_at desc
  limit 1
  for update;

  if not found then
    insert into public.developer_plot_assignments (
      developer_account_id,
      estate_id,
      plot_id,
      buyer_id,
      status,
      assignment_note,
      assigned_at
    )
    values (
      v_link.developer_account_id,
      v_link.estate_id,
      v_link.plot_id,
      v_buyer.id,
      'reserved',
      v_link.note,
      now()
    )
    returning *
    into v_assignment;
  end if;

  select ds.*
  into v_sale
  from public.developer_sales ds
  where ds.plot_assignment_id = v_assignment.id
  limit 1;

  v_sale_date := current_date;

  if not found then
    v_sale_reference :=
      'PPS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

    insert into public.developer_sales (
      developer_account_id,
      estate_id,
      plot_id,
      buyer_id,
      plot_assignment_id,
      sale_reference,
      payment_plan_mode,
      total_price_locked,
      initial_deposit_amount,
      sale_date,
      expected_completion_date,
      status,
      notes
    )
    values (
      v_link.developer_account_id,
      v_link.estate_id,
      v_link.plot_id,
      v_buyer.id,
      v_assignment.id,
      v_sale_reference,
      v_payment_plan_mode,
      v_total_price,
      v_first_payment,
      v_sale_date,
      case
        when v_balance > 0 then
          (v_sale_date + make_interval(months => v_balance_spread_months))::date
        else
          v_sale_date
      end,
      'active',
      v_link.note
    )
    returning *
    into v_sale;

    update public.developer_plot_assignments dpa
    set
      status = 'converted_to_sale',
      updated_at = now()
    where dpa.id = v_assignment.id;

    update public.developer_plots p
    set
      status = 'active',
      updated_at = now()
    where p.id = v_link.plot_id;

    insert into public.developer_payment_plans (
      developer_account_id,
      sale_id,
      payment_plan_mode,
      total_amount,
      schedule_start_date,
      status,
      notes
    )
    values (
      v_link.developer_account_id,
      v_sale.id,
      v_payment_plan_mode,
      v_total_price,
      v_sale_date,
      'active',
      v_link.note
    )
    returning *
    into v_payment_plan;

    insert into public.developer_payment_schedule_items (
      developer_account_id,
      payment_plan_id,
      sale_id,
      label,
      due_date,
      expected_amount,
      amount_paid,
      status,
      sort_order
    )
    values (
      v_link.developer_account_id,
      v_payment_plan.id,
      v_sale.id,
      'First payment',
      v_sale_date,
      v_first_payment,
      0,
      'pending',
      0
    )
    returning id
    into v_schedule_item_id;

    if v_balance > 0 then
      v_installment_count := greatest(
        1,
        ceil(v_balance_spread_months::numeric / v_interval_months::numeric)::integer
      );

      v_installment_amount := round(v_balance / v_installment_count, 2);
      v_running_total := 0;
      v_index := 1;

      while v_index <= v_installment_count loop
        if v_index = v_installment_count then
          v_current_installment_amount := round(v_balance - v_running_total, 2);
        else
          v_current_installment_amount := v_installment_amount;
          v_running_total := round(v_running_total + v_current_installment_amount, 2);
        end if;

        insert into public.developer_payment_schedule_items (
          developer_account_id,
          payment_plan_id,
          sale_id,
          label,
          due_date,
          expected_amount,
          amount_paid,
          status,
          sort_order
        )
        values (
          v_link.developer_account_id,
          v_payment_plan.id,
          v_sale.id,
          case
            when v_payment_plan_mode = 'flexible'::public.developer_payment_plan_mode then
              'Balance payment ' || v_index || ' of ' || v_installment_count
            else
              'Installment ' || v_index || ' of ' || v_installment_count
          end,
          (v_sale_date + make_interval(months => v_index * v_interval_months))::date,
          v_current_installment_amount,
          0,
          'pending',
          v_index
        );

        v_index := v_index + 1;
      end loop;
    end if;
  else
    select dpsi.id
    into v_schedule_item_id
    from public.developer_payment_schedule_items dpsi
    where dpsi.developer_account_id = v_link.developer_account_id
      and dpsi.sale_id = v_sale.id
      and dpsi.sort_order = 0
    order by dpsi.created_at asc
    limit 1;
  end if;

  if v_schedule_item_id is null then
    raise exception 'Payment schedule could not be prepared.';
  end if;

  update public.developer_buyer_purchase_links l
  set
    buyer_id = v_buyer.id,
    sale_id = v_sale.id,
    buyer_full_name = trim(p_buyer_full_name),
    buyer_phone = p_buyer_phone,
    buyer_email = nullif(trim(coalesce(p_buyer_email, '')), ''),
    buyer_nin = trim(p_buyer_nin),
    buyer_address = trim(p_buyer_address),
    buyer_next_of_kin_name = trim(p_buyer_next_of_kin_name),
    buyer_next_of_kin_phone = p_buyer_next_of_kin_phone,
    status = 'payment_started',
    updated_at = now()
  where l.id = v_link.id;

  return query
  select v_sale.id, v_schedule_item_id, v_buyer.id;
end;
$function$

-- public.get_public_developer_buyer_purchase_link_by_hash
CREATE OR REPLACE FUNCTION public.get_public_developer_buyer_purchase_link_by_hash(p_token_hash text)
 RETURNS TABLE(id uuid, developer_account_id uuid, estate_id uuid, plot_id uuid, buyer_id uuid, sale_id uuid, token_hash text, buyer_name text, buyer_phone text, buyer_email text, buyer_full_name text, buyer_nin text, buyer_address text, buyer_next_of_kin_name text, buyer_next_of_kin_phone text, payment_plan_mode text, first_payment_amount numeric, total_price numeric, note text, status text, expires_at timestamp with time zone, used_at timestamp with time zone, created_by_profile_id uuid, created_at timestamp with time zone, updated_at timestamp with time zone, estate_name text, estate_location text, estate_city text, estate_state text, plot_number text, plot_size_label text, plot_price numeric, plot_status text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    l.id,
    l.developer_account_id,
    l.estate_id,
    l.plot_id,
    l.buyer_id,
    l.sale_id,
    l.token_hash,
    l.buyer_name,
    l.buyer_phone,
    l.buyer_email,
    l.buyer_full_name,
    l.buyer_nin,
    l.buyer_address,
    l.buyer_next_of_kin_name,
    l.buyer_next_of_kin_phone,
    l.payment_plan_mode,
    l.first_payment_amount,
    l.total_price,
    l.note,
    l.status,
    l.expires_at,
    l.used_at,
    l.created_by_profile_id,
    l.created_at,
    l.updated_at,
    e.estate_name,
    e.location as estate_location,
    e.city as estate_city,
    e.state as estate_state,
    p.plot_number,
    p.size_label as plot_size_label,
    p.price as plot_price,
    p.status as plot_status
  from public.developer_buyer_purchase_links l
  join public.developer_estates e
    on e.id = l.estate_id
   and e.developer_account_id = l.developer_account_id
  join public.developer_plots p
    on p.id = l.plot_id
   and p.estate_id = l.estate_id
   and p.developer_account_id = l.developer_account_id
  where l.token_hash = p_token_hash
  limit 1;
$function$

-- public.increment_developer_staff_role_link_accepted_count
CREATE OR REPLACE FUNCTION public.increment_developer_staff_role_link_accepted_count(p_role_link_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  update public.developer_staff_role_links
  set
    accepted_count = accepted_count + 1,
    updated_at = now()
  where id = p_role_link_id
    and status = 'active';
end;
$function$

-- public.post_developer_verified_payment
CREATE OR REPLACE FUNCTION public.post_developer_verified_payment(p_payment_intent_id uuid, p_paystack_reference text, p_verified_total_amount numeric, p_verified_paid_at timestamp with time zone DEFAULT now())
 RETURNS developer_sale_payments
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_intent public.developer_payment_intents;
  v_sale public.developer_sales;
  v_current_balance numeric(14, 2);
  v_balance_after numeric(14, 2);
  v_payment public.developer_sale_payments;
begin
  select *
  into v_intent
  from public.developer_payment_intents
  where id = p_payment_intent_id
    and paystack_reference = p_paystack_reference
  for update;

  if not found then
    raise exception 'Payment intent was not found.';
  end if;

  if v_intent.status = 'paid' and v_intent.processed_payment_id is not null then
    select *
    into v_payment
    from public.developer_sale_payments
    where id = v_intent.processed_payment_id;

    return v_payment;
  end if;

  if v_intent.status <> 'initialized' then
    raise exception 'Payment intent is not payable.';
  end if;

  if round(v_intent.total_amount, 2) <> round(p_verified_total_amount, 2) then
    raise exception 'Verified payment amount does not match expected amount.';
  end if;

  select *
  into v_sale
  from public.developer_sales
  where id = v_intent.sale_id
    and developer_account_id = v_intent.developer_account_id
    and status = 'active'
  for update;

  if not found then
    raise exception 'Active sale was not found.';
  end if;

  select coalesce(running_balance, v_sale.total_price_locked)
  into v_current_balance
  from public.developer_sale_ledger_entries
  where sale_id = v_sale.id
  order by created_at desc
  limit 1;

  if v_current_balance is null then
    v_current_balance := v_sale.total_price_locked;

    insert into public.developer_sale_ledger_entries (
      developer_account_id,
      sale_id,
      buyer_id,
      payment_id,
      entry_type,
      debit_amount,
      credit_amount,
      running_balance,
      description,
      metadata
    )
    values (
      v_sale.developer_account_id,
      v_sale.id,
      v_sale.buyer_id,
      null,
      'sale_charge',
      v_sale.total_price_locked,
      0,
      v_sale.total_price_locked,
      'Locked sale price posted to buyer ledger.',
      jsonb_build_object(
        'sale_reference', v_sale.sale_reference,
        'source', 'post_developer_verified_payment'
      )
    );
  end if;

  if v_intent.installment_amount > v_current_balance then
    raise exception 'Payment amount exceeds outstanding sale balance.';
  end if;

  v_balance_after := v_current_balance - v_intent.installment_amount;

  insert into public.developer_sale_payments (
    developer_account_id,
    sale_id,
    buyer_id,
    estate_id,
    plot_id,
    schedule_item_id,
    payment_intent_id,
    amount_paid,
    platform_fee_amount,
    total_paid_amount,
    payment_method,
    payment_reference,
    payment_date,
    status,
    balance_before,
    balance_after,
    metadata
  )
  values (
    v_intent.developer_account_id,
    v_intent.sale_id,
    v_intent.buyer_id,
    v_intent.estate_id,
    v_intent.plot_id,
    v_intent.schedule_item_id,
    v_intent.id,
    v_intent.installment_amount,
    v_intent.platform_fee_amount,
    v_intent.total_amount,
    'paystack_gateway',
    v_intent.paystack_reference,
    p_verified_paid_at::date,
    'posted',
    v_current_balance,
    v_balance_after,
    jsonb_build_object(
      'payment_intent_id', v_intent.id,
      'paystack_reference', v_intent.paystack_reference,
      'source', 'paystack_verified'
    )
  )
  returning *
  into v_payment;

  insert into public.developer_sale_ledger_entries (
    developer_account_id,
    sale_id,
    buyer_id,
    payment_id,
    entry_type,
    debit_amount,
    credit_amount,
    running_balance,
    description,
    metadata
  )
  values (
    v_intent.developer_account_id,
    v_intent.sale_id,
    v_intent.buyer_id,
    v_payment.id,
    'payment_credit',
    0,
    v_intent.installment_amount,
    v_balance_after,
    'Buyer installment payment confirmed through Paystack.',
    jsonb_build_object(
      'payment_id', v_payment.id,
      'payment_intent_id', v_intent.id,
      'paystack_reference', v_intent.paystack_reference
    )
  );

  update public.developer_payment_schedule_items
  set amount_paid = least(expected_amount, amount_paid + v_intent.installment_amount),
      status = case
        when least(expected_amount, amount_paid + v_intent.installment_amount) >= expected_amount
          then 'paid'::public.developer_payment_schedule_item_status
        when least(expected_amount, amount_paid + v_intent.installment_amount) > 0
          then 'part_paid'::public.developer_payment_schedule_item_status
        else status
      end,
      updated_at = now()
  where id = v_intent.schedule_item_id
    and developer_account_id = v_intent.developer_account_id;

  update public.developer_payment_allocations
  set status = 'paid',
      payment_id = v_payment.id,
      updated_at = now()
  where payment_intent_id = v_intent.id
    and developer_account_id = v_intent.developer_account_id;

  update public.developer_payment_intents
  set status = 'paid',
      paid_at = p_verified_paid_at,
      verified_at = now(),
      processed_payment_id = v_payment.id,
      updated_at = now()
  where id = v_intent.id;

  if v_balance_after = 0 then
    update public.developer_payment_plans
    set status = 'completed',
        updated_at = now()
    where sale_id = v_sale.id
      and developer_account_id = v_sale.developer_account_id
      and status = 'active';

    update public.developer_sales
    set status = 'completed',
        updated_at = now()
    where id = v_sale.id
      and developer_account_id = v_sale.developer_account_id;

    update public.developer_plots
    set status = 'sold',
        updated_at = now()
    where id = v_sale.plot_id
      and developer_account_id = v_sale.developer_account_id;
  end if;

  return v_payment;
end;
$function$

-- public.set_developer_paystack_accounts_updated_at
CREATE OR REPLACE FUNCTION public.set_developer_paystack_accounts_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$

-- public.touch_updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$

-- 8. Updated-at triggers
drop trigger if exists trg_developer_accounts_updated_at on public.developer_accounts;
create trigger trg_developer_accounts_updated_at before update on public.developer_accounts for each row execute function public.touch_updated_at();

drop trigger if exists trg_developer_buyer_purchase_links_updated_at on public.developer_buyer_purchase_links;
create trigger trg_developer_buyer_purchase_links_updated_at before update on public.developer_buyer_purchase_links for each row execute function public.touch_updated_at();

drop trigger if exists trg_developer_buyer_sale_access_tokens_updated_at on public.developer_buyer_sale_access_tokens;
create trigger trg_developer_buyer_sale_access_tokens_updated_at before update on public.developer_buyer_sale_access_tokens for each row execute function public.touch_updated_at();

drop trigger if exists trg_developer_buyers_updated_at on public.developer_buyers;
create trigger trg_developer_buyers_updated_at before update on public.developer_buyers for each row execute function public.touch_updated_at();

drop trigger if exists trg_developer_document_templates_updated_at on public.developer_document_templates;
create trigger trg_developer_document_templates_updated_at before update on public.developer_document_templates for each row execute function public.touch_updated_at();

drop trigger if exists trg_developer_estates_updated_at on public.developer_estates;
create trigger trg_developer_estates_updated_at before update on public.developer_estates for each row execute function public.touch_updated_at();

drop trigger if exists trg_developer_payment_allocations_updated_at on public.developer_payment_allocations;
create trigger trg_developer_payment_allocations_updated_at before update on public.developer_payment_allocations for each row execute function public.touch_updated_at();

drop trigger if exists trg_developer_payment_intents_updated_at on public.developer_payment_intents;
create trigger trg_developer_payment_intents_updated_at before update on public.developer_payment_intents for each row execute function public.touch_updated_at();

drop trigger if exists trg_developer_payment_plans_updated_at on public.developer_payment_plans;
create trigger trg_developer_payment_plans_updated_at before update on public.developer_payment_plans for each row execute function public.touch_updated_at();

drop trigger if exists trg_developer_payment_schedule_items_updated_at on public.developer_payment_schedule_items;
create trigger trg_developer_payment_schedule_items_updated_at before update on public.developer_payment_schedule_items for each row execute function public.touch_updated_at();

drop trigger if exists trg_developer_paystack_accounts_updated_at on public.developer_paystack_accounts;
create trigger trg_developer_paystack_accounts_updated_at before update on public.developer_paystack_accounts for each row execute function public.touch_updated_at();

drop trigger if exists trg_developer_plot_assignments_updated_at on public.developer_plot_assignments;
create trigger trg_developer_plot_assignments_updated_at before update on public.developer_plot_assignments for each row execute function public.touch_updated_at();

drop trigger if exists trg_developer_plot_types_updated_at on public.developer_plot_types;
create trigger trg_developer_plot_types_updated_at before update on public.developer_plot_types for each row execute function public.touch_updated_at();

drop trigger if exists trg_developer_plots_updated_at on public.developer_plots;
create trigger trg_developer_plots_updated_at before update on public.developer_plots for each row execute function public.touch_updated_at();

drop trigger if exists trg_developer_profiles_updated_at on public.developer_profiles;
create trigger trg_developer_profiles_updated_at before update on public.developer_profiles for each row execute function public.touch_updated_at();

drop trigger if exists trg_developer_sale_documents_updated_at on public.developer_sale_documents;
create trigger trg_developer_sale_documents_updated_at before update on public.developer_sale_documents for each row execute function public.touch_updated_at();

drop trigger if exists trg_developer_sale_payments_updated_at on public.developer_sale_payments;
create trigger trg_developer_sale_payments_updated_at before update on public.developer_sale_payments for each row execute function public.touch_updated_at();

drop trigger if exists trg_developer_sales_updated_at on public.developer_sales;
create trigger trg_developer_sales_updated_at before update on public.developer_sales for each row execute function public.touch_updated_at();

drop trigger if exists trg_developer_staff_invites_updated_at on public.developer_staff_invites;
create trigger trg_developer_staff_invites_updated_at before update on public.developer_staff_invites for each row execute function public.touch_updated_at();

drop trigger if exists trg_developer_staff_role_links_updated_at on public.developer_staff_role_links;
create trigger trg_developer_staff_role_links_updated_at before update on public.developer_staff_role_links for each row execute function public.touch_updated_at();

drop trigger if exists trg_notifications_updated_at on public.notifications;
create trigger trg_notifications_updated_at before update on public.notifications for each row execute function public.touch_updated_at();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles for each row execute function public.touch_updated_at();

-- 9. Row Level Security
alter table public.audit_logs enable row level security;;
alter table public.developer_accounts enable row level security;;
alter table public.developer_buyer_purchase_links enable row level security;;
alter table public.developer_buyer_sale_access_tokens enable row level security;;
alter table public.developer_buyers enable row level security;;
alter table public.developer_document_templates enable row level security;;
alter table public.developer_estates enable row level security;;
alter table public.developer_payment_allocations enable row level security;;
alter table public.developer_payment_intents enable row level security;;
alter table public.developer_payment_plans enable row level security;;
alter table public.developer_payment_schedule_items enable row level security;;
alter table public.developer_paystack_accounts enable row level security;;
alter table public.developer_plot_assignments enable row level security;;
alter table public.developer_plot_types enable row level security;;
alter table public.developer_plots enable row level security;;
alter table public.developer_profiles enable row level security;;
alter table public.developer_sale_documents enable row level security;;
alter table public.developer_sale_ledger_entries enable row level security;;
alter table public.developer_sale_payments enable row level security;;
alter table public.developer_sales enable row level security;;
alter table public.developer_staff_invites enable row level security;;
alter table public.developer_staff_permissions enable row level security;;
alter table public.developer_staff_role_links enable row level security;;
alter table public.notifications enable row level security;;
alter table public.profiles enable row level security;;

-- Profiles
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists profiles_service_role_all on public.profiles;
create policy profiles_service_role_all
on public.profiles
for all
to service_role
using (true)
with check (true);

-- Audit logs
drop policy if exists audit_logs_service_role_all on public.audit_logs;
create policy audit_logs_service_role_all
on public.audit_logs
for all
to service_role
using (true)
with check (true);

drop policy if exists audit_logs_actor_select on public.audit_logs;
create policy audit_logs_actor_select
on public.audit_logs
for select
to authenticated
using (actor_profile_id = auth.uid() or landlord_id = auth.uid());

-- Notifications compatibility table
drop policy if exists notifications_service_role_all on public.notifications;
create policy notifications_service_role_all
on public.notifications
for all
to service_role
using (true)
with check (true);

drop policy if exists notifications_profile_select on public.notifications;
create policy notifications_profile_select
on public.notifications
for select
to authenticated
using (landlord_id = auth.uid());

-- Developer accounts
drop policy if exists developer_accounts_member_select on public.developer_accounts;
create policy developer_accounts_member_select
on public.developer_accounts
for select
to authenticated
using (
  owner_profile_id = auth.uid()
  or public.user_has_developer_account(id)
);

drop policy if exists developer_accounts_owner_update on public.developer_accounts;
create policy developer_accounts_owner_update
on public.developer_accounts
for update
to authenticated
using (owner_profile_id = auth.uid())
with check (owner_profile_id = auth.uid());

drop policy if exists developer_accounts_service_role_all on public.developer_accounts;
create policy developer_accounts_service_role_all
on public.developer_accounts
for all
to service_role
using (true)
with check (true);

-- Developer profiles
drop policy if exists developer_profiles_member_select on public.developer_profiles;
create policy developer_profiles_member_select
on public.developer_profiles
for select
to authenticated
using (
  profile_id = auth.uid()
  or public.user_has_developer_account(developer_account_id)
);

drop policy if exists developer_profiles_service_role_all on public.developer_profiles;
create policy developer_profiles_service_role_all
on public.developer_profiles
for all
to service_role
using (true)
with check (true);

-- Developer member policies
drop policy if exists developer_buyer_purchase_links_member_select on public.developer_buyer_purchase_links;
create policy developer_buyer_purchase_links_member_select on public.developer_buyer_purchase_links for select to authenticated using (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_buyer_purchase_links_member_insert on public.developer_buyer_purchase_links;
create policy developer_buyer_purchase_links_member_insert on public.developer_buyer_purchase_links for insert to authenticated with check (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_buyer_purchase_links_member_update on public.developer_buyer_purchase_links;
create policy developer_buyer_purchase_links_member_update on public.developer_buyer_purchase_links for update to authenticated using (public.user_has_developer_account(developer_account_id)) with check (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_buyer_purchase_links_service_role_all on public.developer_buyer_purchase_links;
create policy developer_buyer_purchase_links_service_role_all on public.developer_buyer_purchase_links for all to service_role using (true) with check (true);

drop policy if exists developer_buyer_sale_access_tokens_member_select on public.developer_buyer_sale_access_tokens;
create policy developer_buyer_sale_access_tokens_member_select on public.developer_buyer_sale_access_tokens for select to authenticated using (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_buyer_sale_access_tokens_member_insert on public.developer_buyer_sale_access_tokens;
create policy developer_buyer_sale_access_tokens_member_insert on public.developer_buyer_sale_access_tokens for insert to authenticated with check (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_buyer_sale_access_tokens_member_update on public.developer_buyer_sale_access_tokens;
create policy developer_buyer_sale_access_tokens_member_update on public.developer_buyer_sale_access_tokens for update to authenticated using (public.user_has_developer_account(developer_account_id)) with check (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_buyer_sale_access_tokens_service_role_all on public.developer_buyer_sale_access_tokens;
create policy developer_buyer_sale_access_tokens_service_role_all on public.developer_buyer_sale_access_tokens for all to service_role using (true) with check (true);

drop policy if exists developer_buyers_member_select on public.developer_buyers;
create policy developer_buyers_member_select on public.developer_buyers for select to authenticated using (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_buyers_member_insert on public.developer_buyers;
create policy developer_buyers_member_insert on public.developer_buyers for insert to authenticated with check (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_buyers_member_update on public.developer_buyers;
create policy developer_buyers_member_update on public.developer_buyers for update to authenticated using (public.user_has_developer_account(developer_account_id)) with check (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_buyers_service_role_all on public.developer_buyers;
create policy developer_buyers_service_role_all on public.developer_buyers for all to service_role using (true) with check (true);

drop policy if exists developer_document_templates_member_select on public.developer_document_templates;
create policy developer_document_templates_member_select on public.developer_document_templates for select to authenticated using (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_document_templates_member_insert on public.developer_document_templates;
create policy developer_document_templates_member_insert on public.developer_document_templates for insert to authenticated with check (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_document_templates_member_update on public.developer_document_templates;
create policy developer_document_templates_member_update on public.developer_document_templates for update to authenticated using (public.user_has_developer_account(developer_account_id)) with check (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_document_templates_service_role_all on public.developer_document_templates;
create policy developer_document_templates_service_role_all on public.developer_document_templates for all to service_role using (true) with check (true);

drop policy if exists developer_estates_member_select on public.developer_estates;
create policy developer_estates_member_select on public.developer_estates for select to authenticated using (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_estates_member_insert on public.developer_estates;
create policy developer_estates_member_insert on public.developer_estates for insert to authenticated with check (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_estates_member_update on public.developer_estates;
create policy developer_estates_member_update on public.developer_estates for update to authenticated using (public.user_has_developer_account(developer_account_id)) with check (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_estates_service_role_all on public.developer_estates;
create policy developer_estates_service_role_all on public.developer_estates for all to service_role using (true) with check (true);

drop policy if exists developer_payment_allocations_member_select on public.developer_payment_allocations;
create policy developer_payment_allocations_member_select on public.developer_payment_allocations for select to authenticated using (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_payment_allocations_member_insert on public.developer_payment_allocations;
create policy developer_payment_allocations_member_insert on public.developer_payment_allocations for insert to authenticated with check (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_payment_allocations_member_update on public.developer_payment_allocations;
create policy developer_payment_allocations_member_update on public.developer_payment_allocations for update to authenticated using (public.user_has_developer_account(developer_account_id)) with check (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_payment_allocations_service_role_all on public.developer_payment_allocations;
create policy developer_payment_allocations_service_role_all on public.developer_payment_allocations for all to service_role using (true) with check (true);

drop policy if exists developer_payment_intents_member_select on public.developer_payment_intents;
create policy developer_payment_intents_member_select on public.developer_payment_intents for select to authenticated using (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_payment_intents_member_insert on public.developer_payment_intents;
create policy developer_payment_intents_member_insert on public.developer_payment_intents for insert to authenticated with check (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_payment_intents_member_update on public.developer_payment_intents;
create policy developer_payment_intents_member_update on public.developer_payment_intents for update to authenticated using (public.user_has_developer_account(developer_account_id)) with check (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_payment_intents_service_role_all on public.developer_payment_intents;
create policy developer_payment_intents_service_role_all on public.developer_payment_intents for all to service_role using (true) with check (true);

drop policy if exists developer_payment_plans_member_select on public.developer_payment_plans;
create policy developer_payment_plans_member_select on public.developer_payment_plans for select to authenticated using (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_payment_plans_member_insert on public.developer_payment_plans;
create policy developer_payment_plans_member_insert on public.developer_payment_plans for insert to authenticated with check (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_payment_plans_member_update on public.developer_payment_plans;
create policy developer_payment_plans_member_update on public.developer_payment_plans for update to authenticated using (public.user_has_developer_account(developer_account_id)) with check (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_payment_plans_service_role_all on public.developer_payment_plans;
create policy developer_payment_plans_service_role_all on public.developer_payment_plans for all to service_role using (true) with check (true);

drop policy if exists developer_payment_schedule_items_member_select on public.developer_payment_schedule_items;
create policy developer_payment_schedule_items_member_select on public.developer_payment_schedule_items for select to authenticated using (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_payment_schedule_items_member_insert on public.developer_payment_schedule_items;
create policy developer_payment_schedule_items_member_insert on public.developer_payment_schedule_items for insert to authenticated with check (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_payment_schedule_items_member_update on public.developer_payment_schedule_items;
create policy developer_payment_schedule_items_member_update on public.developer_payment_schedule_items for update to authenticated using (public.user_has_developer_account(developer_account_id)) with check (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_payment_schedule_items_service_role_all on public.developer_payment_schedule_items;
create policy developer_payment_schedule_items_service_role_all on public.developer_payment_schedule_items for all to service_role using (true) with check (true);

drop policy if exists developer_paystack_accounts_member_select on public.developer_paystack_accounts;
create policy developer_paystack_accounts_member_select on public.developer_paystack_accounts for select to authenticated using (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_paystack_accounts_member_insert on public.developer_paystack_accounts;
create policy developer_paystack_accounts_member_insert on public.developer_paystack_accounts for insert to authenticated with check (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_paystack_accounts_member_update on public.developer_paystack_accounts;
create policy developer_paystack_accounts_member_update on public.developer_paystack_accounts for update to authenticated using (public.user_has_developer_account(developer_account_id)) with check (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_paystack_accounts_service_role_all on public.developer_paystack_accounts;
create policy developer_paystack_accounts_service_role_all on public.developer_paystack_accounts for all to service_role using (true) with check (true);

drop policy if exists developer_plot_assignments_member_select on public.developer_plot_assignments;
create policy developer_plot_assignments_member_select on public.developer_plot_assignments for select to authenticated using (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_plot_assignments_member_insert on public.developer_plot_assignments;
create policy developer_plot_assignments_member_insert on public.developer_plot_assignments for insert to authenticated with check (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_plot_assignments_member_update on public.developer_plot_assignments;
create policy developer_plot_assignments_member_update on public.developer_plot_assignments for update to authenticated using (public.user_has_developer_account(developer_account_id)) with check (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_plot_assignments_service_role_all on public.developer_plot_assignments;
create policy developer_plot_assignments_service_role_all on public.developer_plot_assignments for all to service_role using (true) with check (true);

drop policy if exists developer_plot_types_member_select on public.developer_plot_types;
create policy developer_plot_types_member_select on public.developer_plot_types for select to authenticated using (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_plot_types_member_insert on public.developer_plot_types;
create policy developer_plot_types_member_insert on public.developer_plot_types for insert to authenticated with check (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_plot_types_member_update on public.developer_plot_types;
create policy developer_plot_types_member_update on public.developer_plot_types for update to authenticated using (public.user_has_developer_account(developer_account_id)) with check (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_plot_types_service_role_all on public.developer_plot_types;
create policy developer_plot_types_service_role_all on public.developer_plot_types for all to service_role using (true) with check (true);

drop policy if exists developer_plots_member_select on public.developer_plots;
create policy developer_plots_member_select on public.developer_plots for select to authenticated using (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_plots_member_insert on public.developer_plots;
create policy developer_plots_member_insert on public.developer_plots for insert to authenticated with check (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_plots_member_update on public.developer_plots;
create policy developer_plots_member_update on public.developer_plots for update to authenticated using (public.user_has_developer_account(developer_account_id)) with check (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_plots_service_role_all on public.developer_plots;
create policy developer_plots_service_role_all on public.developer_plots for all to service_role using (true) with check (true);

drop policy if exists developer_sale_documents_member_select on public.developer_sale_documents;
create policy developer_sale_documents_member_select on public.developer_sale_documents for select to authenticated using (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_sale_documents_member_insert on public.developer_sale_documents;
create policy developer_sale_documents_member_insert on public.developer_sale_documents for insert to authenticated with check (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_sale_documents_member_update on public.developer_sale_documents;
create policy developer_sale_documents_member_update on public.developer_sale_documents for update to authenticated using (public.user_has_developer_account(developer_account_id)) with check (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_sale_documents_service_role_all on public.developer_sale_documents;
create policy developer_sale_documents_service_role_all on public.developer_sale_documents for all to service_role using (true) with check (true);

drop policy if exists developer_sale_ledger_entries_member_select on public.developer_sale_ledger_entries;
create policy developer_sale_ledger_entries_member_select on public.developer_sale_ledger_entries for select to authenticated using (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_sale_ledger_entries_member_insert on public.developer_sale_ledger_entries;
create policy developer_sale_ledger_entries_member_insert on public.developer_sale_ledger_entries for insert to authenticated with check (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_sale_ledger_entries_member_update on public.developer_sale_ledger_entries;
create policy developer_sale_ledger_entries_member_update on public.developer_sale_ledger_entries for update to authenticated using (public.user_has_developer_account(developer_account_id)) with check (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_sale_ledger_entries_service_role_all on public.developer_sale_ledger_entries;
create policy developer_sale_ledger_entries_service_role_all on public.developer_sale_ledger_entries for all to service_role using (true) with check (true);

drop policy if exists developer_sale_payments_member_select on public.developer_sale_payments;
create policy developer_sale_payments_member_select on public.developer_sale_payments for select to authenticated using (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_sale_payments_member_insert on public.developer_sale_payments;
create policy developer_sale_payments_member_insert on public.developer_sale_payments for insert to authenticated with check (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_sale_payments_member_update on public.developer_sale_payments;
create policy developer_sale_payments_member_update on public.developer_sale_payments for update to authenticated using (public.user_has_developer_account(developer_account_id)) with check (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_sale_payments_service_role_all on public.developer_sale_payments;
create policy developer_sale_payments_service_role_all on public.developer_sale_payments for all to service_role using (true) with check (true);

drop policy if exists developer_sales_member_select on public.developer_sales;
create policy developer_sales_member_select on public.developer_sales for select to authenticated using (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_sales_member_insert on public.developer_sales;
create policy developer_sales_member_insert on public.developer_sales for insert to authenticated with check (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_sales_member_update on public.developer_sales;
create policy developer_sales_member_update on public.developer_sales for update to authenticated using (public.user_has_developer_account(developer_account_id)) with check (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_sales_service_role_all on public.developer_sales;
create policy developer_sales_service_role_all on public.developer_sales for all to service_role using (true) with check (true);

drop policy if exists developer_staff_invites_member_select on public.developer_staff_invites;
create policy developer_staff_invites_member_select on public.developer_staff_invites for select to authenticated using (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_staff_invites_member_insert on public.developer_staff_invites;
create policy developer_staff_invites_member_insert on public.developer_staff_invites for insert to authenticated with check (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_staff_invites_member_update on public.developer_staff_invites;
create policy developer_staff_invites_member_update on public.developer_staff_invites for update to authenticated using (public.user_has_developer_account(developer_account_id)) with check (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_staff_invites_service_role_all on public.developer_staff_invites;
create policy developer_staff_invites_service_role_all on public.developer_staff_invites for all to service_role using (true) with check (true);

drop policy if exists developer_staff_permissions_member_select on public.developer_staff_permissions;
create policy developer_staff_permissions_member_select on public.developer_staff_permissions for select to authenticated using (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_staff_permissions_member_insert on public.developer_staff_permissions;
create policy developer_staff_permissions_member_insert on public.developer_staff_permissions for insert to authenticated with check (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_staff_permissions_member_update on public.developer_staff_permissions;
create policy developer_staff_permissions_member_update on public.developer_staff_permissions for update to authenticated using (public.user_has_developer_account(developer_account_id)) with check (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_staff_permissions_service_role_all on public.developer_staff_permissions;
create policy developer_staff_permissions_service_role_all on public.developer_staff_permissions for all to service_role using (true) with check (true);

drop policy if exists developer_staff_role_links_member_select on public.developer_staff_role_links;
create policy developer_staff_role_links_member_select on public.developer_staff_role_links for select to authenticated using (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_staff_role_links_member_insert on public.developer_staff_role_links;
create policy developer_staff_role_links_member_insert on public.developer_staff_role_links for insert to authenticated with check (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_staff_role_links_member_update on public.developer_staff_role_links;
create policy developer_staff_role_links_member_update on public.developer_staff_role_links for update to authenticated using (public.user_has_developer_account(developer_account_id)) with check (public.user_has_developer_account(developer_account_id));
drop policy if exists developer_staff_role_links_service_role_all on public.developer_staff_role_links;
create policy developer_staff_role_links_service_role_all on public.developer_staff_role_links for all to service_role using (true) with check (true);

-- 10. Grants
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on function public.get_public_developer_buyer_purchase_link_by_hash(text) to anon, authenticated, service_role;
grant execute on function public.create_public_buyer_purchase_sale_from_link(uuid, text, text, text, text, text, text, text) to anon, authenticated, service_role;
grant execute on function public.create_developer_buyer_purchase_link(uuid, uuid, uuid, text, text, text, text, text, numeric, numeric, text, uuid, timestamp with time zone) to authenticated, service_role;
grant execute on function public.create_developer_plot_assignment(uuid, uuid, uuid, uuid, text) to authenticated, service_role;
grant execute on function public.create_developer_sale_from_assignment(uuid, uuid, developer_payment_plan_mode, numeric, numeric, date, date, text) to authenticated, service_role;
grant execute on function public.create_developer_payment_plan(uuid, uuid, developer_payment_plan_mode, date, text, jsonb) to authenticated, service_role;
grant execute on function public.post_developer_verified_payment(uuid, text, numeric, timestamp with time zone) to authenticated, service_role;

-- 11. Storage buckets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'developer-payment-receipts',
  'developer-payment-receipts',
  false,
  10485760,
  array['application/pdf']::text[]
)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'developer-sale-documents',
  'developer-sale-documents',
  false,
  15728640,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists piedras_developer_storage_service_role_all on storage.objects;
create policy piedras_developer_storage_service_role_all
on storage.objects
for all
to service_role
using (bucket_id in ('developer-payment-receipts', 'developer-sale-documents'))
with check (bucket_id in ('developer-payment-receipts', 'developer-sale-documents'));

commit;

-- Validation
select table_name from information_schema.tables where table_schema = 'public' and (table_name like 'developer_%' or table_name in ('profiles','audit_logs','notifications')) order by table_name;
select id, name, public, file_size_limit, allowed_mime_types from storage.buckets where id in ('developer-payment-receipts', 'developer-sale-documents') order by id;