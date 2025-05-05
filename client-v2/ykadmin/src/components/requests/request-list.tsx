"use client";
import { Typography } from "@/components/ui/typography";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { useState } from "react";
import type { Request } from "@/app/types";
import { REQUEST_STATUS, REQUEST_STATUS_LABELS } from "@/app/constants";

interface RequestListProps {
  requests: Request[];
}

const ITEMS_PER_PAGE = 10;

export function RequestList({ requests }: RequestListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

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

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <Typography variant="h2">Seznam žádostí</Typography>
        <Input
          type="search"
          placeholder="Hledat podle objednávky, emailu, produktu nebo statusu..."
          className="max-w-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="rounded-md border">
        <div className="bg-muted/50 grid grid-cols-12 gap-4 border-b p-4">
          <div className="col-span-3">
            <Typography variant="smallText" className="font-medium">
              Objednávka
            </Typography>
          </div>
          <div className="col-span-3">
            <Typography variant="smallText" className="font-medium">
              Email
            </Typography>
          </div>
          <div className="col-span-2">
            <Typography variant="smallText" className="font-medium">
              Program
            </Typography>
          </div>
          <div className="col-span-2">
            <Typography variant="smallText" className="font-medium">
              Status
            </Typography>
          </div>
          <div className="col-span-2">
            <Typography variant="smallText" className="font-medium">
              Datum
            </Typography>
          </div>
        </div>

        <div className="divide-y">
          {currentRequests.map((request) => (
            <div
              key={request.id}
              className="hover:bg-muted/50 grid grid-cols-12 gap-4 p-4"
            >
              <div className="col-span-3">
                <Typography>{request.order_name}</Typography>
                <Typography
                  variant="smallText"
                  className="text-muted-foreground"
                >
                  {request.order_id}
                </Typography>
              </div>
              <div className="col-span-3">
                <Typography>{request.order_email}</Typography>
              </div>
              <div className="col-span-2">
                <Typography>{request.item_title}</Typography>
              </div>
              <div className="col-span-2">
                <Typography
                  className={
                    request.status === REQUEST_STATUS.APPROVED
                      ? "text-green-600"
                      : request.status === REQUEST_STATUS.REJECTED
                        ? "text-red-600"
                        : ""
                  }
                >
                  {REQUEST_STATUS_LABELS[request.status]}
                </Typography>
              </div>
              <div className="col-span-2">
                <Typography>
                  {format(new Date(request.request_date), "d.M.yyyy", {
                    locale: cs,
                  })}
                </Typography>
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
    </div>
  );
}
