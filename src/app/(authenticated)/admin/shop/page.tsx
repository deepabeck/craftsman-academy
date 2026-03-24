import { getAllPurchases, getPendingPurchases } from "@/app/actions/marketplace";
import { ShopAdminClient } from "./shop-admin-client";

export default async function AdminShopPage() {
  const [pending, history] = await Promise.all([getPendingPurchases(), getAllPurchases()]);

  return <ShopAdminClient pending={pending} history={history} />;
}
