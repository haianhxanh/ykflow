import {
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

export default function CustomerInfo({
  value,
  inquiryId,
}: {
  value: any;
  inquiryId: any;
}) {
  const [open, setOpen] = useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      <Grid
        container
        spacing={1}
        style={{ maxWidth: "600px", minWidth: "100%" }}
        className="test"
      >
        <Grid item xs={12}>
          <Button
            variant="outlined"
            onClick={handleClickOpen}
            style={{ fontSize: "12px", padding: "2px 4px" }}
          >
            {TRANSLATIONS.SHOW_NOTE}
          </Button>
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
            style={{ padding: "20px 20px 0 20px" }}
          >
            {TRANSLATIONS.INQUIRY} #{inquiryId}
          </Typography>
          <DialogContent
            style={{ maxWidth: "600px", width: "100%", minWidth: "400px" }}
          >
            {value}
          </DialogContent>
        </Dialog>
      </Grid>
    </>
  );
}
