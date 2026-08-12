"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";
import { uploadSitePhoto } from "@/server/actions/photos";

export function PhotoUploader({ projectId }: { projectId: string }) {
  const [pending, start] = useTransition();
  const [caption, setCaption] = useState("");

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Fichier image uniquement");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      start(async () => {
        try {
          await uploadSitePhoto({
            projectId,
            caption: caption || null,
            dataUri: reader.result as string
          });
          toast.success("Photo ajoutée");
          setCaption("");
          (e.target as HTMLInputElement).value = "";
        } catch (err: any) {
          toast.error(err?.message ?? "Erreur upload");
        }
      });
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="card p-3 space-y-2">
      <input
        type="text"
        placeholder="Légende (optionnel) — ex. « avant démolition »"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        className="input"
        disabled={pending}
      />
      <label className={"btn-gold w-full cursor-pointer " + (pending ? "opacity-60 pointer-events-none" : "")}>
        {pending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
        {pending ? "Envoi en cours…" : "Prendre / ajouter une photo"}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onFile}
          disabled={pending}
          className="hidden"
        />
      </label>
    </div>
  );
}
