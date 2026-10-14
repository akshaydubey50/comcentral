'use client';

import { useState } from 'react';
import { IconButton, InputAdornment, TextField, type TextFieldProps } from '@mui/material';
import { Eye, EyeOff } from 'lucide-react';

type PasswordFieldProps = Omit<TextFieldProps, 'type' | 'slotProps'> & { label: string };

/** Keep passwords hidden until the user explicitly reveals this field. */
export function PasswordField({ label, disabled, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      {...props}
      label={label}
      disabled={disabled}
      type={visible ? 'text' : 'password'}
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                type="button"
                aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
                disabled={disabled}
                onClick={() => setVisible((current) => !current)}
                onMouseDown={(event) => event.preventDefault()}
                edge="end"
                sx={{ minWidth: 44, minHeight: 44 }}
              >
                {visible ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
