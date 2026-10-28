import { getAdminExtraCredsTasks, getExtraClaimHistory, getPendingExtraClaims } from "@/app/actions/extra-creds";
import { getAllMarketplaceItems, getAllPurchases, getPendingPurchases } from "@/app/actions/marketplace";
import { getPointsLedger } from "@/app/actions/points";
import { ShopAdminClient } from "./shop-admin-client";

export const dynamic = "force-dynamic";

export default async function AdminShopPage() {
  const [pending, history, items, ledger, extraTasks, extraPending, extraHistory] = await Promise.all([
    getPendingPurchases(),
    getAllPurchases(),
    getAllMarketplaceItems(),
    getPointsLedger(),
    getAdminExtraCredsTasks(),
    getPendingExtraClaims(),
    getExtraClaimHistory(),
  ]);

  return (
    <ShopAdminClient
      pending={pending}
      history={history}
      items={items}
      ledger={ledger}
      extraTasks={extraTasks}
      extraPending={extraPending}
      extraHistory={extraHistory}
    />
  );
}
