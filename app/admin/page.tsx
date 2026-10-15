import { AdminGate } from "@/components/admin/AdminGate";
import { Dashboard } from "@/components/admin/Dashboard";

// Painel do dono. Sem ele logado, só aparece o login; a proteção de verdade
// está no servidor (cada rota /api/admin exige o cookie de sessão).
export default function AdminPage() {
  return (
    <AdminGate>
      <Dashboard />
    </AdminGate>
  );
}
