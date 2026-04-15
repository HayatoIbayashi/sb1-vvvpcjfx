-- 単一の月額メンバーシップ構成へ寄せるための更新例
-- 1. 既存の有効プランをメンバーシップとして扱う
-- 2. 料金を 1000 円へ統一する
-- 3. ほかのプランは無効化する
--
-- 注意:
--   stripe_price_id は Stripe 側で作成済みの 1000 円/月 Price に差し替える。
--   このリポジトリで確認した実値は `price_1TMJ8AKxyMynMg1MEfNTNBgV`。
BEGIN;

UPDATE subscription_plans
SET
  name = 'メンバーシップ',
  description = '全作品が見放題',
  price_monthly = 1000,
  stripe_price_id = 'price_1TMJ8AKxyMynMg1MEfNTNBgV',
  updated_at = now()
WHERE id = 'ab5f5f03-001b-4834-8c5c-abc715d98a4d';

UPDATE subscription_plans
SET
  is_active = FALSE,
  updated_at = now()
WHERE id <> 'ab5f5f03-001b-4834-8c5c-abc715d98a4d';

COMMIT;
