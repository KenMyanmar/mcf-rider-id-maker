## Remove `capture="environment"` from PhotoCapturePicker

Single-file, single-attribute change in `src/components/mcf/PhotoCaptureField.tsx`.

### Change

Delete the `capture="environment"` attribute on the hidden `<input>`. Everything else (ref, `type="file"`, `accept="image/*"`, `onChange`, `className="hidden"`, the `cropTo35x45` pipeline, button, and `loadImage` helper) stays byte-for-byte identical.

Result:

```tsx
<input
  ref={inputRef}
  type="file"
  accept="image/*"
  onChange={onChange}
  className="hidden"
/>
```

### Why this is the right call (world-class check)

- `capture="environment"` is a *hint* that tells mobile browsers to open the rear camera directly and skip the OS chooser — on iOS Safari and most Android browsers it suppresses the "Photo Library / Take Photo / Choose File" sheet entirely. For a rider-card desk where staff often re-use an existing portrait or pick from a synced gallery, that's a real footgun.
- Removing it restores the native chooser on mobile (camera + library + files) and is a no-op on desktop (which ignores `capture` anyway). No regression for the laptop-at-the-desk flow.
- `accept="image/*"` is preserved, so the chooser still filters to images, and the camera remains one tap away inside the native sheet.
- The 35×45 mm crop runs on whatever file is selected, regardless of source — gallery photos go through the same `cropTo35x45` path as camera captures, so output fidelity is unchanged.

### Out of scope

No changes to crop ratio, JPEG quality, button label, upload pipeline, or any other file.

### Verification

- Typecheck passes (attribute removal only).
- Manual: on mobile, tapping "📷 Capture / Retake" opens the native picker with both Camera and Photo Library options; on desktop, the file dialog opens as before; selected image is still cropped to 350×450 and uploaded.
