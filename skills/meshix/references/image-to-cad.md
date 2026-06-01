# Meshix Image-To-CAD Path

Use this when the user provides an image, sketch, screenshot, logo, or reference
object and wants Meshix to make a related 3D CAD model.

Meshix MCP currently works from text CAD briefs, not direct image upload. Treat
the image as visual context that the agent translates into a precise generation
prompt.

## Workflow

1. Inspect the image and describe the visible physical geometry: silhouette,
   major primitives, cutouts, holes, text, relief, symmetry, and orientation.
2. Separate what is visible from what must be inferred. Ask for scale or one
   critical dimension when physical fit matters.
3. Translate decorative or visual elements into CAD language: raised relief,
   engraving, inset outlines, rounded plate, boss, slot, tab, chamfer, fillet,
   shell, or through-hole.
4. Keep colors, lighting, camera angle, and photographic style out of the CAD
   brief unless they describe actual material or surface treatment.
5. Generate from the resulting text prompt with the normal Meshix workflow, then
   return the Studio run link and review the renders against the source image.

## Prompt Shape

Include:

- intended object and use
- approximate overall dimensions
- key features from the image in physical terms
- orientation, print side, and text direction when relevant
- material or printer constraints if known
- what to simplify when the image contains visual detail that should not become
  geometry

Example: "Create a flat keychain tag inspired by this image: rounded rectangle
body, raised simple rocket silhouette centered on the top face, one 4 mm
through-hole on the left, 3 mm thickness, chamfered edges, FDM-friendly raised
details no thinner than 0.8 mm."
