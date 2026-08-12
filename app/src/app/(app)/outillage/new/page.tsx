import { ToolForm } from "../tool-form";
export default function Page() {
  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Nouvel outil</h1>
      <div className="card p-5"><ToolForm /></div>
    </div>
  );
}
