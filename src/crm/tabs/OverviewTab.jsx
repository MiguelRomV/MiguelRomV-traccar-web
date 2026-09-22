import { Box, Paper, Stack, Typography } from "@mui/material";
import { useTranslation } from "../../common/components/LocalizationProvider";

const OverviewTab = ({ client }) => {
  const t = useTranslation();
  const fields = [
    ["sharedPhone", client.phone],
    ["userEmail", client.email],
    ["crmNotes", client.notes],
  ];

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        {fields.map(([label, value]) => (
          <Box key={label}>
            <Typography variant="subtitle2" color="text.secondary">
              {t(label)}
            </Typography>
            <Typography
              sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
            >
              {value || "—"}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Paper>
  );
};

export default OverviewTab;
