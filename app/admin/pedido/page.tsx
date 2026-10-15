import { Suspense } from "react";
import { AdminGate } from "@/components/admin/AdminGate";
import { OrderDetail } from "@/components/admin/OrderDetail";
import { Loading } from "@/components/ui/Status";

// O id do pedido vem da query string (?id=…): no export estático não dá para
// gerar uma página por pedido.
export default function AdminPedidoPage() {
  return (
    <AdminGate>
      <Suspense fallback={<Loading>Carregando…</Loading>}>
        <OrderDetail />
      </Suspense>
    </AdminGate>
  );
}
