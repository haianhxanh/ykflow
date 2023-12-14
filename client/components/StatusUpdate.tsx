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

export default function StatusUpdate({
  value,
  inquiryId,
  inquiries,
  setInquiries,
}: {
  value: any;
  inquiryId: any;
  inquiries: any;
  setInquiries: any;
}) {
  const [open, setOpen] = useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleDecline = async () => {
    const res = await updateInquiryStatus(inquiryId, STATUS.DECLINED);
    setOpen(false);
    refetchInquiries();
  };

  const handleApproval = async () => {
    const res = await updateInquiryStatus(inquiryId, STATUS.APPROVED);
    setOpen(false);
    refetchInquiries();
  };

  const refetchInquiries = async () => {
    const new_inquiries = await get_inquiries();
    setInquiries(new_inquiries);
  };

  return (
    <>
      <Grid container spacing={1}>
        <Grid item xs={12}>
          <Typography
            variant="subtitle2"
            style={{
              color: "#CD5C5C",
              textTransform: "uppercase",
              fontSize: 10,
            }}
          >
            <PriorityHighIcon fontSize="medium" color="warning" />
            {parseInquiryStatus(value)}
          </Typography>
        </Grid>

        <Grid item xs={12}>
          <Button
            variant="outlined"
            onClick={handleClickOpen}
            style={{ fontSize: "12px", padding: "2px 4px" }}
          >
            {TRANSLATIONS.HANDLE_INQUIRY}
          </Button>
        </Grid>

        <Dialog
          open={open}
          onClose={handleClose}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
          style={{ padding: "20px" }}
        >
          <DialogContent>
            <Typography
              variant="h6"
              gutterBottom
              style={{ paddingBottom: "20px" }}
            >
              {TRANSLATIONS.INQUIRY} #{inquiryId}
            </Typography>
            <DialogContentText id="alert-dialog-description">
              {TRANSLATIONS.HANDLE_INQUIRY_NOTE}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Grid
              item
              xs={12}
              className="flex gap-x-2 justify-center align-center"
            >
              <Button
                onClick={handleApproval}
                color="success"
                variant="outlined"
              >
                {TRANSLATIONS.APPROVE}
                <CheckCircleIcon
                  color="success"
                  style={{ marginLeft: "4px" }}
                />
              </Button>

              <Button onClick={handleDecline} color="error" variant="outlined">
                {TRANSLATIONS.DECLINE}
                <AddCircleRoundedIcon
                  style={{ transform: "rotateZ(45deg)" }}
                  color="error"
                />
              </Button>
            </Grid>
          </DialogActions>
        </Dialog>
      </Grid>
    </>
  );
}
