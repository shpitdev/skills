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
3. For unknown tools, accessories, replacement parts, adapters, washers, mounts,
   or mating hardware, identify the exact object before generating. Ask for the
   brand, model number, part number, and the user's photo or sketch. If web
   access is available, research public product pages, manuals, parts diagrams,
   or replacement listings to confirm the name and approximate dimensions.
   Meshix itself cannot search the web, so the agent must do that research or
   ask the user. Treat candidate part names as hypotheses until the user,
   manual, or listing confirms them.
4. Confirm with the user that both sides are talking about the same part before
   generating when the object is ambiguous or must mate with real hardware.
5. Translate decorative or visual elements into CAD language: raised relief,
   engraving, inset outlines, rounded plate, boss, slot, tab, chamfer, fillet,
   shell, or through-hole.
6. Keep colors, lighting, camera angle, and photographic style out of the CAD
   brief unless they describe actual material or surface treatment.
7. Generate from the resulting text prompt with the normal Meshix workflow, then
   return the Studio run link and review the renders against the source image.

## Prompt Shape

Include:

- intended object and use
- approximate overall dimensions
- source of dimensions, or a clear note that dimensions are estimated
- key features from the image in physical terms
- orientation, print side, and text direction when relevant
- material or printer constraints if known
- what to simplify when the image contains visual detail that should not become
  geometry

For a replacement or mating part, include the measured or researched critical
dimensions: outer diameter, inner diameter, thickness, raised boss height,
hole/slot spacing, tooth or spline count, screw sizes, and clearance/tolerance.
If those values are unknown, ask for measurements before generating instead of
guessing a part that may not fit.

Example: "Create a flat keychain tag inspired by this image: rounded rectangle
body, raised simple rocket silhouette centered on the top face, one 4 mm
through-hole on the left, 3 mm thickness, chamfered edges, FDM-friendly raised
details no thinner than 0.8 mm."
