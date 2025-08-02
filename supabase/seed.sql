-- 建立預設管理員帳號
-- 這個腳本會在 Supabase 啟動時自動執行

-- 生成固定 UUID 給管理員
DO $$
DECLARE
    admin_user_id uuid := '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
BEGIN
    -- 插入預設管理員用戶到 auth.users 表格
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        admin_user_id,
        'authenticated',
        'authenticated',
        'admin@591crawler.com',
        crypt(COALESCE(nullif(current_setting('app.admin_password', true), ''), 'CHANGE_ME_IN_PRODUCTION'), gen_salt('bf')),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{}',
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    ) ON CONFLICT DO NOTHING;
    
    -- 插入對應的身份記錄到 auth.identities 表格
    INSERT INTO auth.identities (
        provider_id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at,
        id
    ) VALUES (
        'admin@591crawler.com',
        admin_user_id,
        format('{"sub": "%s", "email": "%s"}', admin_user_id::text, 'admin@591crawler.com')::jsonb,
        'email',
        NOW(),
        NOW(),
        NOW(),
        gen_random_uuid()
    ) ON CONFLICT DO NOTHING;
END $$;