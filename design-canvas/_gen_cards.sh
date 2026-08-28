#!/bin/bash
# emits one product card. args: name desc heat color price volume badge badgecolor
name="$1"; desc="$2"; heat="$3"; color="$4"; price="$5"; vol="$6"; badge="$7"; bcol="${8:-#1A1210}"
heatname=""
case "$heat" in 1) heatname="עדין";; 2) heatname="נעים";; 3) heatname="חריף";; 4) heatname="בוער";; 5) heatname="אש";; esac
flame() { echo -n "<svg width=\"15\" height=\"15\" viewBox=\"0 0 24 24\"><path d=\"M12 2.5c3.2 3.4 5.5 6 5.5 9.4A5.5 5.5 0 0 1 12 17.4a5.5 5.5 0 0 1-5.5-5.5c0-3.4 2.3-6 5.5-9.4z\" fill=\"$1\"></path></svg>"; }
echo "      <div style=\"display: flex; flex-direction: column; background: #FFFCF5; border: 1px solid rgba(26,18,16,.10); border-radius: 20px; overflow: hidden;\">"
echo -n "        <div style=\"position: relative; background: #EDE5D2; height: 240px; display: flex; align-items: center; justify-content: center;\">"
if [ -n "$badge" ]; then
  echo -n "<span style=\"position: absolute; top: 14px; right: 14px; background: ${bcol}; color: #FAF3E7; font-size: 12px; font-weight: 700; padding: 5px 11px; border-radius: 999px;\">${badge}</span>"
fi
echo -n "<span style=\"position: absolute; bottom: 14px; left: 14px; width: 40px; height: 40px; border-radius: 999px; background: #FAF3E7; display: flex; align-items: center; justify-content: center;\"><svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1A1210\" stroke-width=\"1.8\" stroke-linecap=\"round\"><path d=\"M12 5v14M5 12h14\"></path></svg></span>"
echo -n "<svg width=\"118\" height=\"160\" viewBox=\"0 0 140 190\"><rect x=\"46\" y=\"6\" width=\"48\" height=\"18\" rx=\"6\" fill=\"#2B1E19\"></rect><rect x=\"52\" y=\"23\" width=\"36\" height=\"9\" rx=\"3\" fill=\"#3B2A23\"></rect><rect x=\"28\" y=\"30\" width=\"84\" height=\"150\" rx=\"16\" fill=\"#F3E9D6\"></rect><rect x=\"34\" y=\"58\" width=\"72\" height=\"116\" rx=\"12\" fill=\"${color}\"></rect><rect x=\"34\" y=\"96\" width=\"72\" height=\"48\" rx=\"4\" fill=\"#FAF3E7\"></rect><rect x=\"44\" y=\"108\" width=\"52\" height=\"7\" rx=\"3.5\" fill=\"${color}\"></rect><rect x=\"44\" y=\"122\" width=\"32\" height=\"5\" rx=\"2.5\" fill=\"rgba(26,18,16,.40)\"></rect><rect x=\"38\" y=\"44\" width=\"7\" height=\"90\" rx=\"3.5\" fill=\"#fff\" opacity=\".38\"></rect></svg>"
echo "</div>"
echo "        <div style=\"display: flex; flex-direction: column; gap: 12px; padding: 20px;\">"
echo "          <h3 style=\"font-size: 23px;\">${name}</h3>"
echo "          <p style=\"font-size: 14.5px; line-height: 1.55; color: rgba(26,18,16,.66); flex-grow: 1;\">${desc}</p>"
echo -n "          <div style=\"display: flex; align-items: center; gap: 4px;\">"
for i in 1 2 3 4 5; do
  if [ "$i" -le "$heat" ]; then flame "#C0311B"; else flame "rgba(26,18,16,.16)"; fi
done
echo "<span style=\"font-size: 13px; color: rgba(26,18,16,.55); margin-right: 6px;\">${heatname}</span></div>"
echo "          <div style=\"display: flex; align-items: center; justify-content: space-between; padding-top: 6px;\">"
echo "            <div style=\"display: flex; align-items: baseline; gap: 6px;\"><span style=\"font-family: 'Suez One', Georgia, serif; font-size: 25px;\">₪${price}</span><span style=\"font-size: 13px; color: rgba(26,18,16,.55);\">${vol}</span></div>"
echo "            <div style=\"display: flex; align-items: center; justify-content: center; height: 44px; padding: 0 18px; background: #1A1210; color: #FAF3E7; border-radius: 999px; font-size: 15px; font-weight: 700;\">הוספה לסל</div>"
echo "          </div>"
echo "        </div>"
echo "      </div>"
