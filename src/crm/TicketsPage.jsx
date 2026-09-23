import { Box, Typography } from "@mui/material";
import TicketsTab from "./tabs/TicketsTab";
import { useTranslation } from "../common/components/LocalizationProvider";

const TicketsPage = () => {
  const t = useTranslation();
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        {t("crmTickets")}
      </Typography>
      <TicketsTab />
    </Box>
  );
};

export default TicketsPage;
