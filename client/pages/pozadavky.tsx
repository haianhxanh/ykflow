import React, { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import { DataGrid, GridColDef, GridValueGetterParams } from "@mui/x-data-grid";
import {
  convertDateToISOString,
  get_inquiries,
  parseInquiryStatus,
} from "@/utils/helpers";
import { Button, Container } from "@mui/material";
import { INQUIRIES_TABLE, STATUS, TRANSLATIONS } from "@/utils/constants";
import StatusUpdate from "@/components/StatusUpdate";
import { useSession } from "next-auth/react";
import { Router } from "next/router";
import { Note } from "@mui/icons-material";
import RequestNote from "@/components/RequestNote";

interface Inquiry {
  id: string;
  order_name: string;
  order_id: number;
  order_contact: string;
  pause_start_date: string;
  pause_end_date: string;
  item_title: string;
  new_end_date: string;
  status: string;
  request_date: string;
  note: string;
}

export default function Inquiries() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);

  const { status, data } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      fetch_inquiries();
    }
  }, [status]);

  const handleInquiries = (data: any) => {
    setInquiries(data);
    console.log(inquiries);
  };

  const fetch_inquiries = async () => {
    const fetched_data = await get_inquiries();
    handleInquiries(fetched_data);
  };

  if (status === "authenticated")
    return (
      <>
        {inquiries.length > 0 ? (
          <Box sx={{ width: "100%" }} className="p-8">
            <DataGrid
              rows={inquiries}
              rowSelection={false}
              initialState={{
                pagination: {
                  paginationModel: {
                    pageSize: 5,
                  },
                },
              }}
              rowHeight={75}
              pageSizeOptions={[5]}
              columns={[
                {
                  field: "id",
                  headerName: INQUIRIES_TABLE.REQUEST_ID,
                  width: 50,
                },
                {
                  field: "order_name",
                  headerName: INQUIRIES_TABLE.ORDER_NAME,
                },
                {
                  field: "order_contact",
                  headerName: INQUIRIES_TABLE.ORDER_CONTACT,
                },
                {
                  field: "item_title",
                  headerName: INQUIRIES_TABLE.ITEM,
                  minWidth: 150,
                },
                {
                  field: "request_date",
                  headerName: INQUIRIES_TABLE.REQUEST_DATE,
                  minWidth: 150,
                  valueGetter: (params) => {
                    if (!params.value) {
                      return params.value;
                    }
                    return convertDateToISOString(params.value.split("T")[0]);
                  },
                },
                {
                  field: "note",
                  headerName: INQUIRIES_TABLE.NOTE,
                  renderCell: (params) => {
                    return (
                      <>
                        {params.value == "" ? (
                          TRANSLATIONS.NO_NOTE
                        ) : (
                          <RequestNote
                            value={params.value}
                            inquiryId={params.row.id}
                          />
                        )}
                      </>
                    );
                  },
                },
                {
                  field: "pause_start_date",
                  headerName: INQUIRIES_TABLE.PAUSE_START_DATE,
                  minWidth: 150,
                  valueGetter: (params) => {
                    if (!params.value) {
                      return params.value;
                    }
                    return convertDateToISOString(params.value);
                  },
                },
                {
                  field: "pause_end_date",
                  headerName: INQUIRIES_TABLE.PAUSE_END_DATE,
                  minWidth: 150,
                  valueGetter: (params) => {
                    if (!params.value) {
                      return params.value;
                    }
                    return convertDateToISOString(params.value);
                  },
                },
                {
                  field: "new_end_date",
                  headerName: INQUIRIES_TABLE.NEW_END_DATE,
                  minWidth: 150,
                  valueGetter: (params) => {
                    if (!params.value) {
                      return params.value;
                    }
                    return convertDateToISOString(params.value);
                  },
                },
                {
                  field: "status",
                  headerName: INQUIRIES_TABLE.STATUS,
                  minWidth: 150,
                  flex: 1,
                  renderCell: (params) => {
                    return (
                      <>
                        {params.value == STATUS.NEW ? (
                          <StatusUpdate
                            value={params.value}
                            inquiryId={params.row.id}
                            inquiries={inquiries}
                            setInquiries={setInquiries}
                          />
                        ) : (
                          <Button
                            variant="outlined"
                            color={
                              params.value == STATUS.APPROVED
                                ? `success`
                                : `error`
                            }
                            style={{ fontSize: "12px", padding: "2px 4px" }}
                          >
                            {parseInquiryStatus(params.value)}
                          </Button>
                        )}
                      </>
                    );
                  },
                },
              ]}
            />
          </Box>
        ) : (
          <Container className="text-center p-10">
            {TRANSLATIONS.NO_INQUIRIES}
          </Container>
        )}
      </>
    );
}
