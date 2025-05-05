import { Typography } from "@/components/ui/typography";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { useState, useEffect } from "react";
import type { Request } from "@/app/types";
import { REQUEST_STATUS_LABELS } from "@/app/constants";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";
import { toast } from "sonner";

interface RequestDetailDialogProps {
  request: Request | null;
  isOpen: boolean;
  onClose: () => void;
}

export function RequestDetailDialog({
  request,
  isOpen,
  onClose,
}: RequestDetailDialogProps) {
  const [merchantNote, setMerchantNote] = useState("");
  const [status, setStatus] = useState("");
  const [pauseStartDate, setPauseStartDate] = useState("");
  const [pauseEndDate, setPauseEndDate] = useState("");

  const utils = api.useUtils();

  const updateRequest = api.request.update.useMutation({
    onSuccess: () => {
      toast.success("Žádost byla úspěšně aktualizována");
      // Invalidate all requests queries
      void utils.request.invalidate();
      onClose();
    },
    onError: (error) => {
      toast.error(`Chyba při aktualizaci: ${error.message}`);
    },
  });

  const handleUpdate = () => {
    if (!request) return;

    updateRequest.mutate({
      id: request.id,
      status: status as "PENDING" | "APPROVED" | "REJECTED",
      merchant_note: merchantNote,
      pause_start_date: pauseStartDate ? new Date(pauseStartDate) : undefined,
      pause_end_date: pauseEndDate ? new Date(pauseEndDate) : undefined,
    });
  };

  // Initialize form when request changes
  useEffect(() => {
    if (request) {
      setMerchantNote(request.merchant_note ?? "");
      setStatus(request.status);
      setPauseStartDate(
        request.pause_start_date
          ? format(new Date(request.pause_start_date), "yyyy-MM-dd")
          : "",
      );
      setPauseEndDate(
        request.pause_end_date
          ? format(new Date(request.pause_end_date), "yyyy-MM-dd")
          : "",
      );
    }
  }, [request]);

  if (!request) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detail žádosti</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Typography variant="smallText" className="font-medium">
                Objednávka
              </Typography>
              <Typography>
                {request.order_name} ({request.order_id})
              </Typography>
            </div>
            <div>
              <Typography variant="smallText" className="font-medium">
                Email
              </Typography>
              <Typography>{request.order_email}</Typography>
            </div>
            <div>
              <Typography variant="smallText" className="font-medium">
                Program
              </Typography>
              <Typography>{request.item_title}</Typography>
            </div>
            <div>
              <Typography variant="smallText" className="font-medium">
                Status
              </Typography>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-md border p-2"
              >
                {Object.entries(REQUEST_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Typography variant="smallText" className="font-medium">
                Původní termín
              </Typography>
              <Typography>
                {format(new Date(request.original_start_date), "d.M.yyyy", {
                  locale: cs,
                })}
                {" - "}
                {format(new Date(request.original_end_date), "d.M.yyyy", {
                  locale: cs,
                })}
              </Typography>
            </div>

            <div>
              <Typography variant="smallText" className="font-medium">
                Pauza
              </Typography>
              <div className="mt-2 grid grid-cols-2 gap-4">
                <div>
                  <Typography
                    variant="smallText"
                    className="text-muted-foreground"
                  >
                    Od
                  </Typography>
                  <Input
                    type="date"
                    value={pauseStartDate}
                    onChange={(e) => setPauseStartDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Typography
                    variant="smallText"
                    className="text-muted-foreground"
                  >
                    Do
                  </Typography>
                  <Input
                    type="date"
                    value={pauseEndDate}
                    onChange={(e) => setPauseEndDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            <div>
              <Typography variant="smallText" className="font-medium">
                Nový termín
              </Typography>
              <Typography>
                {format(new Date(request.new_start_date), "d.M.yyyy", {
                  locale: cs,
                })}
                {" - "}
                {format(new Date(request.new_end_date), "d.M.yyyy", {
                  locale: cs,
                })}
              </Typography>
            </div>
          </div>

          <div>
            <Typography variant="smallText" className="font-medium">
              Poznámka zákazníka
            </Typography>
            <Typography className="text-muted-foreground">
              {request.user_note ?? "Žádná poznámka"}
            </Typography>
          </div>

          <div>
            <Typography variant="smallText" className="font-medium">
              Poznámka obchodníka
            </Typography>
            <Textarea
              value={merchantNote}
              onChange={(e) => setMerchantNote(e.target.value)}
              placeholder="Zadejte poznámku..."
              className="mt-1"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Zrušit
            </Button>
            <Button onClick={handleUpdate}>Uložit změny</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
