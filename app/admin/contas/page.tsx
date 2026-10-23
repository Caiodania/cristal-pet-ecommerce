import { AdminGate } from "@/components/admin/AdminGate";
import { Contas } from "@/components/admin/Contas";

// Contas dos clientes (painel do dono). A proteção de verdade está no servidor.
export default function AdminContasPage() {
  return (
    <AdminGate>
      <Contas />
    </AdminGate>
  );
}
