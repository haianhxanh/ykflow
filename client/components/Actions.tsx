import {
  deleteInquiry,
  get_inquiries,
  parseInquiryStatus,
  updateInquiryStatus,
} from "@/utils/helpers";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PriorityHighIcon from "@mui/icons-material/PriorityHigh";
import AddCircleRoundedIcon from "@mui/icons-material/AddCircleRounded";
import { useState } from "react";
import { STATUS, TRANSLATIONS } from "@/utils/constants";
import { DeleteOutline } from "@mui/icons-material";

export default function Actions({
  value,
  inquiryId,
  setInquiries,
}: {
  value: any;
  inquiryId: any;
  setInquiries: any;
}) {
  const [open, setOpen] = useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleDelete = async () => {
    const res = await deleteInquiry(inquiryId);
    setOpen(false);
    refetchInquiries();
  };

  const refetchInquiries = async () => {
    const new_inquiries = await get_inquiries();
    setInquiries(new_inquiries);
  };

  return (
    <>
      <Grid
        container
        spacing={1}
        style={{ maxWidth: "600px", minWidth: "100%" }}
        className="test"
      >
        <Grid
          item
          xs={12}
          style={{
            display: "flex",
            justifyContent: "center",
          }}
        >
          <DeleteOutline
            onClick={handleClickOpen}
            color="error"
          ></DeleteOutline>
        </Grid>

        <Dialog
          open={open}
          onClose={handleClose}
          aria-labelledby="dialog-title"
          aria-describedby="dialog-description"
          style={{ maxWidth: "600px", width: "100%", minWidth: "100%" }}
        >
          <Typography
            variant="h6"
            gutterBottom
            style={{ padding: "20px 20px 0 20px", textAlign: "center" }}
          >
            {TRANSLATIONS.DELETE_VERIFY
              ? TRANSLATIONS.DELETE_VERIFY
              : "Opravdu chcete smazat?"}
          </Typography>
          <DialogContent
            style={{
              maxWidth: "600px",
              width: "100%",
              minWidth: "400px",
              textAlign: "center",
              display: "flex",
              gap: "10px",
              justifyContent: "center",
            }}
          >
            <Button
              variant="outlined"
              onClick={handleDelete}
              color="error"
              style={{
                fontSize: "16px",
                padding: "2px 4px",
              }}
            >
              {TRANSLATIONS.DELETE ? TRANSLATIONS.DELETE : "Smazat"}
            </Button>
            <Button
              variant="outlined"
              onClick={handleClose}
              style={{
                fontSize: "16px",
                padding: "2px 4px",
              }}
            >
              {TRANSLATIONS.RETURN ? TRANSLATIONS.RETURN : "Zpět"}
            </Button>
          </DialogContent>
        </Dialog>
      </Grid>
    </>
  );
}
