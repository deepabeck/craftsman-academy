import { getMarketplaceItems, getMyWeeklyPurchases } from "@/app/actions/marketplace";
import { ShopClient } from "./shop-client";

export default async function ShopPage() {
  const [items, weeklyPurchases] = await Promise.all([getMarketplaceItems(), getMyWeeklyPurchases()]);

  return <ShopClient items={items} weeklyPurchases={weeklyPurchases} />;
}
