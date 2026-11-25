# Fonts

Noto Serif, Noto Serif Tamil and Noto Serif Devanagari (Regular and Bold), © Google, under the SIL Open Font
License 1.1 (`OFL.txt`). They are served from here, so the page needs no third-party font service.

Source: Debian/Ubuntu package `fonts-noto-core` 20201225-2build1, converted to WOFF2 with fontTools 4.62.1:

```sh
LATIN="U+0000-024F,U+0259,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0300-036F,U+1E00-1EFF,U+2000-206F,U+20AC,U+2122,U+2190-2199,U+2212,U+2215,U+25CC,U+FEFF,U+FFFD"
pyftsubset NotoSerif-Regular.ttf --unicodes="$LATIN" --layout-features='*' --flavor=woff2 --output-file=NotoSerif-Regular.woff2
pyftsubset NotoSerifTamil-Regular.ttf --unicodes='*' --glyphs='*' --layout-features='*' --flavor=woff2 --output-file=NotoSerifTamil-Regular.woff2
# and the same for the Bold weights and Noto Serif Devanagari
```

Noto Serif is subset to Latin, Latin extended (for names with accents), combining marks and general punctuation (which
includes ′ and ″). The Tamil and Devanagari fonts are complete. SHA-256 of the source TTF files:

| File | SHA-256 |
|---|---|
| NotoSerif-Regular.ttf | 9d7583b7dc9e812afd32a14280c5cac3160012efe50c8d08938f4fea266ff67f |
| NotoSerif-Bold.ttf | 0af0ff2be8f84910fb21ec5fe1b6b7395e3073250502a334baf6ca2f860c88fe |
| NotoSerifTamil-Regular.ttf | f9c887e6c0b61f474b1916fdadd64d495321208efc0ecd1335e6526ca3d05488 |
| NotoSerifTamil-Bold.ttf | 1cb01b8096603e16917c67769f0f6b3faad390cab02b35fa81662dd5611dcc22 |
| NotoSerifDevanagari-Regular.ttf | 662c3cd6e17dd0561f53fe28ce6c32d7d64e650119f4bb0428fc50206bbc46fe |
| NotoSerifDevanagari-Bold.ttf | 42a0d0664b51212894c8bb226ad8947c194f1ab1903555a41979877d3b9267be |
