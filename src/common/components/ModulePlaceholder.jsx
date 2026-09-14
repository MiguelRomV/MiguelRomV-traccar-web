import { Card, CardContent, Typography } from "@mui/material";
import { useTranslation } from "./LocalizationProvider";

const ModulePlaceholder = ({ title, Icon }) => {
  const t = useTranslation();
  return (
    <Card sx={{ maxWidth: 520, mx: "auto", mt: 6, textAlign: "center" }}>
      <CardContent sx={{ py: 7 }}>
        <Icon sx={{ fontSize: 72, color: "primary.main", mb: 2 }} />
        <Typography variant="h4">{t(title)}</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          {t("sharedComingSoon")}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default ModulePlaceholder;
