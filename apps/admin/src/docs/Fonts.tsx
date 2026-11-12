import { useState } from "react";
import { Callout, PageHeader, Section } from "@belikh/jupiter-ui/kit.tsx";
import { useDs } from "./store.tsx";
import { TYPE_NAMES } from "@belikh/jupiter-tokens";

const FACES: { family: string; weight: number; style: "normal" | "italic"; name: string }[] = [
  ...["SGI Text", "SGI Alt"].flatMap((family) =>
    [400, 700, 800].flatMap((weight) =>
      (["normal", "italic"] as const).map((style) => ({
        family,
        weight,
        style,
        name: `${{ 400: "Regular", 700: "Bold", 800: "ExtraBold" }[weight]}${style === "italic" ? " Italic" : ""}`,
      })),
    ),
  ),
  { family: "JetBrains Mono", weight: 400, style: "normal", name: "Regular" },
  { family: "JetBrains Mono", weight: 700, style: "normal", name: "Bold" },
];

const SAMPLES = {
  pangram: "Sphinx of black quartz, judge my vow — 0123456789",
  ops: "Uptime 99.98% · p95 182ms · 1,284,031 req",
  charset: "ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789 &@#%*()[]{}<>?!.,;:–—“”‘’ ÀÉÎÕÜßæøñ",
};

export function DsFonts() {
  const { tokens: t } = useDs();
  const [sample, setSample] = useState<keyof typeof SAMPLES>("pangram");
  const [custom, setCustom] = useState("");
  const text = custom || SAMPLES[sample];
  const families = ["SGI Text", "SGI Alt", "JetBrains Mono"];

  return (
    <>
      <PageHeader eyebrow="foundations" title="Type specimen">
        <p>
          Body text is set in the SGI faces (Bitstream, 1987 to 1999). We converted them from PostScript Type 1 to WOFF2 and kept the kerning. Labels, data,
          code and numbers use JetBrains Mono, since the SGI set doesn't include a monospace.
        </p>
      </PageHeader>

      <Callout variant="warn" title="Licensing" testId="fonts-license-callout">
        The SGI faces are Bitstream fonts and the files are marked "confidential and proprietary". We only serve them on this site; they are not part of the @belikh/jupiter-tokens package.
        Check you're allowed to redistribute them before putting them on a public site. If the fonts folder isn't there, jupiter.css uses the system UI fonts.
      </Callout>

      <div className="adm-toolbar">
        <label className="jp-field adm-toolbar__fixed">
          <span className="jp-label">Sample</span>
          <select className="jp-select" value={sample} onChange={(e) => setSample(e.target.value as keyof typeof SAMPLES)} data-testid="specimen-sample-select">
            <option value="pangram">Pangram</option>
            <option value="ops">Operations</option>
            <option value="charset">Character set</option>
          </select>
        </label>
        <label className="jp-field adm-toolbar__grow">
          <span className="jp-label">Custom text</span>
          <input className="jp-input" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Type something…" data-testid="specimen-custom-input" />
        </label>
      </div>

      {families.map((fam) => (
        <Section key={fam} title={fam} kicker={fam === "JetBrains Mono" ? "mono · OFL" : "prose · WOFF2"}>
          <div className="adm-stack adm-stack--lg" data-testid={`specimen-${fam.toLowerCase().replace(/ /g, "-")}`}>
            {FACES.filter((f) => f.family === fam).map((f) => (
              <div key={`${f.weight}-${f.style}`} className="adm-face">
                <p className="jp-label adm-gap-bottom">
                  {f.name} · {f.weight}
                  {f.style === "italic" ? " italic" : ""}
                </p>
                <div className="adm-stack adm-stack--xs">
                  {t.type.scale.map((s, i) => (
                    <div key={s} className="adm-specrow">
                      <span className="jp-mono jp-muted adm-note">
                        {s}
                        <span className="adm-sr"> {TYPE_NAMES[i]}</span>
                      </span>
                      <span
                        className="adm-specrow__text"
                        style={{
                          fontFamily: `"${f.family}", var(--jp-font-sans)`,
                          fontWeight: f.weight,
                          fontStyle: f.style,
                          fontSize: s,
                          lineHeight: s >= 20 ? t.type.lineHeightHeading : t.type.lineHeightBody,
                        }}
                      >
                        {text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      ))}
    </>
  );
}
