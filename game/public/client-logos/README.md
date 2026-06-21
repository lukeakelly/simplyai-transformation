# Client Logos — Optional Configuration

This directory is for **approved client logo files only**.

The default game works without any files in this directory. Fictional sector badges are used by default.

## Adding Approved Logos

1. Place approved PNG or SVG logo files here, e.g.:
   - `government-client.png`
   - `banking-client.svg`

2. Open `src/content/clientBadges.ts`

3. Set the `logoFile` property on the relevant badge entry:

```ts
{
  id: 'government',
  sector: 'Government',
  label: 'Government Client',
  colour: 0x1144aa,
  accentColour: 0x3366cc,
  symbol: 'square',
  logoFile: 'client-logos/government-client.png',  // ← add this
}
```

4. Update the `GameScene.ts` entity drawing code to load and display the texture.

## Content Rules

- Only use logos for which written approval has been granted.
- Do not include logos that imply a specific client uses a specific Simplyai service without consent.
- Do not include personal data or confidential relationship information.
- See the project README for full content rules.
