"use client";
import { Typography } from "@/components/ui/typography";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { useState } from "react";
import type { Request } from "@/app/types";
import { REQUEST_STATUS_LABELS } from "@/app/constants";
import { RequestDetailDialog } from "./request-detail-dialog";
import { Pencil, ArrowUpRight } from "lucide-react";

interface RequestListProps {
  requests: Request[];
}

const ITEMS_PER_PAGE = 10;

export function RequestList({ requests }: RequestListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filteredRequests = requests.filter((request) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      request.order_name.toLowerCase().includes(searchLower) ||
      request.order_email.toLowerCase().includes(searchLower) ||
      request.item_title.toLowerCase().includes(searchLower) ||
      request.status.toLowerCase().includes(searchLower)
    );
  });

  const totalPages = Math.ceil(filteredRequests.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentRequests = filteredRequests.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRequestClick = (request: Request) => {
    setSelectedRequest(request);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedRequest(null);
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <Input
          type="search"
          placeholder="Hledat podle objednávky nebo e-mailu..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="rounded-md border">
        <div className="bg-muted/50 grid grid-cols-12 gap-4 border-b p-4">
          <div className="col-span-1">
            <Typography variant="smallText" className="font-medium">
              Objednávka
            </Typography>
          </div>
          <div className="col-span-2">
            <Typography variant="smallText" className="font-medium">
              Email
            </Typography>
          </div>
          <div className="col-span-1">
            <Typography variant="smallText" className="font-medium">
              Program
            </Typography>
          </div>
          <div className="col-span-1">
            <Typography variant="smallText" className="font-medium">
              Status
            </Typography>
          </div>
          <div className="col-span-2">
            <Typography variant="smallText" className="font-medium">
              Původní termín
            </Typography>
          </div>
          <div className="col-span-2">
            <Typography variant="smallText" className="font-medium">
              Pauza
            </Typography>
          </div>
          <div className="col-span-2">
            <Typography variant="smallText" className="font-medium">
              Nový termín
            </Typography>
          </div>
          <div className="col-span-1">
            <Typography variant="smallText" className="font-medium">
              Akce
            </Typography>
          </div>
        </div>

        <div className="divide-y">
          {currentRequests.map((request) => (
            <div
              key={request.id}
              className="hover:bg-muted/50 grid grid-cols-12 gap-4 p-4"
            >
              <div className="col-span-1">
                <a
                  href={`https://admin.shopify.com/store/yes-krabicky/orders/${request.order_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:underline"
                >
                  <Typography>
                    {request.order_name}
                    <ArrowUpRight className="ml-1 inline-block h-4 w-4" />
                  </Typography>
                </a>
              </div>
              <div className="col-span-2">
                <Typography>{request.order_email}</Typography>
              </div>
              <div className="col-span-1">
                <Typography itemID={request.item_id}>
                  {request.item_title}
                </Typography>
              </div>
              <div className="col-span-1">
                <Typography
                  className={
                    request.status === "APPROVED"
                      ? "text-green-600"
                      : request.status === "REJECTED"
                        ? "text-red-600"
                        : ""
                  }
                >
                  {REQUEST_STATUS_LABELS[request.status]}
                </Typography>
              </div>
              <div className="col-span-2">
                <Typography variant="smallText">
                  {format(new Date(request.original_start_date), "d.M.yyyy", {
                    locale: cs,
                  })}
                  {" - "}
                  {format(new Date(request.original_end_date), "d.M.yyyy", {
                    locale: cs,
                  })}
                </Typography>
              </div>
              <div className="col-span-2">
                <Typography variant="smallText">
                  {format(new Date(request.pause_start_date), "d.M.yyyy", {
                    locale: cs,
                  })}
                  {" - "}
                  {format(new Date(request.pause_end_date), "d.M.yyyy", {
                    locale: cs,
                  })}
                </Typography>
              </div>
              <div className="col-span-2">
                <Typography variant="smallText">
                  {format(new Date(request.new_start_date), "d.M.yyyy", {
                    locale: cs,
                  })}
                  {" - "}
                  {format(new Date(request.new_end_date), "d.M.yyyy", {
                    locale: cs,
                  })}
                </Typography>
              </div>
              <div
                className="col-span-1 flex items-center"
                onClick={() => handleRequestClick(request)}
              >
                <Button variant="ghost" size="icon" className="block h-8 w-8">
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t p-4">
          <Typography variant="smallText" className="text-muted-foreground">
            Zobrazeno {startIndex + 1}-
            {Math.min(endIndex, filteredRequests.length)} z{" "}
            {filteredRequests.length} žádostí
          </Typography>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Předchozí
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => handlePageChange(page)}
              >
                {page}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Další
            </Button>
          </div>
        </div>
      </div>

      <RequestDetailDialog
        request={selectedRequest}
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
      />
    </div>
  );
}
