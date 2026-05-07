ALTER TYPE public.notification_type
    ADD VALUE IF NOT EXISTS 'cloud_migration_completed';

ALTER TYPE public.notification_type
    ADD VALUE IF NOT EXISTS 'cloud_migration_failed';
