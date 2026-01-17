// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<SPDX-License-Identifier: MPL-2.0>
// Aetherion AI Logo Text Component

import { Typography, TypographyProps } from "@mui/material";

export default function AetherionLogoText(props: TypographyProps): React.JSX.Element {
  return (
    <Typography
      variant="h4"
      component="span"
      sx={{
        fontWeight: 700,
        letterSpacing: "-0.02em",
        background: "linear-gradient(135deg, #f5a623 0%, #f7931e 50%, #e8820c 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
      }}
      {...props}
    >
      Aetherion AI
    </Typography>
  );
}
