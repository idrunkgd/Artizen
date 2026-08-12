"use client";
import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send, Check, X, Hammer, Loader2 } from "lucide-react";
import { setQuoteStatus, listProjectsAtAddress } from "@/server/actions/quotes";

type ExistingProject = { id: string; reference: string; name: string; status: string };

export function StatusActions({
  quoteId,
  currentStatus,
  customerAddressId,
  quoteTitle
}: {
  quoteId: string;
  currentStatus: string;
  /// Adresse de chantier du devis. Indispensable pour proposer le bon
  /// choix « nouveau chantier vs chantier existant à cette adresse ».
  customerAddressId: string | null;
  quoteTitle: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [showAcceptModal, setShowAcceptModal] = useState(false);

  function plainChange(newStatus: any, msg: string) {
    start(async () => {
      try { await setQuoteStatus(quoteId, newStatus); toast.success(msg); }
      catch (e: any) { toast.error(e?.message ?? "Erreur"); }
    });
  }

  function acceptDevis() {
    if (!customerAddressId) {
      toast.error("Renseigne d'abord l'adresse de chantier sur le devis");
      return;
    }
    setShowAcceptModal(true);
  }

  if (currentStatus === "DRAFT") {
    return <button onClick={() => plainChange("SENT", "Marqué envoyé")} disabled={pending} className="btn-gold"><Send className="w-5 h-5" /> Marquer envoyé</button>;
  }
  if (currentStatus === "SENT") {
    return (
      <>
        <button onClick={acceptDevis} disabled={pending} className="btn bg-success text-white">
          <Check className="w-5 h-5" /> Accepté par le client
        </button>
        <button onClick={() => plainChange("REFUSED", "Devis refusé")} disabled={pending} className="btn bg-white text-danger border-2 border-danger">
          <X className="w-5 h-5" /> Refusé
        </button>
        {showAcceptModal && customerAddressId && (
          <AcceptModal
            quoteId={quoteId}
            quoteTitle={quoteTitle}
            customerAddressId={customerAddressId}
            onClose={() => setShowAcceptModal(false)}
            onDone={(projectId) => {
              setShowAcceptModal(false);
              toast.success("Devis accepté 🎉");
              router.push(`/chantiers/${projectId}`);
            }}
          />
        )}
      </>
    );
  }
  return null;
}

function AcceptModal({
  quoteId, quoteTitle, customerAddressId, onClose, onDone
}: {
  quoteId: string;
  quoteTitle: string;
  customerAddressId: string;
  onClose: () => void;
  onDone: (projectId: string) => void;
}) {
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"NEW" | "EXISTING">("NEW");
  const [existingProjectId, setExistingProjectId] = useState("");
  const [existing, setExisting] = useState<ExistingProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listProjectsAtAddress(customerAddressId)
      .then((list) => {
        setExisting(list as ExistingProject[]);
        // Si déjà un chantier à cette adresse, on suggère mode EXISTING par défaut
        if (list.length > 0) {
          setMode("EXISTING");
          setExistingProjectId(list[0].id);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [customerAddressId]);

  function confirm() {
    start(async () => {
      try {
        const opts = mode === "EXISTING" && existingProjectId
          ? { mode: "EXISTING" as const, existingProjectId }
          : { mode: "NEW" as const };
        const r = await setQuoteStatus(quoteId, "ACCEPTED", opts);
        const targetId = (r as any).newProjectId ?? (r as any).linkedProjectId;
        if (!targetId) throw new Error("Aucun chantier créé/associé");
        onDone(targetId);
      } catch (e: any) { toast.error(e?.message ?? "Erreur"); }
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-lift p-6 w-full max-w-md my-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg">🎉 Devis accepté !</h2>
          <button onClick={onClose} className="p-1 text-ink-300 hover:text-ink"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-ink-300 mb-4">
          Choisis comment rattacher ce devis à un chantier.
        </p>

        {loading ? (
          <div className="text-center py-6 text-ink-300"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
        ) : (
          <div className="space-y-3">
            {/* Option 1 : Nouveau chantier */}
            <button
              type="button"
              onClick={() => setMode("NEW")}
              className={"w-full text-left p-4 rounded-xl border-2 transition-colors " +
                (mode === "NEW" ? "border-gold bg-gold/10" : "border-cream-300 bg-white hover:bg-cream-100")}
            >
              <div className="flex items-start gap-3">
                <div className={"w-5 h-5 rounded-full border-2 mt-0.5 shrink-0 " +
                  (mode === "NEW" ? "border-gold bg-gold" : "border-ink-300")}>
                  {mode === "NEW" && <div className="w-2 h-2 rounded-full bg-white m-auto mt-1" />}
                </div>
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    <Hammer className="w-4 h-4 text-gold" />
                    Créer un nouveau chantier
                  </div>
                  <p className="text-sm text-ink-300 mt-1">
                    Nom : <strong>« {quoteTitle} »</strong>. Statut : Actif. Tu pourras renommer après.
                  </p>
                </div>
              </div>
            </button>

            {/* Option 2 : Chantier existant */}
            {existing.length > 0 && (
              <button
                type="button"
                onClick={() => setMode("EXISTING")}
                className={"w-full text-left p-4 rounded-xl border-2 transition-colors " +
                  (mode === "EXISTING" ? "border-gold bg-gold/10" : "border-cream-300 bg-white hover:bg-cream-100")}
              >
                <div className="flex items-start gap-3">
                  <div className={"w-5 h-5 rounded-full border-2 mt-0.5 shrink-0 " +
                    (mode === "EXISTING" ? "border-gold bg-gold" : "border-ink-300")}>
                    {mode === "EXISTING" && <div className="w-2 h-2 rounded-full bg-white m-auto mt-1" />}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">Ajouter à un chantier existant à cette adresse</div>
                    <p className="text-sm text-ink-300 mt-1 mb-2">
                      Utile pour un avenant ou un lot supplémentaire.
                    </p>
                    {mode === "EXISTING" && (
                      <select value={existingProjectId}
                              onChange={(e) => setExistingProjectId(e.target.value)}
                              className="input"
                              onClick={(e) => e.stopPropagation()}>
                        {existing.map((p) => (
                          <option key={p.id} value={p.id}>{p.reference} — {p.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </button>
            )}

            {existing.length === 0 && (
              <p className="text-xs text-ink-300 px-2">
                💡 Aucun chantier ouvert à cette adresse. Un nouveau sera créé.
              </p>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-4 mt-4 border-t border-cream-300">
          <button onClick={onClose} className="btn-ghost flex-1" disabled={pending}>Annuler</button>
          <button onClick={confirm} disabled={pending || loading} className="btn-gold flex-1">
            {pending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
            Valider
          </button>
        </div>
      </div>
    </div>
  );
}
