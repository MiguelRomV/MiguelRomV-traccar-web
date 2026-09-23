import { Box, Typography } from "@mui/material";
import InvoicesTab from "./tabs/InvoicesTab";
import { useTranslation } from "../common/components/LocalizationProvider";

const InvoicesPage = () => {
  const t = useTranslation();
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        {t("crmInvoices")}
      </Typography>
      <InvoicesTab />
    </Box>
  );
};

export default InvoicesPage;
