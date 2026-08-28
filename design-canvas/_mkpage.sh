#!/bin/bash
# usage: _mkpage.sh <out.dc.html> <active-nav-label> <body-file> <page-width>
out="$1"; active="$2"; body="$3"; width="${4:-1440}"
hdr=$(mktemp)
cp _header.html "$hdr"
# demote current active item, promote the requested one
sed -i 's|<span style="color: #1A1210; border-bottom: 2px solid #C0311B; padding-bottom: 3px;">בית</span>|<span style="color: #1A1210; opacity: .72;">בית</span>|' "$hdr"
if [ "$active" != "בית" ]; then
  sed -i "s|<span style=\"color: #1A1210; opacity: .72;\">${active}</span>|<span style=\"color: #1A1210; border-bottom: 2px solid #C0311B; padding-bottom: 3px;\">${active}</span>|" "$hdr"
else
  sed -i 's|<span style="color: #1A1210; opacity: .72;">בית</span>|<span style="color: #1A1210; border-bottom: 2px solid #C0311B; padding-bottom: 3px;">בית</span>|' "$hdr"
fi
{
  echo '<!doctype html>'
  echo '<html>'
  echo '<head>'
  echo '  <meta charset="utf-8">'
  echo '  <script src="./support.js"></script>'
  echo '</head>'
  echo '<body>'
  echo '<x-dc>'
  cat _helmet.html
  echo ''
  echo "<div dir=\"rtl\" lang=\"he\" style=\"width: ${width}px; background: #FAF3E7;\">"
  echo ''
  cat "$hdr"
  cat "$body"
  echo ''
  cat _footer.html
  echo ''
  echo '</div>'
  echo '</x-dc>'
  echo '</body>'
  echo '</html>'
} > "$out"
rm -f "$hdr"
echo "built $out ($(wc -c < "$out") bytes)"
