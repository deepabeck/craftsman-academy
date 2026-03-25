import { getAllMarketplaceItems, getAllPurchases, getPendingPurchases } from "@/app/actions/marketplace";
import { ShopAdminClient } from "./shop-admin-client";

export const dynamic = "force-dynamic";

export default async function AdminShopPage() {
  const [pending, history, items] = await Promise.all([
    getPendingPurchases(),
    getAllPurchases(),
    getAllMarketplaceItems(),
  ]);

  return <ShopAdminClient pending={pending} history={history} items={items} />;
}
