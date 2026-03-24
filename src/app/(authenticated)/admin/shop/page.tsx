import { getAllMarketplaceItems, getAllPurchases, getPendingPurchases } from "@/app/actions/marketplace";
import { ShopAdminClient } from "./shop-admin-client";

export default async function AdminShopPage() {
  const [pending, history, items] = await Promise.all([
    getPendingPurchases(),
    getAllPurchases(),
    getAllMarketplaceItems(),
  ]);

  return <ShopAdminClient pending={pending} history={history} items={items} />;
}
