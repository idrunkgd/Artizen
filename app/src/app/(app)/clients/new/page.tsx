import { CustomerForm } from "../customer-form";

export default function NewClientPage() {
  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Nouveau client</h1>
      <CustomerForm />
    </div>
  );
}
