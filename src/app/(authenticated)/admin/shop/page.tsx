import { getAllMarketplaceItems, getAllPurchases, getPendingPurchases } from "@/app/actions/marketplace";
import { getPointsLedger } from "@/app/actions/points";
import { ShopAdminClient } from "./shop-admin-client";

export const dynamic = "force-dynamic";

export default async function AdminShopPage() {
  const [pending, history, items, ledger] = await Promise.all([
    getPendingPurchases(),
    getAllPurchases(),
    getAllMarketplaceItems(),
    getPointsLedger(),
  ]);

  return <ShopAdminClient pending={pending} history={history} items={items} ledger={ledger} />;
}
