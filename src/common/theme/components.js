export default {
  MuiUseMediaQuery: {
    defaultProps: {
      noSsr: true,
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: ({ theme }) => ({
        backgroundColor: theme.palette.background.default,
        "& .MuiOutlinedInput-notchedOutline": {
          borderColor: "#E0E3E8",
        },
        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
          borderColor: theme.palette.primary.main,
        },
      }),
    },
  },
  MuiInput: {
    styleOverrides: {
      root: ({ theme }) => ({
        "&::before": { borderBottomColor: "#E0E3E8" },
        "&::after": { borderBottomColor: theme.palette.primary.main },
      }),
    },
  },
  MuiTabs: {
    styleOverrides: {
      indicator: ({ theme }) => ({
        backgroundColor: theme.palette.primary.main,
      }),
    },
  },
  MuiTab: {
    styleOverrides: {
      root: ({ theme }) => ({
        backgroundColor: "transparent",
        textTransform: "none",
        "&.Mui-selected": {
          color: theme.palette.primary.main,
        },
      }),
    },
  },
  MuiButton: {
    styleOverrides: {
      sizeMedium: {
        height: "40px",
      },
      containedPrimary: ({ theme }) => ({
        backgroundColor: theme.palette.primary.main,
      }),
    },
  },
  MuiCheckbox: {
    styleOverrides: {
      root: ({ theme }) => ({
        "&.Mui-checked, &.MuiCheckbox-indeterminate": {
          color: theme.palette.primary.main,
        },
      }),
    },
  },
  MuiIconButton: {
    styleOverrides: {
      root: ({ theme }) => ({
        transition: theme.transitions.create("background-color", {
          duration: theme.transitions.duration.shortest,
        }),
        "&:hover": {
          backgroundColor: "#F5F6F8",
        },
      }),
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: ({ ownerState }) => ({
        ...(!ownerState.square && { borderRadius: 8 }),
        ...(ownerState.elevation > 0 && {
          boxShadow: "0 2px 10px rgba(15, 23, 42, 0.12)",
        }),
      }),
    },
  },
  MuiFormControl: {
    defaultProps: {
      size: "small",
    },
  },
  MuiSnackbar: {
    defaultProps: {
      anchorOrigin: {
        vertical: "bottom",
        horizontal: "center",
      },
    },
  },
  MuiTooltip: {
    defaultProps: {
      enterDelay: 500,
      enterNextDelay: 500,
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: ({ theme }) => ({
        "@media print": {
          color: theme.palette.alwaysDark.main,
        },
      }),
    },
  },
};
