import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "../common/components/LocalizationProvider";
import { getDealsBoard, updateDeal } from "./api";

const stages = ["lead", "contactado", "cotización", "ganado", "perdido"];

const DealsBoard = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const [board, setBoard] = useState({});
  const [error, setError] = useState("");
  const [draggedId, setDraggedId] = useState(null);

  const load = useCallback(async () => {
    try {
      setBoard(await getDealsBoard());
      setError("");
    } catch (loadError) {
      setError(loadError.message || t("crmDealsLoadError"));
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const moveDeal = async (stage) => {
    const dealId = draggedId;
    setDraggedId(null);
    if (!dealId) return;
    try {
      await updateDeal(dealId, { stage });
      await load();
    } catch (moveError) {
      setError(moveError.message || t("crmDealSaveError"));
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, height: "100%", overflow: "auto" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/crm")}>
          {t("crmTitle")}
        </Button>
        <Typography variant="h5">{t("crmDealsBoard")}</Typography>
      </Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Stack
        direction="row"
        spacing={1.5}
        sx={{ alignItems: "stretch", overflowX: "auto", pb: 1 }}
      >
        {stages.map((stage) => (
          <Box
            key={stage}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              void moveDeal(stage);
            }}
            sx={{
              width: 270,
              minWidth: 270,
              minHeight: 300,
              p: 1,
              bgcolor: "action.hover",
              borderRadius: 1,
            }}
          >
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
              {t(`crmStage_${stage}`)} ({board[stage]?.length || 0})
            </Typography>
            <Stack spacing={1}>
              {(board[stage] || []).map((deal) => (
                <Card
                  key={deal.id}
                  variant="outlined"
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/plain", String(deal.id));
                    setDraggedId(deal.id);
                  }}
                  onDragEnd={() => setDraggedId(null)}
                  sx={{ cursor: "grab" }}
                >
                  <CardContent>
                    <Typography fontWeight={600}>{deal.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {deal.client_name}
                    </Typography>
                    <Typography variant="body2">
                      {deal.amount ?? "—"} {deal.currency}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Box>
        ))}
      </Stack>
    </Box>
  );
};

export default DealsBoard;
