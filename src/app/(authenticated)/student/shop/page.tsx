import { createClient } from "@/lib/supabase/server";
import { getMarketplaceItems, getMyWeeklyPurchases, getSharedItemContributions } from "@/app/actions/marketplace";
import { ShopClient } from "./shop-client";

export default async function ShopPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [items, weeklyPurchases, sharedContributions] = await Promise.all([
    getMarketplaceItems(),
    getMyWeeklyPurchases(),
    getSharedItemContributions(),
  ]);

  return (
    <ShopClient
      items={items}
      weeklyPurchases={weeklyPurchases}
      sharedContributions={sharedContributions}
      currentStudentId={user?.id ?? ""}
    />
  );
}
