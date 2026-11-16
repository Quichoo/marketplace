"use client";

import { useActionState, useRef, useState } from "react";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import FormHelperText from "@mui/material/FormHelperText";
import InputAdornment from "@mui/material/InputAdornment";
import { CATEGORIES, IMAGE_TYPES, MAX_IMAGE_MB } from "@/lib/constants";
import { createListing, type CreateListingState } from "./actions";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FormValues {
  title: string;
  description: string;
  price: string;
  category: string;
  sellerEmail: string;
}

const emptyForm: FormValues = {
  title: "",
  description: "",
  price: "",
  category: "",
  sellerEmail: "",
};

export function CreateListingForm() {
  const [state, formAction, pending] = useActionState(createListing, {} as CreateListingState);
  const [form, setForm] = useState<FormValues>(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Partial<FormValues> & { image?: string }>({});
  const [preview, setPreview] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function setField<K extends keyof FormValues>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validateClient(): boolean {
    const next: Partial<FormValues> & { image?: string } = {};
    if (!form.title.trim()) next.title = "Title is required.";
    if (!form.description.trim()) next.description = "Description is required.";
    if (!form.price.trim()) next.price = "Price is required.";
    else {
      const price = Number(form.price);
      if (!Number.isFinite(price) || price <= 0) next.price = "Price must be a positive number.";
    }
    if (!form.category) next.category = "Category is required.";
    if (!form.sellerEmail.trim()) next.sellerEmail = "Your email is required.";
    else if (!EMAIL_RE.test(form.sellerEmail.trim())) {
      next.sellerEmail = "Please enter a valid email address.";
    }
    if (!file) next.image = "A photo is required.";
    else {
      if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) {
        next.image = "Image must be a JPEG, PNG, WebP, or GIF.";
      } else if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
        next.image = `Image must be ${MAX_IMAGE_MB} MB or smaller.`;
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function onFileChange(file: File | null) {
    setFile(file);
    if (preview) {
      URL.revokeObjectURL(preview);
      setPreview(null);
    }
    if (file) {
      setPreview(URL.createObjectURL(file));
    }
  }

  function onSubmit() {
    if (!validateClient()) return;
  }

  return (
    <Box
      component="form"
      ref={formRef}
      action={formAction}
      onSubmit={onSubmit}
      noValidate
      sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 600 }}
    >
      {state.error && <Alert severity="error">{state.error}</Alert>}

      <Box>
        <Button variant="outlined" component="label" fullWidth>
          {file ? `Photo: ${file.name}` : "Choose photo"}
          <input
            type="file"
            name="image"
            accept="image/jpeg,image/png,image/webp,image/gif"
            hidden
            onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
          />
        </Button>
        {errors.image && <FormHelperText error>{errors.image}</FormHelperText>}
        {preview && (
          <Box
            component="img"
            src={preview}
            alt="Selected photo preview"
            sx={{ mt: 1, maxHeight: 200, borderRadius: 1 }}
          />
        )}
      </Box>

      <TextField
        label="Title"
        name="title"
        value={form.title}
        onChange={(e) => setField("title", e.target.value)}
        error={Boolean(errors.title)}
        helperText={errors.title}
        required
        fullWidth
      />
      <TextField
        label="Description"
        name="description"
        value={form.description}
        onChange={(e) => setField("description", e.target.value)}
        error={Boolean(errors.description)}
        helperText={errors.description}
        multiline
        rows={4}
        required
        fullWidth
      />
      <TextField
        label="Price"
        name="price"
        value={form.price}
        onChange={(e) => setField("price", e.target.value)}
        error={Boolean(errors.price)}
        helperText={errors.price}
        type="number"
        slotProps={{
          input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
          htmlInput: { step: "0.01", min: "0" },
        }}
        required
        fullWidth
      />
      <TextField
        label="Category"
        name="category"
        value={form.category}
        onChange={(e) => setField("category", e.target.value)}
        error={Boolean(errors.category)}
        helperText={errors.category}
        select
        required
        fullWidth
      >
        {CATEGORIES.map((category) => (
          <MenuItem key={category} value={category}>
            {category}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        label="Your email"
        name="sellerEmail"
        value={form.sellerEmail}
        onChange={(e) => setField("sellerEmail", e.target.value)}
        error={Boolean(errors.sellerEmail)}
        helperText={errors.sellerEmail}
        type="email"
        required
        fullWidth
      />

      <Button type="submit" variant="contained" size="large" disabled={pending}>
        {pending ? "Publishing…" : "Publish listing"}
      </Button>
    </Box>
  );
}
