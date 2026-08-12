import { SupplierForm } from "../supplier-form";
export default function Page() {
  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Nouveau fournisseur</h1>
      <SupplierForm />
    </div>
  );
}
